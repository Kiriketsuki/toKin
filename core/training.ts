// Training: reserve compute for a run, advance it each step, and unlock the
// model when the work is done. One run goes at a time.

import { computeRates, EPSILON, findModel, modsOf, type Mods, type Rates } from './economy'
import { fmtNum } from './format'
import { OK, refuse, type Handlers } from './handler'
import type { ContentPack, GameState, ModelDef, Verdict } from './types'

// Work a model costs, in kFLOP·s. Gradient Checkpointing and similar
// research scale it. A model with no training cost reports 0.
export function trainingCost(model: ModelDef, mods: Mods): number {
  return model.acquire.kind === 'train' ? model.acquire.cost * mods.trainingCostMult : 0
}

// Work delivered per second: reserved compute plus the footprints of Train
// agents, scaled by the Curriculum shop level.
export function trainingRate(state: GameState, rates: Rates, mods: Mods): number {
  if (state.training === null) return 0
  return (state.training.reservedFlops + rates.trainAgentFlops) * mods.trainSpeedMult
}

// A model can train when it is a train model, it is not unlocked, and the
// model one tier below is unlocked.
export function isTrainable(state: GameState, content: ContentPack, model: ModelDef): boolean {
  if (model.acquire.kind !== 'train' || state.models.includes(model.id)) return false
  const below = content.models.find((m) => m.tier === model.tier - 1)
  return below !== undefined && state.models.includes(below.id)
}

function checkStart(state: GameState, content: ContentPack, modelId: string, flops: number): Verdict {
  const model = findModel(content, modelId)
  if (!model) return refuse(content, 'unknownId', { id: modelId })
  const mods = modsOf(state, content)
  if (!mods.unlockedJobs.has('train')) return refuse(content, 'locked', { name: 'Training' })
  if (state.models.includes(model.id)) return refuse(content, 'alreadyDone', { name: model.name })
  if (!isTrainable(state, content, model)) return refuse(content, 'locked', { name: model.name })
  if (state.training !== null) return refuse(content, 'trainingBusy')
  if (!Number.isFinite(flops) || flops <= 0) return refuse(content, 'notEnoughCompute', { need: fmtNum(Math.max(0, flops) || 0) })
  const free = computeRates(state, content, mods).free
  return flops > free + EPSILON ? refuse(content, 'notEnoughCompute', { need: fmtNum(flops) }) : OK
}

export const trainingHandlers: Handlers = {
  startTraining: {
    check: (state, content, action) => checkStart(state, content, action.model, action.flops),
    run: (state, _content, action) => ({
      ...state,
      training: { model: action.model, reservedFlops: action.flops, progress: 0 },
    }),
  },
}

// The step phase. It adds progress at the rate computed at the start of the
// step. When progress reaches the cost, the model unlocks and the run ends,
// which frees the reserved compute.
export function trainingPhase(state: GameState, content: ContentPack, dt: number, rates: Rates): GameState {
  const run = state.training
  if (run === null) return state
  const model = findModel(content, run.model)
  if (!model) return { ...state, training: null }
  const mods = modsOf(state, content)
  const progress = run.progress + trainingRate(state, rates, mods) * dt
  if (progress + EPSILON < trainingCost(model, mods)) return { ...state, training: { ...run, progress } }
  const models = content.models.map((m) => m.id).filter((id) => id === model.id || state.models.includes(id))
  return { ...state, training: null, models }
}
