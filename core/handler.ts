// The shape of one action handler, plus the helpers that handlers share.
// An action module exports a Handlers object. actions.ts merges them, so
// training, research and Distill plug in without a change to the dispatcher.

import type { Action, ActionType, ContentPack, GameState, TextKey, Verdict } from './types'
import { fill } from './format'

export interface Handler<A extends Action = Action> {
  // Answers whether the action can run now. It never changes the state.
  readonly check: (state: GameState, content: ContentPack, action: A) => Verdict
  // Runs the action. The dispatcher calls it only after check said ok.
  readonly run: (state: GameState, content: ContentPack, action: A) => GameState
}

export type Handlers = { readonly [K in ActionType]?: Handler<Extract<Action, { type: K }>> }

export const OK: Verdict = { ok: true }

// A refusal with player-facing text from the content pack.
export function refuse(
  content: ContentPack,
  key: TextKey,
  vars: Readonly<Record<string, string | number>> = {},
): Verdict {
  return { ok: false, reason: fill(content.text[key], vars) }
}
