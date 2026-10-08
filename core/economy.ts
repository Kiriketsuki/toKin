// Every game formula lives here, so a big-number type can replace plain
// doubles later. The functions are pure. They read the state and the content
// pack and never change either. The formulas follow docs/ARCHITECTURE.md.

import type {
  AgentState,
  ContentPack,
  ContractDef,
  ContractId,
  GameState,
  Job,
  MachineDef,
  MachineId,
  ModelDef,
  ResearchEffect,
  ShopDef,
} from './types'

// Compute comparisons tolerate float noise of this size.
export const EPSILON = 1e-9

// Rounds to the cent.
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function product(values: readonly number[]): number {
  return values.reduce((acc, value) => acc * value, 1)
}

function ofKind<K extends ResearchEffect['kind']>(
  effects: readonly ResearchEffect[],
  kind: K,
): readonly Extract<ResearchEffect, { kind: K }>[] {
  return effects.filter((e): e is Extract<ResearchEffect, { kind: K }> => e.kind === kind)
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function shopLevel(state: GameState, id: string): number {
  return state.shop[id] ?? 0
}

export function ownedMachines(state: GameState, id: MachineId): number {
  return state.machines[id] ?? 0
}

export function findModel(content: ContentPack, id: string): ModelDef | undefined {
  return content.models.find((m) => m.id === id)
}

export function findContract(content: ContentPack, id: string): ContractDef | undefined {
  return content.contracts.find((c) => c.id === id)
}

// ---------------------------------------------------------------------------
// Modifiers: what research, the shop, machines and Logits do right now
// ---------------------------------------------------------------------------

export interface QualityBoost {
  readonly value: number
  readonly minTier: number
}

export interface Mods {
  readonly tokMult: number
  readonly contextMult: number
  readonly machineCostMult: number
  readonly trainingCostMult: number
  readonly trainSpeedMult: number
  readonly qualityBoosts: readonly QualityBoost[]
  readonly hasBroker: boolean
  readonly canDistill: boolean
  readonly offlineCapSeconds: number
  // Machines that research unlocked. Start machines are not listed.
  readonly unlockedMachines: ReadonlySet<MachineId>
  readonly unlockedJobs: ReadonlySet<Job>
}

export function researchEffects(state: GameState, content: ContentPack): readonly ResearchEffect[] {
  return content.research.filter((r) => state.research.includes(r.id)).flatMap((r) => r.effects)
}

// The multiplier of every shop item whose effect has the given kind.
function shopMult(
  state: GameState,
  shop: readonly ShopDef[],
  kind: 'tokMultPerLevel' | 'contextMultPerLevel' | 'trainSpeedPerLevel',
): number {
  return product(
    shop.map((item) => {
      const effect = item.effect
      return effect.kind === kind ? 1 + effect.value * shopLevel(state, item.id) : 1
    }),
  )
}

// The Drum Cabinet style perk: context grows with the count owned.
function machineContextMult(state: GameState, content: ContentPack): number {
  return product(
    content.machines.flatMap((m) =>
      m.perks.map((perk) => 1 + perk.value * Math.min(ownedMachines(state, m.id), perk.maxUnits)),
    ),
  )
}

export function modsOf(state: GameState, content: ContentPack): Mods {
  const effects = researchEffects(state, content)
  const unspent = 1 + content.balance.unspentLogitBonus * state.logits
  const caps = ofKind(effects, 'offlineCap').map((e) => e.seconds)
  return {
    tokMult: product(ofKind(effects, 'tokMult').map((e) => e.value)) * shopMult(state, content.shop, 'tokMultPerLevel') * unspent,
    contextMult:
      product(ofKind(effects, 'contextMult').map((e) => e.value)) *
      shopMult(state, content.shop, 'contextMultPerLevel') *
      machineContextMult(state, content),
    machineCostMult: product(ofKind(effects, 'machineCostMult').map((e) => e.value)),
    trainingCostMult: product(ofKind(effects, 'trainingCostMult').map((e) => e.value)),
    trainSpeedMult: shopMult(state, content.shop, 'trainSpeedPerLevel'),
    qualityBoosts: ofKind(effects, 'qualityMult').map((e) => ({ value: e.value, minTier: e.minTier })),
    hasBroker: ofKind(effects, 'autoContract').length > 0,
    canDistill: ofKind(effects, 'unlockDistill').length > 0,
    offlineCapSeconds: Math.max(content.balance.offlineCapSeconds, ...caps),
    unlockedMachines: new Set(ofKind(effects, 'unlockMachine').map((e) => e.machine)),
    unlockedJobs: new Set<Job>(['earn', 'research', ...ofKind(effects, 'unlockJob').map((e) => e.job)]),
  }
}

// ---------------------------------------------------------------------------
// Machines and compute
// ---------------------------------------------------------------------------

export function isMachineUnlocked(def: MachineDef, mods: Mods): boolean {
  return def.startsUnlocked || mods.unlockedMachines.has(def.id)
}

// base * ratio^owned, with the research discount, rounded to the cent.
export function machineCost(def: MachineDef, owned: number, mods: Mods): number {
  return round2(def.baseCost * def.ratio ** owned * mods.machineCostMult)
}

export function totalCompute(state: GameState, content: ContentPack): number {
  return content.machines.reduce((sum, m) => sum + ownedMachines(state, m.id) * m.flops, 0)
}

// ---------------------------------------------------------------------------
// Models and agents
// ---------------------------------------------------------------------------

export interface ModelStats {
  readonly footprint: number
  readonly tokPerSec: number
  readonly quality: number
  readonly context: number
}

export function modelStats(model: ModelDef, mods: Mods): ModelStats {
  const boosts = mods.qualityBoosts.filter((b) => model.tier >= b.minTier).map((b) => b.value)
  return {
    footprint: model.footprint,
    tokPerSec: model.tokPerSec * mods.tokMult,
    quality: model.quality * product(boosts),
    context: model.context * mods.contextMult,
  }
}

// The contract an Earn agent works, or null when its context is too short.
// With Contract Broker the agent takes the best-paying contract it qualifies
// for. Without it, the agent works the picked contract.
export function chooseContract(
  content: ContentPack,
  mods: Mods,
  pick: ContractId,
  context: number,
): ContractDef | null {
  const fits = content.contracts.filter((c) => c.minContext <= context + EPSILON)
  if (mods.hasBroker) {
    return fits.reduce<ContractDef | null>((best, c) => (best === null || c.payPerToken > best.payPerToken ? c : best), null)
  }
  return fits.find((c) => c.id === pick) ?? null
}

export interface AgentRate {
  readonly id: string
  readonly job: Job
  readonly footprint: number
  // An idle agent holds compute but makes nothing, so that compute is wasted.
  readonly isIdle: boolean
  readonly contract: ContractId | null
  readonly tokPerSec: number
  readonly cashPerSec: number
  readonly rpPerSec: number
}

const NO_OUTPUT = { tokPerSec: 0, cashPerSec: 0, rpPerSec: 0 } as const

export function agentRate(state: GameState, content: ContentPack, mods: Mods, agent: AgentState): AgentRate {
  const model = findModel(content, agent.model)
  const base = { id: agent.id, job: agent.job, footprint: model?.footprint ?? 0, contract: null }
  if (!model) return { ...base, isIdle: true, ...NO_OUTPUT }
  const stats = modelStats(model, mods)
  if (agent.job === 'research') {
    const rpPerSec = stats.tokPerSec * stats.quality ** 2 * content.balance.researchRate
    return { ...base, isIdle: false, tokPerSec: stats.tokPerSec, cashPerSec: 0, rpPerSec }
  }
  if (agent.job === 'train') return { ...base, isIdle: state.training === null, ...NO_OUTPUT }
  const contract = chooseContract(content, mods, state.contractPick, stats.context)
  if (!contract) return { ...base, isIdle: true, ...NO_OUTPUT }
  const cashPerSec = stats.tokPerSec * contract.payPerToken * stats.quality
  return { ...base, isIdle: false, contract: contract.id, tokPerSec: stats.tokPerSec, cashPerSec, rpPerSec: 0 }
}

export interface Rates {
  // Compute numbers, all in kFLOP/s.
  readonly compute: number
  readonly used: number
  readonly free: number
  readonly wasted: number
  readonly tokPerSec: number
  readonly cashPerSec: number
  readonly rpPerSec: number
  // Footprints of Train agents while a run is active. Training adds it to the
  // reserved compute to get the run rate.
  readonly trainAgentFlops: number
  readonly agents: readonly AgentRate[]
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

export function computeRates(state: GameState, content: ContentPack, mods: Mods = modsOf(state, content)): Rates {
  const agents = state.agents.map((a) => agentRate(state, content, mods, a))
  const compute = totalCompute(state, content)
  const used = sum(agents.map((a) => a.footprint)) + (state.training?.reservedFlops ?? 0)
  const free = Math.max(0, compute - used)
  const idle = sum(agents.filter((a) => a.isIdle).map((a) => a.footprint))
  return {
    compute,
    used,
    free,
    wasted: free + idle,
    tokPerSec: sum(agents.map((a) => a.tokPerSec)),
    cashPerSec: sum(agents.map((a) => a.cashPerSec)),
    rpPerSec: sum(agents.map((a) => a.rpPerSec)),
    trainAgentFlops: sum(agents.filter((a) => a.job === 'train' && !a.isIdle).map((a) => a.footprint)),
    agents,
  }
}

// ---------------------------------------------------------------------------
// Hand work
// ---------------------------------------------------------------------------

// Cash for one press: tokens times the pay of the hand work contract.
// No multiplier applies to hand work.
export function handWorkCash(content: ContentPack): number {
  const contract = findContract(content, content.balance.handWorkContract)
  return content.balance.handWorkTokens * (contract?.payPerToken ?? 0)
}
