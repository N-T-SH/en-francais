import { describe, expect, it } from "vitest";
import { merge, migrateKey, SECTION_MOVES } from "../src/state/store";

describe("progress migration", () => {
  it("maps moved sections and their exercise keys", () => {
    expect(migrateKey("introduction/nombres")).toBe("epeler-compter/nombres");
    expect(migrateKey("introduction/nombres#4")).toBe("epeler-compter/nombres#4");
    expect(migrateKey("infos-personnelles/verbes-er")).toBe("infos-personnelles/verbes-er");
  });

  it("carries weak, done and results over from an older export", () => {
    const state = merge({
      weak: ["introduction/etre-avoir", "entrer-en-contact/telephone"],
      done: ["faites-connaissance/adjectifs", "introduction/etre-avoir"],
      results: { "faites-connaissance/possessifs#2": { correct: 3, total: 4, at: "2026-09-24" } },
    });
    expect(state.weak).toEqual(["se-presenter/etre-avoir", "preciser-des-informations/telephone"]);
    expect(state.done).toEqual(["decrire-une-personne/adjectifs", "se-presenter/etre-avoir"]);
    expect(state.results["parler-de-la-famille/possessifs#2"].correct).toBe(3);
  });

  it("only maps to sections that exist", async () => {
    const { sectionIndex } = await import("../src/content");
    for (const target of Object.values(SECTION_MOVES)) expect(sectionIndex.has(target)).toBe(true);
  });
});
