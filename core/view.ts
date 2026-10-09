// The view model builder. buildView is a pure function of the state and the
// content pack. A host draws the result and holds no game rule of its own.
// It formats numbers with core/format.ts.

import { check } from './actions'
import { computeRates, handWorkCash, modsOf, type Mods } from './economy'
import { fmtDollars, fmtNum } from './format'
import {
  agentRows,
  contractRows,
  distillPreview,
  machineRows,
  makeCtx,
  modelRows,
  researchRows,
  shopRows,
  trainingView,
  type Ctx,
} from './view-rows'
import type { Action, ActionOption, ContentPack, GameState, HeaderView, Job, ViewModel } from './types'

// The number of log lines a view carries.
export const VIEW_LOG_LINES = 12

const JOB_LABEL: Readonly<Record<Job, string>> = { earn: 'Earn', research: 'Research', train: 'Train' }

function header(ctx: Ctx): HeaderView {
  const { state, content, rates } = ctx
  return {
    founder: state.founder,
    year: state.year,
    cash: state.cash,
    cashPerSec: rates.cashPerSec,
    compute: { total: rates.compute, used: rates.used, free: rates.free, wasted: rates.wasted },
    tokPerSec: rates.tokPerSec,
    rp: state.rp,
    rpPerSec: rates.rpPerSec,
    logits: state.logits,
    logitBonus: content.balance.unspentLogitBonus * state.logits,
    runSeconds: state.runSeconds,
  }
}

// One control. The verdict from check sets enabled and reason.
function option(ctx: Ctx, id: string, label: string, action: Action): ActionOption {
  const verdict = check(ctx.state, ctx.content, action)
  return { id, label, action, enabled: verdict.ok, reason: verdict.ok ? null : verdict.reason }
}

function jobsOf(mods: Mods): readonly Job[] {
  return (['earn', 'research', 'train'] as const).filter((j) => mods.unlockedJobs.has(j))
}

function agentOptions(ctx: Ctx): readonly ActionOption[] {
  const { state, content, mods } = ctx
  const jobs = jobsOf(mods)
  const create = content.models
    .filter((m) => state.models.includes(m.id))
    .flatMap((m) =>
      jobs.map((job) => option(ctx, `create:${m.id}:${job}`, `New ${m.name} agent: ${JOB_LABEL[job]}`, { type: 'createAgent', model: m.id, job })),
    )
  const manage = state.agents.flatMap((a) => [
    ...jobs
      .filter((job) => job !== a.job)
      .map((job) => option(ctx, `assign:${a.id}:${job}`, `${a.name} to ${JOB_LABEL[job]}`, { type: 'assignAgent', agent: a.id, job })),
    option(ctx, `remove:${a.id}`, `Remove ${a.name}`, { type: 'removeAgent', agent: a.id }),
  ])
  return [...create, ...manage]
}

function economyOptions(ctx: Ctx): readonly ActionOption[] {
  const { content } = ctx
  const work = option(ctx, 'work', `Work by hand (+${fmtDollars(handWorkCash(content))})`, { type: 'work' })
  const buys = machineRows(ctx)
    .filter((m) => m.isVisible)
    .map((m) => option(ctx, `buy:${m.id}`, `Buy ${m.name} (${fmtDollars(m.cost)})`, { type: 'buyMachine', machine: m.id }))
  const picks = ctx.mods.hasBroker
    ? []
    : content.contracts.map((c) => option(ctx, `pick:${c.id}`, `Work ${c.name}`, { type: 'pickContract', contract: c.id }))
  return [work, ...buys, ...picks]
}

function progressOptions(ctx: Ctx, view: Pick<ViewModel, 'research' | 'training' | 'shop' | 'distill'>): readonly ActionOption[] {
  const research = view.research
    .filter((r) => r.isVisible && r.status === 'available')
    .map((r) => option(ctx, `research:${r.id}`, `Research ${r.name} (${fmtNum(r.cost)} RP)`, { type: 'research', research: r.id }))
  // The player chooses how much compute a run reserves: all free compute, or half of it.
  const half = Math.floor(ctx.rates.free / 2)
  const train = view.training.options.flatMap((t) => [
    option(ctx, `train:${t.model}`, `Train ${t.model} (${fmtNum(t.cost)} kFLOP-s)`, { type: 'startTraining', model: t.model, flops: ctx.rates.free }),
    ...(half >= 1
      ? [option(ctx, `train:${t.model}:half`, `Train ${t.model} on half (${fmtNum(half)} kFLOP/s)`, { type: 'startTraining', model: t.model, flops: half })]
      : []),
  ])
  const shop = view.shop
    .filter((s) => s.cost !== null)
    .map((s) => option(ctx, `shop:${s.id}`, `${s.name} (${fmtNum(s.cost ?? 0)} Logits)`, { type: 'buyShop', item: s.id }))
  const distill = view.distill ? [option(ctx, 'distill', `Distill (+${view.distill.logits} Logits)`, { type: 'distill' })] : []
  return [...research, ...train, ...shop, ...distill]
}

// Builds the view model. nowMs is accepted so a host can pass its clock, but
// the view never reads it: the same state always gives the same view.
export function buildView(state: GameState, content: ContentPack, _nowMs?: number): ViewModel {
  const mods = modsOf(state, content)
  const ctx = makeCtx(state, content, mods, computeRates(state, content, mods))
  const parts = {
    research: researchRows(ctx),
    training: trainingView(ctx),
    shop: shopRows(ctx),
    distill: distillPreview(ctx),
  }
  const needsFounder = state.founder === null
  return {
    needsFounder,
    computeUnit: content.computeUnit,
    header: header(ctx),
    agents: agentRows(ctx),
    contracts: contractRows(ctx),
    machines: machineRows(ctx),
    models: modelRows(ctx),
    ...parts,
    log: state.log.slice(-VIEW_LOG_LINES),
    // Before the founder is named, the only control is the name prompt.
    actions: needsFounder ? [] : [...economyOptions(ctx), ...agentOptions(ctx), ...progressOptions(ctx, parts)],
    distill: parts.distill,
  }
}
