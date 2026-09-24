import { describe, expect, it } from "vitest";
import { check, splitPrompt } from "../src/content/answers";

describe("check", () => {
  it("accepts exact and case/punctuation variants", () => {
    expect(check("Bonjour", "Bonjour")).toBe("correct");
    expect(check("  bonjour ! ", "Bonjour")).toBe("correct");
  });
  it("accepts any listed alternative", () => {
    expect(check("coucou", "Salut | Coucou")).toBe("correct");
  });
  it("normalises apostrophes", () => {
    expect(check("t’appelles", "t'appelles")).toBe("correct");
    expect(check("L '", "L'")).toBe("correct");
  });
  it("flags missing accents separately", () => {
    expect(check("etudions", "étudions")).toBe("accents");
    expect(check("soeur", "sœur")).toBe("accents");
  });
  it("rejects wrong and empty answers", () => {
    expect(check("sont", "ont")).toBe("wrong");
    expect(check("  ", "ont")).toBe("empty");
  });
});

describe("splitPrompt", () => {
  it("splits on blanks", () => {
    expect(splitPrompt("Je ___ indien. J'___ ans.")).toEqual(["Je ", " indien. J'", " ans."]);
  });
  it("adds a trailing blank when the prompt has none", () => {
    expect(splitPrompt("Traduisez : hello")).toEqual(["Traduisez : hello", ""]);
  });
});
