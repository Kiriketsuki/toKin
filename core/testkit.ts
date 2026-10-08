// Helpers for engine specs. They build states through the public engine
// functions, so a spec reads like a play session.

import { apply } from './actions'
import { FIXTURE } from './fixtures'
import { initialState } from './state'
import { step } from './step'
import type { Action, ContentPack, GameState } from './types'

export const SEED = 42

// A new game with a named founder.
export function started(seed: number = SEED, content: ContentPack = FIXTURE): GameState {
  return apply(initialState(seed, content), content, { type: 'nameFounder', name: 'Ada' })
}

// Runs actions in order. A refused action leaves the state as it was.
export function play(state: GameState, actions: readonly Action[], content: ContentPack = FIXTURE): GameState {
  return actions.reduce((acc, action) => apply(acc, content, action), state)
}

export function repeat(action: Action, times: number): readonly Action[] {
  return Array.from({ length: times }, () => action)
}

// Steps in whole one-second ticks.
export function tick(state: GameState, seconds: number, content: ContentPack = FIXTURE): GameState {
  return Array.from({ length: seconds }).reduce<GameState>((acc) => step(acc, content, 1), state)
}

export function withState(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch }
}
