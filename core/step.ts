// Advances the game by dt seconds. Live ticks and offline catch-up both call
// step. It is pure: it returns a new state and leaves the input alone.
//
// step runs a list of phases in order. Each phase takes the state, the
// content, dt and the rates computed at the start of the step. Later systems
// add a phase to PHASES. Training adds one that advances the run.

import { computeRates, type Rates } from './economy'
import { advanceStory } from './story'
import type { ContentPack, GameState } from './types'

export type Phase = (state: GameState, content: ContentPack, dt: number, rates: Rates) => GameState

// Moves the clocks and pays out cash, RP and tokens at the current rates.
export const productionPhase: Phase = (state, _content, dt, rates) => {
  const tokens = rates.tokPerSec * dt
  const agents = state.agents.map((a) => {
    const made = rates.agents.find((r) => r.id === a.id)?.tokPerSec ?? 0
    return made > 0 ? { ...a, lifetimeTokens: a.lifetimeTokens + made * dt } : a
  })
  return {
    ...state,
    clock: state.clock + dt,
    runSeconds: state.runSeconds + dt,
    cash: state.cash + rates.cashPerSec * dt,
    rp: state.rp + rates.rpPerSec * dt,
    runTokens: state.runTokens + tokens,
    lifetimeTokens: state.lifetimeTokens + tokens,
    agents,
  }
}

// Story runs last so a beat sees the state after production.
const storyPhase: Phase = (state, content) => advanceStory(state, content)

export const PHASES: readonly Phase[] = [productionPhase, storyPhase]

// Before the player names the founder the game has not started, so the
// clock does not run. A non-positive or non-finite dt changes nothing.
export function step(state: GameState, content: ContentPack, dt: number): GameState {
  if (state.founder === null || !(dt > 0) || !Number.isFinite(dt)) return state
  const rates = computeRates(state, content)
  return PHASES.reduce((acc, phase) => phase(acc, content, dt, rates), state)
}
