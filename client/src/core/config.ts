import { IN } from '@mugen/shared';

export interface KeyMap {
  [code: string]: number; // KeyboardEvent.code -> IN bit
}

export interface Bindings {
  p1: KeyMap;
  p2: KeyMap;
}

export interface Settings {
  bindings: Bindings;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  difficulty: 0 | 1 | 2; // easy / normal / hard
  roundsToWin: number;
  roundTime: number;
  showHitboxes: boolean;
  serverUrl: string;
  inputDelay: number;
}

const DEFAULT_P1: KeyMap = {
  KeyW: IN.UP,
  KeyS: IN.DOWN,
  KeyA: IN.LEFT,
  KeyD: IN.RIGHT,
  KeyF: IN.LP,
  KeyG: IN.HP,
  KeyV: IN.LK,
  KeyB: IN.HK,
  KeyR: IN.S1,
  KeyT: IN.S2,
};

const DEFAULT_P2: KeyMap = {
  ArrowUp: IN.UP,
  ArrowDown: IN.DOWN,
  ArrowLeft: IN.LEFT,
  ArrowRight: IN.RIGHT,
  Numpad1: IN.LP,
  Numpad2: IN.HP,
  Numpad4: IN.LK,
  Numpad5: IN.HK,
  Numpad7: IN.S1,
  Numpad8: IN.S2,
};

export const DEFAULT_SETTINGS: Settings = {
  bindings: { p1: { ...DEFAULT_P1 }, p2: { ...DEFAULT_P2 } },
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5,
  difficulty: 1,
  roundsToWin: 2,
  roundTime: 99,
  showHitboxes: false,
  serverUrl: defaultServerUrl(),
  inputDelay: 3,
};

function defaultServerUrl(): string {
  if (typeof location === 'undefined') return 'ws://localhost:8080';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.hostname}:8080`;
}

const KEY = 'mugen.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      bindings: {
        p1: { ...DEFAULT_P1, ...(parsed.bindings?.p1 ?? {}) },
        p2: { ...DEFAULT_P2, ...(parsed.bindings?.p2 ?? {}) },
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
