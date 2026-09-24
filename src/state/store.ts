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
  settings: { rate: 0.95, voiceSource: "auto", deviceVoice: null, theme: "system" },
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

function merge(raw: Partial<State>): State {
  return {
    ...defaultState,
    ...raw,
    version: 1,
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
