import { describe, expect, test } from 'bun:test'

import { ERA1 } from '../content/era1'
import { apply } from '../core/actions'
import { initialState } from '../core/state'
import { BOT, failures, speedup, table, TARGETS } from './balance'
import { nextAction } from './bot'
import { paramsForSeed, simulateSeed, type Milestones, type SeedResult } from './runner'

const run = (over: Partial<Milestones>): Milestones => ({
  firstAgent: 30,
  kin02: 500,
  kin03: 1800,
  distillation: 1900,
  ready: 1900,
  ...over,
})

const result = (over: Partial<SeedResult> = {}): SeedResult => ({
  seed: 1,
  run1: run({}),
  run2: run({ ready: 800 }),
  firstDistill: 1900,
  logits: 0,
  earned: 40,
  ...over,
})

describe('target checks', () => {
  test('pass a result that meets every target', () => {
    expect(failures(result())).toEqual([])
  })

  test('name each missed target', () => {
    const bad = result({
      run1: run({ firstAgent: TARGETS.firstAgentBefore, kin02: 700, distillation: 100 }),
      run2: run({ ready: 1500 }),
      firstDistill: null,
    })
    expect(failures(bad)).toEqual(['first agent', 'kin-0.2', 'distillation', 'first distill', 'run 2 speedup'])
  })

  test('count a run 2 time of zero as a large speedup', () => {
    expect(speedup(result({ run2: run({ ready: 0 }) }))).toBe(1900)
    expect(speedup(result({ run2: run({ ready: null }) }))).toBe(0)
  })

  test('print one table row per result', () => {
    expect(table([result(), result({ seed: 2 })]).split('\n')).toHaveLength(4)
  })
})

describe('the bot', () => {
  test('gives each seed its own press speed and keeps the rest', () => {
    const a = paramsForSeed(BOT, 1)
    const b = paramsForSeed(BOT, 2)
    expect(a.pressesPerSec).not.toBe(b.pressesPerSec)
    expect({ ...a, pressesPerSec: 0 }).toEqual({ ...b, pressesPerSec: 0 })
  })

  test('waits when it has no cash and no compute', () => {
    const state = apply(initialState(1, ERA1), ERA1, { type: 'nameFounder', name: 'Bot' })
    expect(nextAction(state, ERA1, BOT)).toBeNull()
  })

  test('buys the first Relay Rack once it can pay', () => {
    const named = apply(initialState(1, ERA1), ERA1, { type: 'nameFounder', name: 'Bot' })
    const rich = { ...named, cash: 25 }
    expect(nextAction(rich, ERA1, BOT)).toEqual({ type: 'buyMachine', machine: 'relay-rack' })
  })
})

describe('the Era 1 pacing', () => {
  test('meets every target on one seed', () => {
    expect(failures(simulateSeed(3, ERA1, BOT))).toEqual([])
  }, 120000)
})
