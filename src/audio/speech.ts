import { getState } from "../state/store";

/**
 * Audio playback. Phrases are pre-rendered with a neural voice at deploy time
 * (see scripts/build-audio.ts) and listed in audio/manifest.json. Anything
 * missing from the manifest falls back to the device's speech engine, picking
 * its most natural French voice.
 */

export interface AudioManifest {
  engine: string;
  voice: string;
  files: Record<string, string>;
}

const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

let manifestPromise: Promise<AudioManifest | null> | null = null;

export function loadManifest(): Promise<AudioManifest | null> {
  manifestPromise ??= fetch(`${AUDIO_BASE}manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<AudioManifest>) : null))
    .catch(() => null);
  return manifestPromise;
}

export type Source = "neural" | "device" | "none";

interface Callbacks {
  onStart?: (source: Source) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

let current: { stop: () => void } | null = null;
let sequenceToken = 0;

export function stop() {
  sequenceToken++;
  current?.stop();
  current = null;
  if (hasDeviceSpeech()) window.speechSynthesis.cancel();
}

export async function speak(text: string, cb: Callbacks = {}): Promise<void> {
  current?.stop();
  current = null;
  const { settings } = getState();
  if (settings.voiceSource === "auto") {
    const manifest = await loadManifest();
    const file = manifest?.files[text];
    if (file) return playFile(`${AUDIO_BASE}${file}`, settings.rate, text, cb);
  }
  return speakDevice(text, settings.rate, cb);
}

/** Play several phrases back to back; `onItem` reports the playing index (-1 when done). */
export async function speakAll(texts: string[], onItem: (index: number) => void): Promise<void> {
  stop();
  const token = sequenceToken;
  for (let i = 0; i < texts.length; i++) {
    if (token !== sequenceToken) return;
    onItem(i);
    await new Promise<void>((resolve) => void speak(texts[i], { onEnd: resolve, onError: () => resolve() }));
    if (token !== sequenceToken) return;
    await new Promise((r) => setTimeout(r, 350));
  }
  onItem(-1);
}

function playFile(url: string, rate: number, text: string, cb: Callbacks): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cb.onEnd?.();
      resolve();
    };
    audio.onplaying = () => cb.onStart?.("neural");
    audio.onended = finish;
    audio.onerror = () => {
      // File missing or offline and not cached: fall back to the device voice.
      if (settled) return;
      settled = true;
      void speakDevice(text, rate, cb).then(resolve);
    };
    current = {
      stop: () => {
        audio.pause();
        finish();
      },
    };
    audio.play().catch(() => audio.onerror?.(new Event("error")));
  });
}

// ---------------------------------------------------------------------------
// Device speech (Web Speech API)

export function hasDeviceSpeech(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Names that indicate a cloud / neural voice rather than a robotic one.
const QUALITY_HINTS = [/natural/i, /neural/i, /online/i, /premium/i, /enhanced/i, /google/i, /siri/i, /wavenet/i];

function voiceScore(v: SpeechSynthesisVoice): number {
  let score = 0;
  if (v.lang === "fr-FR" || v.lang === "fr_FR") score += 10;
  else if (v.lang.toLowerCase().startsWith("fr")) score += 5;
  QUALITY_HINTS.forEach((re) => re.test(v.name) && (score += 3));
  if (!v.localService) score += 2;
  return score;
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  if (!hasDeviceSpeech()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("fr"))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = frenchVoices();
  const wanted = getState().settings.deviceVoice;
  return voices.find((v) => v.voiceURI === wanted) ?? voices[0] ?? null;
}

if (hasDeviceSpeech()) {
  // Android Chrome needs a user gesture to "unlock" the speech engine.
  const prime = () => {
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
  };
  document.addEventListener("pointerup", prime, { once: true });
  window.speechSynthesis.getVoices();
}

function speakDevice(text: string, rate: number, cb: Callbacks): Promise<void> {
  return new Promise((resolve) => {
    if (!hasDeviceSpeech()) {
      cb.onStart?.("none");
      cb.onError?.("Aucune synthèse vocale sur cet appareil.");
      cb.onEnd?.();
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = rate;
    let started = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cb.onEnd?.();
      resolve();
    };
    utter.onstart = () => {
      started = true;
      cb.onStart?.("device");
    };
    utter.onend = finish;
    utter.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") cb.onError?.(e.error);
      finish();
    };
    current = { stop: () => { synth.cancel(); finish(); } };

    // Cancelling right before speaking can swallow the new utterance on Android.
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTimeout(() => synth.speak(utter), 60);
    } else synth.speak(utter);

    // Some Android builds silently drop speak(); retry once.
    setTimeout(() => {
      if (!started && !settled && !synth.speaking && !synth.pending) synth.speak(utter);
    }, 400);
    // Never leave a "Play all" queue hanging if the engine gives no events.
    setTimeout(() => !started && finish(), 4000);
  });
}
