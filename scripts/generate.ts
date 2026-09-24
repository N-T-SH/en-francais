// Generates content with any configured LLM provider.
//
//   npm run generate -- lesson notes.pdf page1.jpg page2.jpg [--date 2026-09-24] [--notes "…"]
//   npm run generate -- revision introduction/nombres infos-personnelles/questions-quel
//
// Provider (environment):
//   LLM_PROVIDER   anthropic | openai-compatible
//   LLM_API_KEY    the provider's API key
//   LLM_MODEL      model id (optional for anthropic)
//   LLM_BASE_URL   for openai-compatible, e.g. https://api.deepseek.com/v1
//   LLM_JSON_MODE  schema (default) | object — use "object" if the API rejects json_schema
//
// The result is written into content/ and validated; review it, then commit.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, basename, join } from "node:path";
import { createProvider, generateLesson, generateRevision, type Attachment, type ProviderConfig } from "../src/ai";
import { Lesson, lintDoc } from "../src/content/schema";

const root = new URL("../content/", import.meta.url).pathname;

const MEDIA: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
};

function providerConfig(): ProviderConfig {
  const kind = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY ?? "";
  if (!apiKey) throw new Error("Set LLM_API_KEY (and LLM_PROVIDER). See docs/ai.md.");
  if (kind === "anthropic") return { kind, apiKey, model: process.env.LLM_MODEL || undefined };
  if (kind === "openai-compatible") {
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL;
    if (!baseUrl || !model) throw new Error("openai-compatible needs LLM_BASE_URL and LLM_MODEL.");
    return { kind, apiKey, baseUrl, model, jsonMode: process.env.LLM_JSON_MODE === "object" ? "object" : "schema" };
  }
  throw new Error('LLM_PROVIDER must be "anthropic" or "openai-compatible".');
}

function readAttachment(path: string): Attachment {
  const mediaType = MEDIA[extname(path).toLowerCase()];
  if (!mediaType) throw new Error(`Unsupported file type: ${path}`);
  const buf = readFileSync(path);
  const text = mediaType.startsWith("text/");
  return { mediaType, name: basename(path), data: text ? buf.toString("utf8") : buf.toString("base64") };
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const [, value] = args.splice(i, 2);
  return value;
}

function loadLessons(): Lesson[] {
  return readdirSync(join(root, "lessons"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => Lesson.parse(JSON.parse(readFileSync(join(root, "lessons", f), "utf8"))));
}

function write(path: string, doc: { id: string; sections: Lesson["sections"] }) {
  const problems = lintDoc(doc);
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Wrote ${path}`);
  if (problems.length) console.warn(`⚠ Review before committing:\n  ${problems.join("\n  ")}`);
}

const [command, ...args] = process.argv.slice(2);
const provider = createProvider(providerConfig());
console.log(`Using ${provider.id} / ${provider.model}…`);

if (command === "lesson") {
  const date = flag(args, "date");
  const notes = flag(args, "notes");
  if (!args.length) throw new Error("Pass at least one file with the class material.");
  const lessons = loadLessons();
  const order = Math.max(0, ...lessons.map((l) => l.order)) + 1;
  const lesson = await generateLesson(provider, { attachments: args.map(readAttachment), notes, date, order });
  if (lessons.some((l) => l.id === lesson.id)) lesson.id = `${lesson.id}-${order}`;
  write(join(root, "lessons", `${String(order).padStart(2, "0")}-${lesson.id}.json`), lesson);
} else if (command === "revision") {
  const lessons = loadLessons();
  const weak = args.map((key) => {
    const [lessonId, sectionId] = key.split("/");
    const lesson = lessons.find((l) => l.id === lessonId);
    const section = lesson?.sections.find((s) => s.id === sectionId);
    if (!lesson || !section) throw new Error(`Unknown section "${key}" (expected lessonId/sectionId).`);
    return { key, lessonTitle: lesson.title, section };
  });
  if (!weak.length) throw new Error("Pass the weak sections as lessonId/sectionId.");
  const sheet = await generateRevision(provider, weak);
  write(join(root, "revisions", `${sheet.created}-${sheet.id}.json`), sheet);
} else {
  console.error("Usage: npm run generate -- lesson <files…> | revision <lessonId/sectionId…>");
  process.exit(1);
}
