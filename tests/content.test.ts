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

describe("library structure", () => {
  const lessons = readdirSync(new URL("../content/lessons/", import.meta.url))
    .filter((f) => f.endsWith(".json"))
    .map((f) => Lesson.parse(JSON.parse(readFileSync(new URL(`../content/lessons/${f}`, import.meta.url), "utf8"))));

  const byLevel = (level: string) => lessons.filter((l) => l.level === level);

  it("has unique lesson ids and numbers per level, in textbook order", () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    for (const level of ["A1", "A2"]) {
      const inLevel = byLevel(level);
      const numbers = inLevel.map((l) => l.number);
      expect(new Set(numbers).size, level).toBe(numbers.length);
      const sorted = [...inLevel].sort((a, b) => a.order - b.order).map((l) => l.number as number);
      expect(sorted, level).toEqual([...sorted].sort((a, b) => a - b));
    }
  });

  it("keeps the A2 lessons apart from the A1 ones", () => {
    for (const l of byLevel("A2")) expect(l.id.startsWith("a2-"), l.id).toBe(true);
    for (const l of byLevel("A1")) expect(l.id.startsWith("a2-"), l.id).toBe(false);
  });

  it("puts lessons 8–11 of A1 in unit 3", () => {
    const unit3 = byLevel("A1").filter((l) => l.unit === 3).map((l) => l.number);
    expect(unit3).toEqual([8, 9, 10, 11]);
  });

  it("groups the A2 lessons four to a unit (3 lessons + Techniques pour…)", () => {
    for (const l of byLevel("A2")) expect(l.unit, l.id).toBe(Math.ceil((l.number as number) / 4));
  });
});
