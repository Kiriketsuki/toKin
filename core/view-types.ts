// The view model: what a host draws. A pure function of state and content
// builds it, so every host draws the same numbers. core/types.ts re-exports
// these types.

import type { Action, AgentId, ContractId, Job, LogLine, MachineId, ModelId, ResearchId, ShopId } from './types'

export interface ComputeView {
  readonly total: number
  // Held by agents and the training run.
  readonly used: number
  // Not held by anything. createAgent and startTraining draw on it.
  readonly free: number
  // Produces nothing this tick: free compute plus idle agents.
  readonly wasted: number
}

export interface HeaderView {
  readonly founder: string | null
  readonly year: number
  readonly cash: number
  readonly cashPerSec: number
  readonly compute: ComputeView
  readonly tokPerSec: number
  readonly rp: number
  readonly rpPerSec: number
  readonly logits: number
  // The tok/s fraction that unspent Logits add, such as 0.1 for +10%.
  readonly logitBonus: number
  readonly runSeconds: number
}

export type AgentOutput =
  | { readonly kind: 'cash'; readonly perSec: number; readonly contract: ContractId }
  | { readonly kind: 'rp'; readonly perSec: number }
  | { readonly kind: 'train'; readonly flops: number }
  | { readonly kind: 'idle'; readonly reason: string }

export interface AgentRow {
  readonly id: AgentId
  readonly name: string
  readonly model: ModelId
  readonly job: Job
  readonly tokPerSec: number
  readonly quality: number
  readonly context: number
  readonly output: AgentOutput
  readonly lifetimeTokens: number
}

export interface ContractRow {
  readonly id: ContractId
  readonly name: string
  readonly minContext: number
  readonly payPerToken: number
  readonly isPicked: boolean
  // True after Contract Broker, when agents pick contracts themselves.
  readonly isAuto: boolean
  // Earn agents that work this contract now.
  readonly agents: number
}

// A null secondsToAfford means the player cannot afford it at the current rate.
export interface MachineRow {
  readonly id: MachineId
  readonly name: string
  readonly owned: number
  readonly flops: number
  readonly cost: number
  readonly canAfford: boolean
  readonly secondsToAfford: number | null
  readonly isVisible: boolean
}

export interface ModelRow {
  readonly id: ModelId
  readonly name: string
  readonly footprint: number
  readonly tokPerSec: number
  readonly quality: number
  readonly context: number
  readonly isUnlocked: boolean
}

export type ResearchStatus = 'done' | 'available' | 'locked'

export interface ResearchRow {
  readonly id: ResearchId
  readonly name: string
  readonly description: string
  readonly cost: number
  readonly status: ResearchStatus
  readonly canAfford: boolean
  readonly secondsToAfford: number | null
  readonly isVisible: boolean
  readonly lockReason: string | null
}

export interface TrainingOption {
  readonly model: ModelId
  // kFLOP·s after cost multipliers.
  readonly cost: number
  // Seconds the run takes if it reserves all free compute. Null with none free.
  readonly secondsAtFree: number | null
}

export interface TrainingView {
  readonly isUnlocked: boolean
  readonly active: {
    readonly model: ModelId
    readonly reservedFlops: number
    readonly progress: number
    readonly cost: number
    readonly secondsLeft: number | null
  } | null
  readonly options: readonly TrainingOption[]
}

export interface ShopRow {
  readonly id: ShopId
  readonly name: string
  readonly description: string
  readonly level: number
  readonly maxLevel: number | null
  // Null at the max level.
  readonly cost: number | null
  readonly canAfford: boolean
}

// One control a host can draw. id is stable across redraws, so a host can
// key a button on it. A disabled option carries the reason.
export interface ActionOption {
  readonly id: string
  readonly label: string
  readonly action: Action
  readonly enabled: boolean
  readonly reason: string | null
}

export interface DistillPreview {
  readonly logits: number
  readonly canDistill: boolean
  readonly resets: readonly string[]
  readonly keeps: readonly string[]
}

export interface ViewModel {
  readonly needsFounder: boolean
  readonly computeUnit: string
  readonly header: HeaderView
  readonly agents: readonly AgentRow[]
  readonly contracts: readonly ContractRow[]
  readonly machines: readonly MachineRow[]
  readonly models: readonly ModelRow[]
  readonly research: readonly ResearchRow[]
  readonly training: TrainingView
  readonly shop: readonly ShopRow[]
  readonly log: readonly LogLine[]
  readonly actions: readonly ActionOption[]
  // Null while Distillation is not researched, so the control does not show.
  readonly distill: DistillPreview | null
}
