// Row builders for the view model. Each function is a pure read of the state
// and the content pack. view.ts assembles the rows into a ViewModel.

import { holds } from './conditions'
import {
  EPSILON,
  findContract,
  isMachineUnlocked,
  machineCost,
  modelStats,
  modsOf,
  ownedMachines,
  type Mods,
  type Rates,
} from './economy'
import { fill, fmtNum } from './format'
import type {
  AgentOutput,
  AgentRow,
  Condition,
  ContentPack,
  ContractRow,
  DistillPreview,
  GameState,
  MachineRow,
  ModelRow,
  ResearchRow,
  ShopDef,
  ShopRow,
  TrainingOption,
  TrainingView,
} from './types'

// What every row builder reads.
export interface Ctx {
  readonly state: GameState
  readonly content: ContentPack
  readonly mods: Mods
  readonly rates: Rates
}

export function makeCtx(state: GameState, content: ContentPack, mods: Mods, rates: Rates): Ctx {
  return { state, content, mods, rates }
}

// Seconds until held reaches cost at rate. 0 when affordable, null when the
// rate is zero.
export function secondsToAfford(cost: number, held: number, rate: number): number | null {
  if (held + EPSILON >= cost) return 0
  return rate > 0 ? (cost - held) / rate : null
}

const nameOf = (content: ContentPack, id: string): string =>
  content.machines.find((m) => m.id === id)?.name ??
  content.research.find((r) => r.id === id)?.name ??
  content.models.find((m) => m.id === id)?.name ??
  id

// A short phrase for a condition that does not hold yet.
export function describeCondition(cond: Condition, content: ContentPack): string {
  switch (cond.kind) {
    case 'stat':
      return `needs ${cond.stat} ${fmtNum(cond.gte)}`
    case 'machine':
      return `needs ${cond.gte} ${nameOf(content, cond.machine)}`
    case 'agents':
      return `needs ${cond.gte} ${cond.job ?? ''} agents`.replace('  ', ' ')
    case 'research':
      return `needs ${nameOf(content, cond.research)}`
    case 'model':
      return `needs ${nameOf(content, cond.model)}`
    case 'all':
    case 'any':
      return cond.of.map((c) => describeCondition(c, content)).join(cond.kind === 'all' ? ' and ' : ' or ')
  }
}

// ---------------------------------------------------------------------------
// Reveal: an item shows once the player holds a fraction of its cost
// ---------------------------------------------------------------------------

const heldEnough = (state: GameState, content: ContentPack, id: string, held: number, cost: number): boolean =>
  state.revealed.includes(id) || held + EPSILON >= cost * content.balance.revealFraction

export function machineRows(ctx: Ctx): readonly MachineRow[] {
  const { state, content, mods, rates } = ctx
  return content.machines.map((def) => {
    const owned = ownedMachines(state, def.id)
    const cost = machineCost(def, owned, mods)
    const unlocked = isMachineUnlocked(def, mods)
    return {
      id: def.id,
      name: def.name,
      owned,
      flops: def.flops,
      cost,
      canAfford: state.cash + EPSILON >= cost,
      secondsToAfford: secondsToAfford(cost, state.cash, rates.cashPerSec),
      isVisible: def.startsUnlocked || (unlocked && heldEnough(state, content, def.id, state.cash, cost)),
    }
  })
}

export function researchRows(ctx: Ctx): readonly ResearchRow[] {
  const { state, content, rates } = ctx
  return content.research.map((def) => {
    const done = state.research.includes(def.id)
    const unmet = def.requires.filter((c) => !holds(c, state, content, rates))
    const status = done ? 'done' : unmet.length === 0 ? 'available' : 'locked'
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      cost: def.cost,
      status,
      canAfford: status === 'available' && state.rp + EPSILON >= def.cost,
      secondsToAfford: done ? 0 : secondsToAfford(def.cost, state.rp, rates.rpPerSec),
      isVisible: done || (status === 'available' && heldEnough(state, content, def.id, state.rp, def.cost)),
      lockReason: unmet[0] ? describeCondition(unmet[0], content) : null,
    }
  })
}

// Ids that show now and are not in state.revealed yet. The host stores them
// so an item stays visible after the player spends below the threshold.
export function newlyRevealed(ctx: Ctx): readonly string[] {
  const shown = [...machineRows(ctx), ...researchRows(ctx)].filter((r) => r.isVisible).map((r) => r.id)
  return shown.filter((id) => !ctx.state.revealed.includes(id))
}

// ---------------------------------------------------------------------------
// Agents, contracts, models
// ---------------------------------------------------------------------------

function idleReason(ctx: Ctx, job: string): string {
  const { state, content } = ctx
  if (job === 'train') return 'no training run'
  const pick = findContract(content, state.contractPick)
  const need = ctx.mods.hasBroker ? Math.min(...content.contracts.map((c) => c.minContext)) : (pick?.minContext ?? 0)
  return fill(content.text.contextTooShort, { need: fmtNum(need) })
}

