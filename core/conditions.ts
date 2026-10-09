// Evaluates a content Condition against the state. Story triggers and
// research gates both use it.

import type { Rates } from './economy'
import type { Condition, ContentPack, GameState, StatKey } from './types'

// Reads one named number. Rates come from computeRates.
export function statValue(stat: StatKey, state: GameState, rates: Rates): number {
  switch (stat) {
    case 'cash':
      return state.cash
    case 'rp':
      return state.rp
    case 'lifetimeTokens':
      return state.lifetimeTokens
    case 'runTokens':
      return state.runTokens
    case 'logits':
      return state.logits
    case 'distills':
      return state.stats.distills
    case 'workPresses':
      return state.stats.workPresses
    case 'cashPerSec':
      return rates.cashPerSec
    case 'tokPerSec':
      return rates.tokPerSec
    case 'compute':
      return rates.compute
    case 'wasted':
      return rates.wasted
  }
}

export function holds(cond: Condition, state: GameState, content: ContentPack, rates: Rates): boolean {
  switch (cond.kind) {
    case 'stat':
      return statValue(cond.stat, state, rates) >= cond.gte
    case 'machine':
      return (state.machines[cond.machine] ?? 0) >= cond.gte
    case 'agents':
      return state.agents.filter((a) => cond.job === undefined || a.job === cond.job).length >= cond.gte
    case 'research':
      return state.research.includes(cond.research)
    case 'model':
      return state.models.includes(cond.model)
    case 'all':
      return cond.of.every((c) => holds(c, state, content, rates))
    case 'any':
      return cond.of.some((c) => holds(c, state, content, rates))
  }
}

export function holdsAll(conds: readonly Condition[], state: GameState, content: ContentPack, rates: Rates): boolean {
  return conds.every((c) => holds(c, state, content, rates))
}
