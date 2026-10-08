// Plays the bot through two runs of a content pack and records when each
// milestone lands. Everything is deterministic for one seed.

import { apply } from '../core/actions'
import { nextDraw } from '../core/rng'
import { initialState } from '../core/state'
import { step } from '../core/step'
import type { Action, ContentPack, GameState } from '../core/types'
import { nextAction, type BotParams } from './bot'

export interface Milestones {
  readonly firstAgent: number | null
  readonly kin02: number | null
  readonly kin03: number | null
  readonly distillation: number | null
  // Seconds from the run start to kin-0.3 and Distillation both held.
  readonly ready: number | null
}

export interface SeedResult {
  readonly seed: number
  readonly run1: Milestones
  readonly run2: Milestones
  // Run seconds at the first Distill, or null when it never came.
  readonly firstDistill: number | null
  readonly logits: number
  // Logits that the first Distill paid.
  readonly earned: number
}

const EMPTY: Milestones = { firstAgent: null, kin02: null, kin03: null, distillation: null, ready: null }

// The most seconds one run may last before the bot gives up.
export const MAX_RUN_SECONDS = 6000
// The most actions the bot takes in one tick. A guard against a loop.
const MAX_ACTIONS_PER_TICK = 60
const TICK_SECONDS = 2

// Gives each seed its own press speed, so the 10 seeds are 10 different
// players and not one player 10 times.
export function paramsForSeed(base: BotParams, seed: number): BotParams {
  const draw = nextDraw(seed * 7919 + 1)
  return { ...base, pressesPerSec: base.pressesPerSec * (0.75 + 0.5 * draw.value) }
}

function observe(prev: Milestones, state: GameState): Milestones {
  const t = state.runSeconds
  const has = (id: string): boolean => state.models.includes(id)
  const set = (old: number | null, cond: boolean): number | null => (old === null && cond ? t : old)
  const kin02 = set(prev.kin02, has('kin-0.2'))
  const kin03 = set(prev.kin03, has('kin-0.3'))
  const distillation = set(prev.distillation, state.research.includes('distillation'))
  return {
    firstAgent: set(prev.firstAgent, state.nextAgentId > 1 || state.agents.length > 0),
    kin02,
    kin03,
    distillation,
    ready: set(prev.ready, kin03 !== null && distillation !== null && has('kin-0.3')),
  }
}

// Applies actions until the bot waits, and reads the milestones after each
// action, so a Distill in the same tick cannot hide an earlier milestone.
// The count guards against a loop.
function decide(state: GameState, miles: Milestones, content: ContentPack, p: BotParams): RunEnd {
  const act = (s: GameState, m: Milestones, n: number): RunEnd => {
    const action = n < MAX_ACTIONS_PER_TICK ? nextAction(s, content, p) : null
    if (action === null) return { state: s, miles: m }
    const next = apply(s, content, action)
    if (next === s) return { state: s, miles: m }
    return act(next, action.type === 'distill' ? m : observe(m, next), n + 1)
  }
  return act(state, miles, 0)
}

interface Tick {
  readonly state: GameState
  readonly carry: number
}

// Hand work: whole presses per tick, with the fraction carried over.
function press(state: GameState, content: ContentPack, p: BotParams, carry: number): Tick {
  if (state.agents.length >= p.handUntilAgents) return { state, carry: 0 }
  const total = carry + p.pressesPerSec * TICK_SECONDS
  const whole = Math.floor(total)
  const work: Action = { type: 'work' }
  const next = Array.from({ length: whole }).reduce<GameState>((s) => apply(s, content, work), state)
  return { state: next, carry: total - whole }
}

interface RunEnd {
  readonly state: GameState
  readonly miles: Milestones
}

// Plays until stop says so or the time limit passes.
function playRun(
  start: GameState,
  content: ContentPack,
  p: BotParams,
  stop: (s: GameState, m: Milestones) => boolean,
): RunEnd {
  const loop = (s: GameState, m: Milestones, carry: number): RunEnd => {
    if (stop(s, m) || s.runSeconds >= MAX_RUN_SECONDS) return { state: s, miles: m }
    const pressed = press(s, content, p, carry)
    const decided = decide(pressed.state, m, content, p)
    const stepped = step(decided.state, content, TICK_SECONDS)
    return loop(stepped, observe(decided.miles, stepped), pressed.carry)
  }
  return loop(start, observe(EMPTY, start), 0)
}

export function simulateSeed(seed: number, content: ContentPack, base: BotParams): SeedResult {
  const p = paramsForSeed(base, seed)
  const named = apply(initialState(seed, content), content, { type: 'nameFounder', name: 'Bot' })
  const first = playRun(named, content, p, (s) => s.stats.distills >= 1)
  const distilled = first.state.stats.distills >= 1
  const second = distilled
    ? playRun(first.state, content, p, (_s, m) => m.ready !== null)
    : { state: first.state, miles: EMPTY }
  return {
    seed,
    run1: first.miles,
    run2: second.miles,
    firstDistill: distilled ? first.state.stats.bestRunSeconds : null,
    logits: first.state.logits,
    earned: first.state.stats.logitsEarned,
  }
}
