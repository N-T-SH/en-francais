import { Lesson, Revision, type Section } from "../content/schema";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openaiCompatible";
import type { Attachment, LlmProvider, ProviderConfig } from "./types";

export * from "./types";

export function createProvider(config: ProviderConfig): LlmProvider {
  switch (config.kind) {
    case "anthropic":
      return new AnthropicProvider(config.apiKey, config.model);
    case "openai-compatible":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model, config.jsonMode);
  }
}

// ---------------------------------------------------------------------------
// Prompts. The content schema itself (with its field descriptions) is sent as
// the structured-output format, so the prompts focus on teaching choices.

const SYSTEM = `You write revision material for an adult learner preparing for the TEF (Test d'évaluation de français), currently at level A1.
All learner-facing text is in French. English appears only as short glosses in phrase "en" fields.
Principles:
- Stay faithful to the class material: same vocabulary, examples and names. Fix obvious typos and gender/agreement errors.
- Organise the lesson into 2–6 short sections (3–10 minutes each), in the order of the class.
- Each section should mix: a reference "table" or "note", a "phrases" block for listening practice, and an "exercise" with checkable answers. Add a "task" for open speaking/writing practice where it fits.
- phrases.fr is read aloud by a speech engine: write numbers, years and phone numbers out in words; use "label" for the short display form.
- Exercises: mark each blank with ___ and give exactly one answer per blank. Use "choices" for closed choices (un/une, quel/quelle…). List accepted variants as "a | b".
- ids are lowercase kebab-case without accents.
- Privacy: the lessons are published. Never reproduce real phone numbers from the material (in digits or in words); replace them with fictional French numbers from the ranges 06 39 98 xx xx or 01 99 00 xx xx.`;

const GeneratedLesson = Lesson.omit({ order: true });

export async function generateLesson(
  provider: LlmProvider,
  input: { attachments: Attachment[]; notes?: string; order: number; date?: string },
): Promise<Lesson> {
  const lesson = await provider.generateJson({
    system: SYSTEM,
    schemaName: "lesson",
    schema: GeneratedLesson,
    attachments: input.attachments,
    prompt: [
      "Turn the attached class material into one lesson for the revision app.",
      input.notes ? `Learner's notes: ${input.notes}` : "",
      input.date ? `The class took place on ${input.date}.` : "",
    ].filter(Boolean).join("\n"),
  });
  return Lesson.parse({ ...lesson, order: input.order, date: input.date ?? lesson.date });
}

export interface WeakSection {
  key: string;
  lessonTitle: string;
  section: Section;
  /** Latest exercise score for the section, 0–1, if any. */
  score?: number;
}

const GeneratedRevision = Revision.omit({ created: true, covers: true });

export async function generateRevision(provider: LlmProvider, weak: WeakSection[]): Promise<Revision> {
  const sheet = await provider.generateJson({
    system: SYSTEM,
    schemaName: "revision",
    schema: GeneratedRevision,
    prompt: `The learner flagged these sections as weak. Write one compact revision sheet covering them:
- start each topic with a short "note" summarising the rule and the classic mistakes;
- include new example phrases (not copied from the lesson) and new exercises with different items;
- group related topics, and keep the whole sheet under 20 minutes.

${JSON.stringify(weak.map((w) => ({ key: w.key, lesson: w.lessonTitle, score: w.score, section: w.section })), null, 1)}`,
  });
  return Revision.parse({
    ...sheet,
    created: new Date().toISOString().slice(0, 10),
    covers: weak.map((w) => w.key),
  });
}

