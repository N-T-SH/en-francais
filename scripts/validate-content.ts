// Validates every JSON file in content/ against the schema before a build.
// Usage: npm run validate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Lesson, Revision, lintDoc } from "../src/content/schema";

const root = new URL("../content/", import.meta.url).pathname;
let failed = false;
const ids = new Set<string>();

for (const [dir, schema] of [["lessons", Lesson], ["revisions", Revision]] as const) {
  let files: string[] = [];
  try {
    files = readdirSync(join(root, dir)).filter((f) => f.endsWith(".json"));
  } catch {
    continue;
  }
  for (const f of files) {
    const path = join(dir, f);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(root, path), "utf8"));
    } catch (e) {
      console.error(`✕ ${path}: invalid JSON — ${(e as Error).message}`);
      failed = true;
      continue;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      console.error(`✕ ${path}:`);
      for (const issue of parsed.error.issues) console.error(`   ${issue.path.join(".")}: ${issue.message}`);
      failed = true;
      continue;
    }
    const problems = lintDoc(parsed.data);
    if (ids.has(parsed.data.id)) problems.push(`duplicate id "${parsed.data.id}"`);
    ids.add(parsed.data.id);
    if (problems.length) {
      failed = true;
      console.error(`✕ ${path}:`);
      problems.forEach((p) => console.error(`   ${p}`));
    } else console.log(`✓ ${path}`);
  }
}

if (failed) process.exit(1);
