// The greedy player. nextAction looks at a state and returns the one action
// the bot takes next, or null when it waits. The bot reads the game only
// through core/ and content/, so it plays the same rules a host plays.

import { check } from '../core/actions'
import { holdsAll } from '../core/conditions'
import { distillPayout } from '../core/distill'
import {
  agentRate,
  computeRates,
  EPSILON,
  isMachineUnlocked,
  machineCost,
  modsOf,
  ownedMachines,
  type Mods,
  type Rates,
} from '../core/economy'
import { isTrainable, trainingCost } from '../core/training'
import type { Action, AgentState, ContentPack, ContractDef, GameState, Job, ModelDef } from '../core/types'

export interface BotParams {
  // Hand presses per second while the bot still works by hand.
  readonly pressesPerSec: number
  // The bot stops pressing once it runs this many agents.
  readonly handUntilAgents: number
  // The share of agent compute that the bot puts on Research.
  readonly researchShare: number
  // The same share before the bot owns kin-0.2. Early RP unlocks training.
  readonly earlyResearchShare: number
  // The run length in seconds that the bot aims for, by model tier.
  readonly trainSeconds: Readonly<Record<number, number>>
  // The highest model tier the bot trains.
  readonly maxTrainTier: number
  // The bot distills once the payout reaches this many Logits.
  readonly distillGain: number
  readonly researchOrder: readonly string[]
  readonly shopOrder: readonly string[]
}

// What one decision reads. nextAction builds it once, so the rules do not
// recompute the rates again and again.
interface Ctx {
  readonly state: GameState
  readonly content: ContentPack
  readonly p: BotParams
  readonly mods: Mods
  readonly rates: Rates
}

const EARN: Job = 'earn'
const RESEARCH: Job = 'research'

function footprintOf(c: Ctx, modelId: string): number {
  return c.content.models.find((m) => m.id === modelId)?.footprint ?? 0
}

function bestModel(c: Ctx, fits: (m: ModelDef) => boolean): ModelDef | null {
  return c.content.models
    .filter((m) => c.state.models.includes(m.id) && fits(m))
    .reduce<ModelDef | null>((best, m) => (best === null || m.tier > best.tier ? m : best), null)
}

// The model the bot wants to train next, or null when it wants none.
function trainTarget(c: Ctx): ModelDef | null {
  if (c.state.training !== null || !c.mods.unlockedJobs.has('train')) return null
  return c.content.models.find((m) => m.tier <= c.p.maxTrainTier && isTrainable(c.state, c.content, m)) ?? null
}

function shopAction(c: Ctx): Action | null {
  const order = c.p.shopOrder.map((item): Action => ({ type: 'buyShop', item }))
  return order.find((a) => check(c.state, c.content, a).ok) ?? null
}

// The first unfinished item whose gates hold. The bot waits for it, so it
// follows the fixed order and does not spend RP on a later item.
function researchAction(c: Ctx): Action | null {
  const next = c.p.researchOrder
    .map((id) => c.content.research.find((r) => r.id === id))
    .find((r) => r !== undefined && !c.state.research.includes(r.id) && holdsAll(r.requires, c.state, c.content, c.rates))
  if (!next || c.state.rp < next.cost) return null
  return { type: 'research', research: next.id }
}

// kFLOP/s the bot must reserve so the run of this model lasts its aim time.
function trainNeed(c: Ctx, target: ModelDef): number {
  return trainingCost(target, c.mods) / (c.p.trainSeconds[target.tier] ?? 300)
}

function trainAction(c: Ctx): Action | null {
  const target = trainTarget(c)
  if (!target || c.rates.free + EPSILON < trainNeed(c, target)) return null
  const action: Action = { type: 'startTraining', model: target.id, flops: c.rates.free }
  return check(c.state, c.content, action).ok ? action : null
}

// True while the bot holds back new agents so free compute can build up.
// It holds back only when the machines already cover the run it wants.
function isSaving(c: Ctx): boolean {
  const target = trainTarget(c)
  return target !== null && c.rates.compute + EPSILON >= trainNeed(c, target)
}

