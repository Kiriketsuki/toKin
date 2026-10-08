// The ports a host gives the core. A host is anything that runs the game:
// the Claude Code mod in hooks/, a headless balance bot in sim/, or a later
// standalone build. The core reaches the outside world only through these
// interfaces, so it never names a host API. The core reads no wall clock
// and draws no random number outside the seeded generator in GameState.

import type { Action, LogLine, Verdict } from './types'

// The version of this port contract. A host can assert it at start up.
export const PORTS_VERSION = 1

// The keys the core asks a host to store values under.
export const STORAGE_KEYS = {
  save: 'tokin.save',
  lock: 'tokin.lock',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// A plain JSON value. Storage holds nothing else, so any host can persist it.
export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json }

// Keeps JSON values by key across sessions. A missing key reads as undefined.
export interface StoragePort {
  get(key: string): Promise<Json | undefined>
  set(key: string, value: Json): Promise<void>
}

// Stops a timer that ClockPort.every started.
export type Cancel = () => void

// Wall time and a repeating timer. now() answers epoch milliseconds.
export interface ClockPort {
  now(): number
  every(ms: number, fn: () => void): Cancel
}

// Tells the player something outside the game view.
// toast shows a short transient message. log receives each new log line,
// so a host can mirror the game log to its own output.
export interface NotifierPort {
  toast(text: string): void
  log(line: LogLine): void
}

// Everything a host gives the core.
// instanceId names this running host, such as a Claude Code session id. The
// ticker lock records it, so only one instance advances a save.
// newSeed gives the seed for a new save. The core draws every later random
// number from the seeded generator in GameState.
export interface HostPorts {
  readonly storage: StoragePort
  readonly clock: ClockPort
  readonly notifier: NotifierPort
  readonly instanceId: string
  newSeed(): number
}

// The input side. A host turns player input (a button press, a key, a bot
// decision) into an Action and dispatches it. The answer says whether the
// core accepted it, and why not when it refused.
export type Dispatch = (action: Action) => Verdict
