// The shared contract of the toKin core: the game state, the actions a host
// dispatches, the content tables, and the view model a host draws.
// Every type here is plain JSON data. Content holds no functions, so a port
// in another language can load the same tables from an exported JSON file.
// Effects and triggers are tagged unions, such as { kind: 'tokMult', value: 1.25 }.
// Units: compute is in kFLOP/s, training work in kFLOP·s, time in seconds.

// The GameState shape version. save.ts migrates older saves up to it.
export const STATE_VERSION = 1

// Ids are content keys. Content packs own them, so later eras add ids
// without a change to the core types.
export type MachineId = string
export type ModelId = string
export type ContractId = string
export type ResearchId = string
export type ShopId = string
export type StoryId = string
export type AgentId = string

export type Job = 'earn' | 'research' | 'train'

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface AgentState {
  readonly id: AgentId
  readonly name: string
  readonly model: ModelId
  readonly job: Job
  readonly lifetimeTokens: number
}

export interface TrainingState {
  readonly model: ModelId
  // Compute the run holds, in kFLOP/s. It is not free until the run ends.
  readonly reservedFlops: number
  // Work delivered so far, in kFLOP·s.
  readonly progress: number
}

// One log line. t is GameState.clock when the line was written.
export interface LogLine {
  readonly t: number
  readonly text: string
}

export interface Stats {
  readonly distills: number
  // The shortest run that ended in a Distill, in seconds. Null before one.
  readonly bestRunSeconds: number | null
  readonly workPresses: number
  // All Logits that Distill has paid out, spent or not.
  readonly logitsEarned: number
}

