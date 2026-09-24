import { z } from "zod";

/**
 * Content model shared by the app, the content validator and the AI
 * generation layer. Lessons and revision sheets are plain JSON files in
 * `content/` so they can be written by hand, by Claude in a chat, or by any
 * LLM provider plugged into `src/ai/`.
 */

/** A phrase that can be played aloud. `fr` is what gets spoken. */
export const Phrase = z.object({
  fr: z.string().min(1).describe("French text to speak aloud"),
  label: z.string().optional().describe("Display text if different from `fr`, e.g. '70 — soixante-dix'"),
  en: z.string().optional().describe("Optional English gloss"),
});

export const TableBlock = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  note: z.string().optional(),
});

export const PhrasesBlock = z.object({
  type: z.literal("phrases"),
  title: z.string().optional(),
  note: z.string().optional(),
  items: z.array(Phrase).min(1),
});

/**
 * Fill-in exercise. Each `prompt` marks blanks with `___`; `answers` has one
 * entry per blank. An answer may list alternatives separated by " | ".
 * Prompts without blanks show a single answer field.
 */
export const ExerciseItem = z.object({
  prompt: z.string().min(1),
  answers: z.array(z.string().min(1)).min(1),
  choices: z.array(z.string()).optional().describe("If set, each blank is answered by tapping one of these"),
  hint: z.string().optional(),
});

export const ExerciseBlock = z.object({
  type: z.literal("exercise"),
  title: z.string(),
  instructions: z.string().optional(),
  items: z.array(ExerciseItem).min(1),
});

/** Open-ended speaking or writing task with no automatic check. */
export const TaskBlock = z.object({
  type: z.literal("task"),
  title: z.string(),
  prompt: z.string(),
  mode: z.enum(["oral", "written"]).default("oral"),
  model: z.string().optional().describe("Optional model answer"),
});

export const NoteBlock = z.object({
  type: z.literal("note"),
  title: z.string().optional(),
  text: z.string(),
  tone: z.enum(["info", "tip", "warning"]).default("info"),
});

export const Block = z.discriminatedUnion("type", [
  TableBlock,
  PhrasesBlock,
  ExerciseBlock,
  TaskBlock,
  NoteBlock,
]);

export const Section = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  minutes: z.number().int().positive().optional(),
  lede: z.string().optional(),
  blocks: z.array(Block).min(1),
});

export const Lesson = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().describe("Sort order in the library"),
  kicker: z.string().describe("Short source label, e.g. 'Unité 2, Leçon 1'"),
  title: z.string(),
  summary: z.string().describe("One line listing the topics"),
  level: z.string().default("A1"),
  date: z.string().optional().describe("ISO date the class took place"),
  sections: z.array(Section).min(1),
});

/** A targeted revision sheet built from sections the learner is weak on. */
export const Revision = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  created: z.string().describe("ISO date"),
  covers: z.array(z.string()).describe("Section refs, as 'lessonId/sectionId'"),
  intro: z.string().optional(),
  sections: z.array(Section).min(1),
});

export type Phrase = z.infer<typeof Phrase>;
export type Block = z.infer<typeof Block>;
export type ExerciseItem = z.infer<typeof ExerciseItem>;
export type Section = z.infer<typeof Section>;
export type Lesson = z.infer<typeof Lesson>;
export type Revision = z.infer<typeof Revision>;

/** Every phrase in a lesson or revision, used to pre-generate audio. */
export function collectPhrases(doc: { sections: Section[] }): string[] {
  const out: string[] = [];
  for (const s of doc.sections)
    for (const b of s.blocks) if (b.type === "phrases") for (const p of b.items) out.push(p.fr);
  return out;
}

/** Number of blanks a prompt expects (at least one). */
export function blankCount(prompt: string): number {
  return Math.max(1, prompt.split("___").length - 1);
}

// Phone numbers in content must be fictional. These French ranges are reserved
// by ARCEP for fiction: 01 99 00 xx xx and 06 39 98 xx xx.
const FICTIONAL_PREFIXES = ["019900", "063998"];

/** Digit runs that look like phone numbers outside the fictional ranges. */
export function realLookingPhoneNumbers(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(/\+?\d[\d .\-()]{6,}\d/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 8) continue;
    const national = m[0].trim().startsWith("+33") ? `0${digits.slice(2)}` : digits;
    if (!FICTIONAL_PREFIXES.some((p) => national.startsWith(p))) found.push(m[0].trim());
  }
  return found;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** Cross-field checks zod can't express: unique ids, blanks match answers, no real phone numbers. */
export function lintDoc(doc: { id: string; sections: Section[] }): string[] {
  const errors: string[] = [];
  for (const n of strings(doc.sections).flatMap(realLookingPhoneNumbers))
    errors.push(`${doc.id}: "${n}" looks like a real phone number — use a fictional one (01 99 00 xx xx or 06 39 98 xx xx)`);
  const seen = new Set<string>();
  for (const s of doc.sections) {
    if (seen.has(s.id)) errors.push(`${doc.id}: duplicate section id "${s.id}"`);
    seen.add(s.id);
    for (const b of s.blocks) {
      if (b.type === "exercise")
        b.items.forEach((it, i) => {
          const n = blankCount(it.prompt);
          if (n !== it.answers.length)
            errors.push(`${doc.id}/${s.id} "${b.title}" item ${i + 1}: ${n} blank(s) but ${it.answers.length} answer(s)`);
        });
      if (b.type === "table")
        b.rows.forEach((r, i) => {
          if (r.length !== b.headers.length)
            errors.push(`${doc.id}/${s.id} table row ${i + 1}: ${r.length} cells, ${b.headers.length} headers`);
        });
    }
  }
  return errors;
}
