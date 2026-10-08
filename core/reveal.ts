// The reveal rule. An item appears once the player holds a fraction of its
// cost, and it stays visible after that, as in A Dark Room. The core owns the
// rule, so a host never writes state.revealed.

import { modsOf, computeRates } from './economy'
import type { Phase } from './step'
import { makeCtx, newlyRevealed } from './view-rows'
import type { ContentPack, GameState } from './types'

// Adds the newly visible machine and research ids to state.revealed.
// Returns the same object when there are none.
export function revealNew(state: GameState, content: ContentPack): GameState {
  if (state.founder === null) return state
  const mods = modsOf(state, content)
  const ctx = makeCtx(state, content, mods, computeRates(state, content, mods))
  // A machine that starts unlocked always shows, so it needs no record.
  const always = content.machines.filter((m) => m.startsUnlocked).map((m) => m.id)
  const fresh = newlyRevealed(ctx).filter((id) => !always.includes(id))
  return fresh.length === 0 ? state : { ...state, revealed: [...state.revealed, ...fresh] }
}

export const revealPhase: Phase = (state, content) => revealNew(state, content)
