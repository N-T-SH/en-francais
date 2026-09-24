import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAudio, clipName, contentPhrases, type Engine } from "../scripts/build-audio";

function fakeEngine(failOn?: string): Engine & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: "fake",
    defaultVoice: "v",
    calls,
    async synthesize(text, _voice, out) {
      calls.push(text);
      if (text === failOn) throw new Error("boom");
      writeFileSync(out, `audio:${text}`);
    },
  };
}

describe("buildAudio", () => {
  it("writes clips and a manifest, reusing the cache", async () => {
    const dir = mkdtempSync(join(tmpdir(), "audio-"));
    const cacheDir = join(dir, "cache");
    const engine = fakeEngine("oops");
    const opts = { engine, voice: "v", phrases: ["bonjour", "oops", "merci"], cacheDir, outDir: join(dir, "out"), log: () => {} };

    const first = await buildAudio(opts);
    expect(first.failed).toBe(1);
    expect(Object.keys(first.manifest.files).sort()).toEqual(["bonjour", "merci"]);
    const file = join(dir, "out", clipName("fake", "v", "bonjour"));
    expect(readFileSync(file, "utf8")).toBe("audio:bonjour");
    expect(JSON.parse(readFileSync(join(dir, "out", "manifest.json"), "utf8")).files.merci).toBe(clipName("fake", "v", "merci"));

    engine.calls.length = 0;
    const second = await buildAudio({ ...opts, outDir: join(dir, "out2") });
    expect(second.fresh).toBe(0);
    expect(engine.calls).toEqual(["oops"]);
    expect(existsSync(join(dir, "out2", clipName("fake", "v", "merci")))).toBe(true);
  });

  it("collects unique phrases from the content folder", () => {
    const phrases = contentPhrases(new URL("../content", import.meta.url).pathname);
    expect(phrases).toContain("quatre-vingt-dix");
    expect(new Set(phrases).size).toBe(phrases.length);
  });
});