// Per kFLOP/s of footprint, what one agent of this model yields on a job.
function yieldPerFlop(c: Ctx, model: ModelDef, job: Job): number {
  const probe: AgentState = { id: 'probe', name: 'probe', model: model.id, job, lifetimeTokens: 0 }
  const rate = agentRate(c.state, c.content, c.mods, probe)
  return (job === RESEARCH ? rate.rpPerSec : rate.cashPerSec) / model.footprint
}

function agentFlops(c: Ctx, job: Job): number {
  return c.state.agents.filter((a) => a.job === job).reduce((sum, a) => sum + footprintOf(c, a.model), 0)
}

// Earn first, then keep Research near its share of agent compute.
function pickJob(c: Ctx): Job {
  const earn = agentFlops(c, EARN)
  const research = agentFlops(c, RESEARCH)
  if (earn === 0) return EARN
  const share = c.state.models.includes('kin-0.2') ? c.p.researchShare : c.p.earlyResearchShare
  return research / (earn + research) < share ? RESEARCH : EARN
}

function createAction(c: Ctx): Action | null {
  if (isSaving(c)) return null
  const model = bestModel(c, (m) => m.footprint <= c.rates.free + EPSILON)
  return model ? { type: 'createAgent', model: model.id, job: pickJob(c) } : null
}

// Replaces one agent with the best model when that model yields more per
// kFLOP/s and the freed compute is enough.
function upgradeAction(c: Ctx): Action | null {
  const best = bestModel(c, () => true)
  if (!best || isSaving(c)) return null
  const old = c.state.agents.find((a) => {
    const model = c.content.models.find((m) => m.id === a.model)
    if (!model || model.tier >= best.tier || best.footprint > c.rates.free + model.footprint + EPSILON) return false
    return yieldPerFlop(c, best, a.job) > yieldPerFlop(c, model, a.job)
  })
  return old ? { type: 'removeAgent', agent: old.id } : null
}

function bestPaying(list: readonly ContractDef[]): ContractDef | null {
  return list.reduce<ContractDef | null>((best, x) => (best === null || x.payPerToken > best.payPerToken ? x : best), null)
}

// The best-paying contract that no Earn agent is too short for.
function contractAction(c: Ctx): Action | null {
  if (c.mods.hasBroker) return null
  const contexts = c.state.agents
    .filter((a) => a.job === EARN)
    .flatMap((a) => {
      const model = c.content.models.find((m) => m.id === a.model)
      return model ? [model.context * c.mods.contextMult] : []
    })
  if (contexts.length === 0) return null
  const floor = Math.min(...contexts)
  const pick = bestPaying(c.content.contracts.filter((x) => x.minContext <= floor + EPSILON))
  return pick && pick.id !== c.state.contractPick ? { type: 'pickContract', contract: pick.id } : null
}

// The unlocked machine with the most compute per dollar, if the bot can pay.
function machineAction(c: Ctx): Action | null {
  const ranked = c.content.machines
    .filter((m) => isMachineUnlocked(m, c.mods))
    .map((m) => ({ m, cost: machineCost(m, ownedMachines(c.state, m.id), c.mods) }))
    .sort((a, b) => b.m.flops / b.cost - a.m.flops / a.cost)
  const top = ranked[0]
  return top && c.state.cash + EPSILON >= top.cost ? { type: 'buyMachine', machine: top.m.id } : null
}

function distillAction(c: Ctx): Action | null {
  const ready = c.mods.canDistill && distillPayout(c.state, c.content) >= c.p.distillGain
  return ready ? { type: 'distill' } : null
}

// Priority: Distill, shop, research, training, contract, upgrades, new
// agents, then machines. The first rule that gives an action wins.
export function nextAction(state: GameState, content: ContentPack, p: BotParams): Action | null {
  const mods = modsOf(state, content)
  const c: Ctx = { state, content, p, mods, rates: computeRates(state, content, mods) }
  return (
    distillAction(c) ??
    shopAction(c) ??
    researchAction(c) ??
    trainAction(c) ??
    contractAction(c) ??
    upgradeAction(c) ??
    createAction(c) ??
    machineAction(c)
  )
}
