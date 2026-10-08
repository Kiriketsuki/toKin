// Distill: the prestige reset. The player trades the current run for Logits.
// The reset and keep rules follow docs/ARCHITECTURE.md.

import { modsOf } from './economy'
import { fill } from './format'
import { OK, refuse, type Handlers } from './handler'
import { applyWarmStart, keptModels, keptResearch } from './shop'
import { withLog } from './state'
import type { ContentPack, GameState, Verdict } from './types'

// Logits a Distill pays now: the formula total minus what earlier Distills
// paid, because lifetimeTokens spans every run.
export function distillPayout(state: GameState, content: ContentPack): number {
  const b = content.balance
  const total = Math.floor(b.distillK * Math.sqrt(state.lifetimeTokens / b.distillT0))
  return Math.max(0, total - state.stats.logitsEarned)
}

export interface DistillPreviewInfo {
  readonly unlocked: boolean
  readonly logits: number
  readonly canDistill: boolean
}

export function distillInfo(state: GameState, content: ContentPack): DistillPreviewInfo {
  const unlocked = modsOf(state, content).canDistill
  const logits = distillPayout(state, content)
  return { unlocked, logits, canDistill: unlocked && logits >= 1 }
}

function checkDistill(state: GameState, content: ContentPack): Verdict {
  const info = distillInfo(state, content)
  return info.canDistill ? OK : refuse(content, 'distillLocked')
}

// The research a Distill keeps: Old Notes items, and every item that
// unlocks Distill, so the player never has to re-learn the reset itself.
function survivingResearch(state: GameState, content: ContentPack): readonly string[] {
  const keep = new Set(keptResearch(state, content))
  content.research
    .filter((r) => r.effects.some((e) => e.kind === 'unlockDistill'))
    .forEach((r) => keep.add(r.id))
  return state.research.filter((id) => keep.has(id))
}

// The models a Distill keeps: start models plus Hand-me-down, content order.
function survivingModels(state: GameState, content: ContentPack): readonly string[] {
  const keep = new Set(keptModels(state, content))
  return content.models
    .filter((m) => m.acquire.kind === 'start' || (keep.has(m.id) && state.models.includes(m.id)))
    .map((m) => m.id)
}

export function distill(state: GameState, content: ContentPack): GameState {
  const payout = distillPayout(state, content)
  const best = state.stats.bestRunSeconds
  const reset: GameState = {
    ...state,
    cash: content.balance.startCash,
    rp: 0,
    runTokens: 0,
    runSeconds: 0,
    machines: Object.fromEntries(content.machines.map((m) => [m.id, 0])),
    models: survivingModels(state, content),
    agents: [],
    training: null,
    research: survivingResearch(state, content),
    contractPick: content.balance.handWorkContract,
    revealed: [],
    logits: state.logits + payout,
    stats: {
      ...state.stats,
      distills: state.stats.distills + 1,
      logitsEarned: state.stats.logitsEarned + payout,
      bestRunSeconds: best === null ? state.runSeconds : Math.min(best, state.runSeconds),
    },
  }
  const warmed = applyWarmStart(reset, content)
  return withLog(warmed, content, fill(content.text.distilled, { logits: payout }))
}

export const distillHandlers: Handlers = {
  distill: {
    check: (state, content) => checkDistill(state, content),
    run: (state, content) => distill(state, content),
  },
}
