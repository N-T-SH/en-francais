// Pre-renders every phrase in content/ with a neural French voice, so the app
// plays natural audio instead of the device's speech engine.
//
//   npm run audio -- --out dist/audio
//
// Environment:
//   TTS_ENGINE   edge (default, free, no key) | google | azure
//   TTS_VOICE    engine-specific voice name (defaults below)
//   GOOGLE_TTS_API_KEY                 for engine=google
//   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION  for engine=azure
//
// Clips are cached in .audio-cache/ by (engine, voice, text), so only new
// phrases are synthesised on each run. Phrases that fail are skipped: the app
// falls back to the device voice for them.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { collectPhrases, Lesson, Revision } from "../src/content/schema";

export interface Engine {
  name: string;
  defaultVoice: string;
  synthesize(text: string, voice: string, outFile: string): Promise<void>;
}

const run = promisify(execFile);

export const engines: Record<string, Engine> = {
  // Microsoft Edge's online neural voices via the `edge-tts` CLI
  // (pip install edge-tts). Free and keyless, but an unofficial endpoint.
  edge: {
    name: "edge",
    defaultVoice: "fr-FR-DeniseNeural",
    async synthesize(text, voice, outFile) {
      await run("edge-tts", ["--voice", voice, "--rate", "-5%", "--text", text, "--write-media", outFile]);
    },
  },
  // Google Cloud Text-to-Speech. Chirp 3 HD voices are the most natural.
  google: {
    name: "google",
    defaultVoice: "fr-FR-Chirp3-HD-Aoede",
    async synthesize(text, voice, outFile) {
      const key = requireEnv("GOOGLE_TTS_API_KEY");
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.slice(0, 5), name: voice },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });
      if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
      const { audioContent } = (await res.json()) as { audioContent: string };
      writeFileSync(outFile, Buffer.from(audioContent, "base64"));
    },
  },
  // Azure AI Speech neural voices.
  azure: {
    name: "azure",
    defaultVoice: "fr-FR-DeniseNeural",
    async synthesize(text, voice, outFile) {
      const key = requireEnv("AZURE_SPEECH_KEY");
      const region = requireEnv("AZURE_SPEECH_REGION");
      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: `<speak version="1.0" xml:lang="fr-FR"><voice name="${voice}"><prosody rate="-5%">${escaped}</prosody></voice></speak>`,
      });
      if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text()}`);
      writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
    },
  },
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function clipName(engine: string, voice: string, text: string): string {
  return `${createHash("sha1").update(`${engine}|${voice}|${text}`).digest("hex").slice(0, 16)}.mp3`;
}

export function contentPhrases(contentDir: string): string[] {
  const phrases = new Set<string>();
  for (const [dir, schema] of [["lessons", Lesson], ["revisions", Revision]] as const) {
    const path = join(contentDir, dir);
    if (!existsSync(path)) continue;
    for (const f of readdirSync(path).filter((f) => f.endsWith(".json")))
      collectPhrases(schema.parse(JSON.parse(readFileSync(join(path, f), "utf8")))).forEach((p) => phrases.add(p));
  }
  return [...phrases];
}

export async function buildAudio(opts: {
  engine: Engine;
  voice: string;
  phrases: string[];
  cacheDir: string;
  outDir: string;
  concurrency?: number;
  log?: (msg: string) => void;
}) {
  const log = opts.log ?? console.log;
  mkdirSync(opts.cacheDir, { recursive: true });
  mkdirSync(opts.outDir, { recursive: true });
  const files: Record<string, string> = {};
  let fresh = 0;
  let failed = 0;
  const queue = [...opts.phrases];

  async function worker() {
    for (let text = queue.shift(); text !== undefined; text = queue.shift()) {
      const name = clipName(opts.engine.name, opts.voice, text);
      const cached = join(opts.cacheDir, name);
      try {
        if (!existsSync(cached) || statSync(cached).size === 0) {
          await opts.engine.synthesize(text, opts.voice, cached);
          fresh++;
        }
        copyFileSync(cached, join(opts.outDir, name));
        files[text] = name;
      } catch (e) {
        failed++;
        rmSync(cached, { force: true });
        log(`  ✕ "${text}": ${(e as Error).message.split("\n")[0]}`);
        // Engine unreachable or misconfigured: stop instead of failing every phrase.
        if (failed >= 5 && Object.keys(files).length === 0) queue.length = 0;
      }
    }
  }
  await Promise.all(Array.from({ length: opts.concurrency ?? 4 }, worker));

  const manifest = { engine: opts.engine.name, voice: opts.voice, files };
  writeFileSync(join(opts.outDir, "manifest.json"), JSON.stringify(manifest));
  log(`Audio: ${Object.keys(files).length}/${opts.phrases.length} phrases (${fresh} new, ${failed} failed) — ${opts.engine.name} / ${opts.voice}`);
  return { manifest, fresh, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "dist/audio";
  const engine = engines[process.env.TTS_ENGINE || "edge"];
  if (!engine) {
    console.error(`Unknown TTS_ENGINE "${process.env.TTS_ENGINE}". Use: ${Object.keys(engines).join(", ")}`);
    process.exit(1);
  }
  const root = new URL("..", import.meta.url).pathname;
  const phrases = contentPhrases(join(root, "content"));
  const { manifest } = await buildAudio({
    engine,
    voice: process.env.TTS_VOICE || engine.defaultVoice,
    phrases,
    cacheDir: join(root, ".audio-cache"),
    outDir,
  });
  // Never fail the deploy over audio: missing clips fall back to device speech.
  if (!Object.keys(manifest.files).length) console.warn("⚠ No audio generated; the app will use device voices.");
}
