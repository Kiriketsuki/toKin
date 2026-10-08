import { describe, expect, test } from 'bun:test'
import { foldEffects, NO_EFFECTS } from './effects'
import { modsOf, modelStats, machineCost } from './economy'
import { FIXTURE } from './fixtures'
import { started, withState } from './testkit'
import type { ResearchEffect } from './types'

describe('effect interpreter', () => {
  test('no effects give neutral totals', () => {
    expect(foldEffects([])).toEqual(NO_EFFECTS)
  })

  test('multiplier kinds stack by product', () => {
    const t = foldEffects([
      { kind: 'tokMult', value: 1.25 },
      { kind: 'tokMult', value: 2 },
      { kind: 'contextMult', value: 1.5 },
      { kind: 'machineCostMult', value: 0.85 },
      { kind: 'trainingCostMult', value: 0.7 },
    ])
    expect([t.tokMult, t.contextMult, t.machineCostMult, t.trainingCostMult]).toEqual([2.5, 1.5, 0.85, 0.7])
  })

  test('flag kinds switch on', () => {
    const t = foldEffects([{ kind: 'autoContract' }, { kind: 'unlockDistill' }])
    expect([t.hasBroker, t.canDistill]).toEqual([true, true])
  })

  test('unlock kinds collect ids', () => {
    const t = foldEffects([
      { kind: 'unlockMachine', machine: 'a' },
      { kind: 'unlockMachine', machine: 'b' },
      { kind: 'unlockJob', job: 'train' },
    ])
    expect([...t.unlockedMachines]).toEqual(['a', 'b'])
    expect([...t.unlockedJobs]).toEqual(['train'])
  })

  test('offlineCap keeps the largest value and qualityMult keeps every boost', () => {
    const t = foldEffects([
      { kind: 'offlineCap', seconds: 100 },
      { kind: 'offlineCap', seconds: 50 },
      { kind: 'qualityMult', value: 1.5, minTier: 3 },
    ])
    expect(t.offlineCapSeconds).toBe(100)
    expect(t.qualityBoosts).toEqual([{ value: 1.5, minTier: 3 }])
  })

  test('does not mutate earlier totals', () => {
    const before = foldEffects([{ kind: 'unlockJob', job: 'train' }])
    foldEffects([{ kind: 'unlockJob', job: 'train' }, { kind: 'unlockMachine', machine: 'x' }])
    expect([...before.unlockedJobs]).toEqual(['train'])
    expect(NO_EFFECTS.unlockedJobs.size).toBe(0)
  })

  test('new content works with no engine change', () => {
    const effects: readonly ResearchEffect[] = [{ kind: 'tokMult', value: 3 }]
    const content = {
      ...FIXTURE,
      research: [...FIXTURE.research, { id: 'extra', name: 'Extra', description: '', cost: 1, requires: [], effects }],
    }
    const s = withState(started(), { research: ['extra'] })
    expect(modelStats(content.models[0]!, modsOf(s, content)).tokPerSec).toBe(6)
    expect(machineCost(content.machines[0]!, 0, modsOf(s, content))).toBe(25)
  })
})
