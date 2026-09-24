import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Lesson, Revision, lintDoc } from "../src/content/schema";

const dirs = { lessons: Lesson, revisions: Revision } as const;

describe("content files", () => {
  for (const [dir, schema] of Object.entries(dirs)) {
    const path = new URL(`../content/${dir}/`, import.meta.url);
    const files = readdirSync(path).filter((f) => f.endsWith(".json"));
    for (const f of files)
      it(`${dir}/${f} is valid`, () => {
        const doc = schema.parse(JSON.parse(readFileSync(new URL(f, path), "utf8")));
        expect(lintDoc(doc)).toEqual([]);
      });
  }
});

describe("lintDoc", () => {
  it("catches blank/answer mismatches", () => {
    const doc = Lesson.parse({
      id: "x", order: 1, kicker: "k", title: "t", summary: "s",
      sections: [{ id: "a", title: "A", blocks: [{ type: "exercise", title: "E", items: [{ prompt: "___ et ___", answers: ["un"] }] }] }],
    });
    expect(lintDoc(doc)[0]).toMatch(/2 blank\(s\) but 1 answer/);
  });
});

describe("phone number guard", () => {
  it("flags real-looking numbers and allows fictional ranges", async () => {
    const { realLookingPhoneNumbers } = await import("../src/content/schema");
    expect(realLookingPhoneNumbers("Alex — 12 34 56 78 90")).toEqual(["12 34 56 78 90"]);
    expect(realLookingPhoneNumbers("+44 12 34 56 78 90")).toHaveLength(1);
    expect(realLookingPhoneNumbers("06 39 98 42 17 · +33 1 99 00 59 61 · +33 6 39 98 75 91")).toEqual([]);
    expect(realLookingPhoneNumbers("le 3 mars 1986, 2026, 70 — soixante-dix")).toEqual([]);
  });
});