export function agentRows(ctx: Ctx): readonly AgentRow[] {
  const { state, content, mods, rates } = ctx
  return state.agents.flatMap((agent) => {
    const rate = rates.agents.find((r) => r.id === agent.id)
    const model = content.models.find((m) => m.id === agent.model)
    if (!rate || !model) return []
    const stats = modelStats(model, mods)
    const output: AgentOutput = rate.isIdle
      ? { kind: 'idle', reason: idleReason(ctx, agent.job) }
      : agent.job === 'train'
        ? { kind: 'train', flops: rate.footprint }
        : agent.job === 'research'
          ? { kind: 'rp', perSec: rate.rpPerSec }
          : { kind: 'cash', perSec: rate.cashPerSec, contract: rate.contract ?? '' }
    return [
      {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        job: agent.job,
        tokPerSec: rate.tokPerSec,
        quality: stats.quality,
        context: stats.context,
        output,
        lifetimeTokens: agent.lifetimeTokens,
      },
    ]
  })
}

export function contractRows(ctx: Ctx): readonly ContractRow[] {
  const { state, content, mods, rates } = ctx
  return content.contracts.map((def) => ({
    id: def.id,
    name: def.name,
    minContext: def.minContext,
    payPerToken: def.payPerToken,
    isPicked: state.contractPick === def.id,
    isAuto: mods.hasBroker,
    agents: rates.agents.filter((a) => a.contract === def.id).length,
  }))
}

export function modelRows(ctx: Ctx): readonly ModelRow[] {
  const { state, content, mods } = ctx
  return content.models.map((def) => {
    const stats = modelStats(def, mods)
    return {
      id: def.id,
      name: def.name,
      footprint: stats.footprint,
      tokPerSec: stats.tokPerSec,
      quality: stats.quality,
      context: stats.context,
      isUnlocked: state.models.includes(def.id),
    }
  })
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

// Models a run can target: a train model, not yet unlocked, one tier above
// an unlocked model.
export function trainableModels(ctx: Ctx): readonly TrainingOption[] {
  const { state, content, mods, rates } = ctx
  const speed = mods.trainSpeedMult
  const rate = (rates.free + rates.trainAgentFlops) * speed
  return content.models.flatMap((def) => {
    if (def.acquire.kind !== 'train' || state.models.includes(def.id)) return []
    const below = content.models.find((m) => m.tier === def.tier - 1)
    if (!below || !state.models.includes(below.id)) return []
    const cost = def.acquire.cost * mods.trainingCostMult
    return [{ model: def.id, cost, secondsAtFree: rate > 0 ? cost / rate : null }]
  })
}

export function trainingView(ctx: Ctx): TrainingView {
  const { state, content, mods, rates } = ctx
  const run = state.training
  const def = run ? content.models.find((m) => m.id === run.model) : undefined
  const cost = def && def.acquire.kind === 'train' ? def.acquire.cost * mods.trainingCostMult : 0
  const rate = run ? (run.reservedFlops + rates.trainAgentFlops) * mods.trainSpeedMult : 0
  return {
    isUnlocked: mods.unlockedJobs.has('train'),
    active: run
      ? {
          model: run.model,
          reservedFlops: run.reservedFlops,
          progress: run.progress,
          cost,
          secondsLeft: rate > 0 ? Math.max(0, cost - run.progress) / rate : null,
        }
      : null,
    options: mods.unlockedJobs.has('train') ? trainableModels(ctx) : [],
  }
}

// ---------------------------------------------------------------------------
// Shop and Distill
// ---------------------------------------------------------------------------

// The Logits price of the next level, or null at the max level.
export function shopCost(def: ShopDef, level: number): number | null {
  const limit = def.cost.kind === 'table' ? def.cost.values.length : Infinity
  if (level >= Math.min(limit, def.maxLevel ?? Infinity)) return null
  return def.cost.kind === 'table' ? (def.cost.values[level] ?? null) : Math.ceil(def.cost.base * def.cost.ratio ** level)
}

export function shopRows(ctx: Ctx): readonly ShopRow[] {
  const { state, content } = ctx
  return content.shop.map((def) => {
    const level = state.shop[def.id] ?? 0
    const cost = shopCost(def, level)
    const limit = def.cost.kind === 'table' ? def.cost.values.length : null
    const maxLevel = def.maxLevel === null ? limit : limit === null ? def.maxLevel : Math.min(limit, def.maxLevel)
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      level,
      maxLevel,
      cost,
      canAfford: cost !== null && state.logits >= cost,
    }
  })
}

// Logits a Distill pays now: the formula total minus what earlier Distills paid.
export function distillPayout(state: GameState, content: ContentPack): number {
  const b = content.balance
  const total = Math.floor(b.distillK * Math.sqrt(state.lifetimeTokens / b.distillT0))
  return Math.max(0, total - state.stats.logitsEarned)
}

const RESETS = ['cash', 'RP', 'machines', 'agents', 'training', 'research', 'models above the start models', 'contract pick']
const KEEPS = ['Logits', 'shop levels', 'story beats', 'lifetime tokens', 'stats', 'the founder']

export function distillPreview(ctx: Ctx): DistillPreview | null {
  if (!ctx.mods.canDistill) return null
  const logits = distillPayout(ctx.state, ctx.content)
  return { logits, canDistill: logits >= 1, resets: RESETS, keeps: KEEPS }
}