export interface GameState {
  readonly version: number
  readonly seed: number
  // The mulberry32 state. rng.ts advances it. Nothing else draws randomness.
  readonly rngState: number
  // Null until the player names the founder.
  readonly founder: string | null
  readonly year: number
  // Seconds simulated across all runs. Log lines carry it.
  readonly clock: number
  // Seconds simulated in the current run. Distill sets it to 0.
  readonly runSeconds: number
  readonly cash: number
  readonly rp: number
  // Tokens made across all runs. Distill keeps it.
  readonly lifetimeTokens: number
  // Tokens made in the current run. Distill sets it to 0.
  readonly runTokens: number
  readonly machines: Readonly<Record<MachineId, number>>
  // Unlocked models, in content order.
  readonly models: readonly ModelId[]
  readonly agents: readonly AgentState[]
  // The counter for new agent ids. It never goes down.
  readonly nextAgentId: number
  readonly training: TrainingState | null
  // Researched items.
  readonly research: readonly ResearchId[]
  // The contract Earn agents work before Contract Broker.
  readonly contractPick: ContractId
  // Unspent Logits.
  readonly logits: number
  // Shop item levels. A missing key is level 0.
  readonly shop: Readonly<Record<ShopId, number>>
  // Fired story beats. A beat fires once per save.
  readonly story: readonly StoryId[]
  // Machine and research ids that the half-cost rule has revealed.
  readonly revealed: readonly string[]
  // The last BalanceDef.logLimit lines, oldest first.
  readonly log: readonly LogLine[]
  // Epoch milliseconds of the last save. The host writes it at save time.
  readonly lastSavedAt: number
  readonly stats: Stats
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { readonly type: 'nameFounder'; readonly name: string }
  | { readonly type: 'work' }
  | { readonly type: 'buyMachine'; readonly machine: MachineId }
  | { readonly type: 'createAgent'; readonly model: ModelId; readonly job: Job }
  | { readonly type: 'assignAgent'; readonly agent: AgentId; readonly job: Job }
  | { readonly type: 'removeAgent'; readonly agent: AgentId }
  | { readonly type: 'startTraining'; readonly model: ModelId; readonly flops: number }
  | { readonly type: 'research'; readonly research: ResearchId }
  | { readonly type: 'pickContract'; readonly contract: ContractId }
  | { readonly type: 'distill' }
  | { readonly type: 'buyShop'; readonly item: ShopId }

export type ActionType = Action['type']

// The answer to "can this action run now". reason is player-facing text.
export type Verdict = { readonly ok: true } | { readonly ok: false; readonly reason: string }

// ---------------------------------------------------------------------------
// Content: conditions and effects
// ---------------------------------------------------------------------------

// Numbers a condition can compare. Rates are per second.
export type StatKey =
  | 'cash'
  | 'cashPerSec'
  | 'rp'
  | 'lifetimeTokens'
  | 'runTokens'
  | 'tokPerSec'
  | 'compute'
  | 'wasted'
  | 'logits'
  | 'distills'
  | 'workPresses'

// A declarative test on the state. Story triggers and research gates use it.
export type Condition =
  | { readonly kind: 'stat'; readonly stat: StatKey; readonly gte: number }
  | { readonly kind: 'machine'; readonly machine: MachineId; readonly gte: number }
  | { readonly kind: 'agents'; readonly job?: Job; readonly gte: number }
  | { readonly kind: 'research'; readonly research: ResearchId }
  | { readonly kind: 'model'; readonly model: ModelId }
  | { readonly kind: 'all'; readonly of: readonly Condition[] }
  | { readonly kind: 'any'; readonly of: readonly Condition[] }

// What a research item does once researched. Multipliers stack by product.
export type ResearchEffect =
  | { readonly kind: 'unlockMachine'; readonly machine: MachineId }
  | { readonly kind: 'unlockJob'; readonly job: Job }
  | { readonly kind: 'unlockDistill' }
  | { readonly kind: 'autoContract' }
  | { readonly kind: 'tokMult'; readonly value: number }
  | { readonly kind: 'contextMult'; readonly value: number }
  // Applies to models whose tier is at least minTier.
  | { readonly kind: 'qualityMult'; readonly value: number; readonly minTier: number }
  | { readonly kind: 'machineCostMult'; readonly value: number }
  | { readonly kind: 'trainingCostMult'; readonly value: number }
  | { readonly kind: 'offlineCap'; readonly seconds: number }

// What a shop item does at a level. PerLevel effects give 1 + value * level.
export type ShopEffect =
  | { readonly kind: 'startMachines'; readonly machine: MachineId; readonly perLevel: readonly number[] }
  | { readonly kind: 'tokMultPerLevel'; readonly value: number }
  | { readonly kind: 'contextMultPerLevel'; readonly value: number }
  | { readonly kind: 'trainSpeedPerLevel'; readonly value: number }
  | { readonly kind: 'keepModels'; readonly perLevel: readonly (readonly ModelId[])[] }
  | { readonly kind: 'keepResearch'; readonly research: readonly ResearchId[] }

// A Logits price by level. A table lists each level's price and also sets
// the max level. A geometric curve costs ceil(base * ratio ^ level).
export type CostCurve =
  | { readonly kind: 'table'; readonly values: readonly number[] }
  | { readonly kind: 'geometric'; readonly base: number; readonly ratio: number }

// A machine perk that grows with the count owned, up to maxUnits.
export type MachinePerk = { readonly kind: 'contextPerUnit'; readonly value: number; readonly maxUnits: number }

// How a model becomes available. 'start' models are kept by every Distill.
export type ModelAcquire = { readonly kind: 'start' } | { readonly kind: 'train'; readonly cost: number }

// ---------------------------------------------------------------------------
// Content: tables
// ---------------------------------------------------------------------------

export interface MachineDef {
  readonly id: MachineId
  readonly name: string
  readonly baseCost: number
  readonly ratio: number
  // kFLOP/s per unit.
  readonly flops: number
  // True when the machine is buyable from the start of a run.
  readonly startsUnlocked: boolean
  readonly perks: readonly MachinePerk[]
}

export interface ModelDef {
  readonly id: ModelId
  readonly name: string
  // Order of the model in its line, from 1. Effects gate on it.
  readonly tier: number
  // kFLOP/s an agent on this model holds.
  readonly footprint: number
  readonly tokPerSec: number
  readonly quality: number
  readonly context: number
  readonly acquire: ModelAcquire
}

export interface ContractDef {
  readonly id: ContractId
  readonly name: string
  readonly minContext: number
  readonly payPerToken: number
}

export interface ResearchDef {
  readonly id: ResearchId
  readonly name: string
  readonly description: string
  // RP.
  readonly cost: number
  // Every condition must hold before the item can be researched.
  readonly requires: readonly Condition[]
  readonly effects: readonly ResearchEffect[]
}

export interface ShopDef {
  readonly id: ShopId
  readonly name: string
  readonly description: string
  // Null means no limit. A table cost sets its own limit.
  readonly maxLevel: number | null
  readonly cost: CostCurve
  readonly effect: ShopEffect
}

export interface StoryBeatDef {
  readonly id: StoryId
  // Terse, lowercase, second person.
  readonly text: string
  readonly trigger: Condition
  // When set, the beat moves GameState.year forward to this year.
  readonly year?: number
}

export interface NamePool {
  readonly first: readonly string[]
  readonly last: readonly string[]
}

// Tunable numbers. The balance bot in sim/ adjusts these.
export interface BalanceDef {
  readonly startYear: number
  readonly startCash: number
  readonly handWorkTokens: number
  readonly handWorkContract: ContractId
  // RP per second = tok/s * quality^2 * researchRate.
  readonly researchRate: number
  // Each unspent Logit adds this fraction to tok/s.
  readonly unspentLogitBonus: number
  readonly distillK: number
  readonly distillT0: number
  readonly offlineCapSeconds: number
  // The largest step the offline catch-up takes at once.
  readonly catchUpChunkSeconds: number
  readonly logLimit: number
  // An item shows once the player holds this fraction of its cost.
  readonly revealFraction: number
}

// Player-facing fixed lines. Templates use {name} placeholders.
export type TextKey =
  | 'offlineReturn'
  | 'offlineSummary'
  | 'founderNamed'
  | 'needsFounder'
  | 'notEnoughCash'
  | 'notEnoughRp'
  | 'notEnoughLogits'
  | 'notEnoughCompute'
  | 'locked'
  | 'unknownId'
  | 'contextTooShort'
  | 'trainingBusy'
  | 'alreadyDone'
  | 'maxLevel'
  | 'distillLocked'
  | 'distilled'

export interface ContentPack {
  readonly id: string
  readonly name: string
  // The unit label for compute in this pack, such as 'kFLOP/s'.
  readonly computeUnit: string
  readonly balance: BalanceDef
  readonly text: Readonly<Record<TextKey, string>>
  readonly machines: readonly MachineDef[]
  readonly models: readonly ModelDef[]
  readonly contracts: readonly ContractDef[]
  readonly research: readonly ResearchDef[]
  readonly shop: readonly ShopDef[]
  readonly story: readonly StoryBeatDef[]
  readonly names: NamePool
}

// The view model types live in their own file. Hosts import them from here.
export type * from './view-types'
