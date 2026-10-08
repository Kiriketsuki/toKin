import { describe, expect, test } from 'bun:test'
import { apply, attempt } from './actions'
import { computeRates } from './economy'
import { FIXTURE } from './fixtures'
import { play, started, tick, withState } from './testkit'
import { trainingCost } from './training'
import { modsOf } from './economy'
import type { GameState } from './types'

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })
const ready = (n = 10, extra: Partial<GameState> = {}): GameState =>
  withState(started(), { machines: racks(n), research: ['training-harness'], ...extra })
const train = (flops: number, model = 'kin-0.2') => ({ type: 'startTraining', model, flops }) as const

describe('Training kin-0.2', () => {
  test('reserves compute at once', () => {
    const s = apply(ready(), FIXTURE, train(10))
    expect(computeRates(s, FIXTURE).free).toBe(0)
    expect(computeRates(s, FIXTURE).wasted).toBe(0)
    expect(s.training).toEqual({ model: 'kin-0.2', reservedFlops: 10, progress: 0 })
  })

  test('finishes after 200 seconds and frees the compute', () => {
    const s = apply(ready(), FIXTURE, train(10))
    const mid = tick(s, 199)
    expect(mid.models).not.toContain('kin-0.2')
    expect(mid.training?.progress).toBeCloseTo(1990, 6)
    const done = tick(mid, 1)
    expect(done.models).toEqual(['kin-0.1', 'kin-0.2'])
    expect(done.training).toBeNull()
    expect(computeRates(done, FIXTURE).free).toBe(10)
  })

  test('does not mutate the input state', () => {
    const s = apply(ready(), FIXTURE, train(10))
    const frozen = JSON.stringify(s)
    tick(s, 250)
    expect(JSON.stringify(s)).toBe(frozen)
  })

  test('a Train agent adds its footprint to the run', () => {
    const s = play(ready(), [{ type: 'createAgent', model: 'kin-0.1', job: 'train' }, train(9)])
    const idleBefore = computeRates(s, FIXTURE)
    expect(idleBefore.trainAgentFlops).toBe(1)
    expect(idleBefore.wasted).toBe(0)
    expect(tick(s, 1).training?.progress).toBe(10)
  })

  test('Gradient Checkpointing cuts the cost by 30%', () => {
    const s = withState(ready(), { research: ['training-harness', 'gradient-checkpointing'] })
    const kin2 = FIXTURE.models[1]!
    expect(trainingCost(kin2, modsOf(s, FIXTURE))).toBeCloseTo(1400, 9)
    const done = tick(apply(s, FIXTURE, train(10)), 140)
    expect(done.models).toContain('kin-0.2')
  })

  test('Curriculum speeds the run 20% per level', () => {
    const s = apply(ready(10, { shop: { curriculum: 2 } }), FIXTURE, train(10))
    expect(tick(s, 1).training?.progress).toBeCloseTo(14, 9)
    expect(tick(s, 143).models).toContain('kin-0.2')
    expect(tick(s, 142).models).not.toContain('kin-0.2')
  })

  test('progress accumulates linearly', () => {
    const s = apply(ready(), FIXTURE, train(10))
    const half = tick(s, 50).training?.progress
    expect(half).toBeCloseTo(500, 9)
  })
})

describe('startTraining refusals', () => {
  const refused = (s: GameState, flops: number, model = 'kin-0.2') => {
    const r = attempt(s, FIXTURE, train(flops, model))
    expect(r.state).toBe(s)
    return r.verdict
  }

  test('without Training Harness', () => {
    expect(refused(withState(ready(), { research: [] }), 10)).toEqual({ ok: false, reason: 'Training is locked' })
  })

  test('with too little free compute', () => {
    expect(refused(ready(5), 6)).toEqual({ ok: false, reason: 'not enough free compute: needs 6 kFLOP/s' })
  })

  test('while a run is active', () => {
    const s = apply(ready(), FIXTURE, train(4))
    expect(refused(s, 4)).toEqual({ ok: false, reason: 'a training run is active' })
  })

  test('for a model that is already unlocked', () => {
    expect(refused(ready(), 4, 'kin-0.1')).toEqual({ ok: false, reason: 'kin-0.1 is already done' })
  })

  test('for a model whose predecessor is missing', () => {
    expect(refused(ready(), 4, 'kin-0.3')).toEqual({ ok: false, reason: 'kin-0.3 is locked' })
  })

  test('for an unknown model and a bad amount', () => {
    expect(refused(ready(), 4, 'nope')).toEqual({ ok: false, reason: 'unknown id nope' })
    expect(refused(ready(), 0).ok).toBe(false)
    expect(refused(ready(), Number.NaN).ok).toBe(false)
  })
})
