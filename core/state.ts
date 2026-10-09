// The starting state of a new save, and the small helpers that every
// state change uses.

import { seedToState } from './rng'
import type { ContentPack, GameState, LogLine } from './types'
import { STATE_VERSION } from './types'

// Builds the state of a new game. The founder is null until the player
// names it, and the clock does not run before then.
export function initialState(seed: number, content: ContentPack): GameState {
  const b = content.balance
  return {
    version: STATE_VERSION,
    seed,
    rngState: seedToState(seed),
    founder: null,
    year: b.startYear,
    clock: 0,
    runSeconds: 0,
    cash: b.startCash,
    rp: 0,
    lifetimeTokens: 0,
    runTokens: 0,
    machines: Object.fromEntries(content.machines.map((m) => [m.id, 0])),
    models: content.models.filter((m) => m.acquire.kind === 'start').map((m) => m.id),
    agents: [],
    nextAgentId: 1,
    training: null,
    research: [],
    contractPick: b.handWorkContract,
    logits: 0,
    shop: {},
    story: [],
    revealed: [],
    log: [],
    lastSavedAt: 0,
    stats: { distills: 0, bestRunSeconds: null, workPresses: 0, logitsEarned: 0 },
  }
}

// Returns a state with one more log line, trimmed to the log limit.
export function withLog(state: GameState, content: ContentPack, text: string): GameState {
  const line: LogLine = { t: state.clock, text }
  const log = [...state.log, line].slice(-content.balance.logLimit)
  return { ...state, log }
}
