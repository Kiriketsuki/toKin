// The values the toKin mod keeps in $.state for the session. The pane draws
// from them. Only the Claude Code host adapter in hooks/ reads this file.
//
// The engine requires this contract to be self-contained: no import and no
// reference. So TokinGame mirrors GameState from core/types.ts field for
// field. hooks/contract-check.ts fails the typecheck when the two differ.
// Change both together.

export type TokinAgent = {
  readonly id: string
  readonly name: string
  readonly model: string
  readonly job: 'earn' | 'research' | 'train'
  readonly lifetimeTokens: number
}

export type TokinTraining = {
  readonly model: string
  readonly reservedFlops: number
  readonly progress: number
}

export type TokinLogLine = {
  readonly t: number
  readonly text: string
}

export type TokinStats = {
  readonly distills: number
  readonly bestRunSeconds: number | null
  readonly workPresses: number
  readonly logitsEarned: number
}

export type TokinGame = {
  readonly version: number
  readonly seed: number
  readonly rngState: number
  readonly founder: string | null
  readonly year: number
  readonly clock: number
  readonly runSeconds: number
  readonly cash: number
  readonly rp: number
  readonly lifetimeTokens: number
  readonly runTokens: number
  readonly machines: Readonly<Record<string, number>>
  readonly models: readonly string[]
  readonly agents: readonly TokinAgent[]
  readonly nextAgentId: number
  readonly training: TokinTraining | null
  readonly research: readonly string[]
  readonly contractPick: string
  readonly logits: number
  readonly shop: Readonly<Record<string, number>>
  readonly story: readonly string[]
  readonly revealed: readonly string[]
  readonly log: readonly TokinLogLine[]
  readonly lastSavedAt: number
  readonly stats: TokinStats
}

// How this session takes part in the game.
// dormant: the player has not run /tokin in this session. No clock, no lock.
// ticker: this session holds the ticker lock and advances the game.
// viewer: another session holds the lock. This session draws read-only.
export type TokinRole = 'dormant' | 'ticker' | 'viewer'

// Pane-local values that are not part of the game state.
export type TokinPane = {
  // True while the Distill confirmation shows its payout.
  readonly confirmingDistill: boolean
  // The last refusal or host message, shown once in the pane.
  readonly notice: string | null
}

declare module 'claude-code' {
  interface PluginState {
    tokin: {
      // Null until /tokin loads the save in this session.
      game: TokinGame | null
      role: TokinRole
      pane: TokinPane
    }
  }
}
