// A compile-time check that the $.state contract in types/index.d.ts and
// the core GameState in core/types.ts describe the same shape. The contract
// cannot import the core type, so it keeps a mirror. If the two drift
// apart, the constants below stop compiling and the typecheck fails.
// No hook module imports this file. Only tsc reads it.

import type { GameState } from '../core/types'
import type { TokinGame } from '../types'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export const CONTRACT_MATCHES_CORE: Same<TokinGame, GameState> = true
export const AGENTS_MATCH_CORE: Same<TokinGame['agents'], GameState['agents']> = true
export const STATS_MATCH_CORE: Same<TokinGame['stats'], GameState['stats']> = true
