// Time that passes outside the live tick: offline catch-up and long gaps.
// advance runs step in chunks, so a long span costs a bounded number of
// calls and stays close to the same time of one-second ticks.

import { modsOf } from './economy'
import { fmtDollars, fmtNum, fill } from './format'
import { step } from './step'
import { withLog } from './state'
import type { ContentPack, GameState } from './types'

// A gap shorter than this is a slow tick, not a sleep. It gets no log lines.
export const SLEEP_NOTICE_SECONDS = 60

// The most offline seconds the game simulates: 2 h, or 8 h after Night Shift.
export function offlineCap(state: GameState, content: ContentPack): number {
  return modsOf(state, content).offlineCapSeconds
}

// Steps the state forward by `seconds`, in chunks of at most
// balance.catchUpChunkSeconds. It returns the input for a span of zero.
export function advance(state: GameState, content: ContentPack, seconds: number): GameState {
  const chunk = Math.max(1, content.balance.catchUpChunkSeconds)
  let current = state
  let left = seconds
  while (left > 1e-9) {
    const dt = Math.min(chunk, left)
    current = step(current, content, dt)
    left -= dt
  }
  return current
}

// Simulates an away span, capped by offlineCap. A span of SLEEP_NOTICE_SECONDS
// or more also logs the two return lines. The cap bounds what is simulated and
// never the time that passed.
export function catchUp(state: GameState, content: ContentPack, awaySeconds: number): GameState {
  if (state.founder === null || !(awaySeconds > 0)) return state
  const simulated = Math.min(awaySeconds, offlineCap(state, content))
  const after = advance(state, content, simulated)
  if (awaySeconds < SLEEP_NOTICE_SECONDS) return after
  const summary = fill(content.text.offlineSummary, {
    seconds: Math.round(simulated),
    tokens: fmtNum(after.runTokens - state.runTokens),
    cash: fmtDollars(after.cash - state.cash),
  })
  return withLog(withLog(after, content, content.text.offlineReturn), content, summary)
}
