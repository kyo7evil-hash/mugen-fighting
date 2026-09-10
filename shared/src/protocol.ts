/**
 * Lockstep netcode wire protocol (JSON over WebSocket).
 * The server is a pure relay + room bookkeeper; it never simulates.
 */
export const PROTOCOL_VERSION = 1;
export const DEFAULT_INPUT_DELAY = 3;
export const CHECKSUM_INTERVAL = 30;

export type ClientMsg =
  | { t: 'hello'; version: number; name: string }
  | { t: 'create'; roundsToWin: number; inputDelay: number }
  | { t: 'join'; code: string }
  | { t: 'select'; charId: string; ready: boolean; stage: string }
  | { t: 'start_ack' }
  | { t: 'input'; frame: number; bits: number }
  | { t: 'checksum'; frame: number; hash: number }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'rematch' }
  | { t: 'leave' };

export type ServerMsg =
  | { t: 'hello_ok'; id: string }
  | { t: 'error'; message: string }
  | { t: 'created'; code: string; slot: 0 | 1; inputDelay: number; roundsToWin: number }
  | { t: 'joined'; code: string; slot: 0 | 1; inputDelay: number; roundsToWin: number }
  | { t: 'peer'; name: string; connected: boolean }
  | { t: 'select'; slot: 0 | 1; charId: string; ready: boolean; stage: string }
  | { t: 'start'; seed: number; p1: string; p2: string; stage: string; startFrame: number }
  | { t: 'input'; frame: number; bits: number; slot: 0 | 1 }
  | { t: 'checksum'; frame: number; hash: number; slot: 0 | 1 }
  | { t: 'desync'; frame: number }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'rematch'; seed: number }
  | { t: 'peer_left' };
