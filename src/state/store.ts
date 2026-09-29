import { useSyncExternalStore } from "react";

/**
 * Per-device learner state (weak spots, progress, settings), kept in
 * localStorage. Export/import in Settings moves it between devices.
 */

export interface ExerciseResult {
  correct: number;
  total: number;
  at: string;
}

export interface Settings {
  rate: number;
  /** "auto" = neural audio files when available, else the device voice. */
  voiceSource: "auto" | "device";
  deviceVoice: string | null;
  theme: "system" | "light" | "dark";
  /** Show the small emoji illustrations next to vocabulary. */
  illustrations: boolean;
}

export interface State {
  version: 1;
  /** Section keys ("lessonId/sectionId") the learner marked as weak. */
  weak: string[];
  /** Section keys the learner marked as done. */
  done: string[];
  /** Latest score per exercise, keyed by "lessonId/sectionId#blockIndex". */
  results: Record<string, ExerciseResult>;
  settings: Settings;
}

const KEY = "en-francais:v1";

export const defaultState: State = {
  version: 1,
  weak: [],
  done: [],
  results: {},
  settings: { rate: 0.95, voiceSource: "auto", deviceVoice: null, theme: "system", illustrations: true },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return defaultState;
}

/**
 * Sections that moved when lessons were regrouped by textbook lesson. Saved
 * progress under the old keys is carried over to the new ones.
 */
export const SECTION_MOVES: Record<string, string> = {
  "introduction/salutations": "saluer/salutations",
  "introduction/objets": "saluer/objets",
  "introduction/alphabet": "epeler-compter/alphabet",
  "introduction/nombres": "epeler-compter/nombres",
  "introduction/jours-mois": "epeler-compter/jours",
  "introduction/etre-avoir": "se-presenter/etre-avoir",
  "entrer-en-contact/nationalites-pays": "se-presenter/nationalites-pays",
  "entrer-en-contact/s-appeler": "se-presenter/s-appeler",
  "entrer-en-contact/telephone": "preciser-des-informations/telephone",
  "faites-connaissance/famille-professions": "parler-de-la-famille/famille-professions",
  "faites-connaissance/possessifs": "parler-de-la-famille/possessifs",
  "faites-connaissance/adjectifs": "decrire-une-personne/adjectifs",
};

/** Map an old section key, or an exercise key ("section#block"), to its current key. */
export function migrateKey(key: string): string {
  const [section, ...rest] = key.split("#");
  const moved = SECTION_MOVES[section];
  return moved ? [moved, ...rest].join("#") : key;
}

function migrateList(list: string[] | undefined): string[] {
  return [...new Set((list ?? []).map(migrateKey))];
}

export function merge(raw: Partial<State>): State {
  const results: State["results"] = {};
  for (const [k, v] of Object.entries(raw.results ?? {})) results[migrateKey(k)] = v;
  return {
    ...defaultState,
    ...raw,
    version: 1,
    weak: migrateList(raw.weak),
    done: migrateList(raw.done),
    results,
    settings: { ...defaultState.settings, ...(raw.settings ?? {}) },
  };
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep in memory only */
  }
  listeners.forEach((l) => l());
}

export function getState(): State {
  return state;
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
  );
}

function toggleIn(list: string[], key: string, on?: boolean): string[] {
  const has = list.includes(key);
  const want = on ?? !has;
  if (want === has) return list;
  return want ? [...list, key] : list.filter((k) => k !== key);
}

export const actions = {
  toggleWeak(key: string, on?: boolean) {
    commit({ ...state, weak: toggleIn(state.weak, key, on) });
  },
  toggleDone(key: string, on?: boolean) {
    commit({ ...state, done: toggleIn(state.done, key, on) });
  },
  recordResult(key: string, correct: number, total: number) {
    commit({ ...state, results: { ...state.results, [key]: { correct, total, at: new Date().toISOString() } } });
  },
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },
  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },
  importJson(json: string) {
    commit(merge(JSON.parse(json)));
  },
  reset() {
    commit(defaultState);
  },
};
