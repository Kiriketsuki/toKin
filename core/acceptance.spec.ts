// The Acceptance Scenarios of docs/specs/todo/tokin-build-1-spec.md, one test
// per Gherkin scenario, named as the spec names it. The fixture keeps the
// spec's start numbers, so the figures here match the scenario text. The
// host-only scenarios (a dormant session, /tokin stop, a second session) live
// in hooks/persistence.test.tsx and hooks/register.test.tsx.

import { describe, expect, test } from 'bun:test'

import { ERA1 } from '../content/era1'
import { apply, attempt } from './actions'
import { distillPayout } from './distill'
import { chooseContract, computeRates, modsOf } from './economy'
import { FIXTURE } from './fixtures'
import { catchUp } from './offline'
import { started, tick, withState } from './testkit'
import type { ContentPack, GameState } from './types'
import { buildView } from './view'

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })
const work = (s: GameState, content: ContentPack) => apply(s, content, { type: 'work' })
const relay = (s: GameState, content: ContentPack = FIXTURE) => buildView(s, content).machines.find((m) => m.id === 'relay-rack')

describe('Rule: Hand work and machines start the economy', () => {
  test('Scenario: Working a contract by hand', () => {
    let s = started(42, ERA1)
    for (let i = 0; i < 10; i++) s = work(s, ERA1)
    expect(s.cash).toBeCloseTo(5, 6)
    expect(s.log.map((l) => l.text)).toContain('the numbers add up. they always do, eventually.')
  })

  test('Scenario: Buying a machine raises the next price', () => {
    const s = apply(withState(started(), { cash: 60 }), FIXTURE, { type: 'buyMachine', machine: 'relay-rack' })
    expect(computeRates(s, FIXTURE).compute).toBe(1)
    expect(relay(s)?.cost).toBeCloseTo(28.25, 6)
  })

  test('Scenario: Buying without enough cash', () => {
    const before = withState(started(), { cash: 10 })
    const result = attempt(before, FIXTURE, { type: 'buyMachine', machine: 'relay-rack' })
    expect(result.verdict.ok).toBe(false)
    expect(result.state).toBe(before)
    expect(relay(before)?.canAfford).toBe(false)
    expect(relay(before)?.secondsToAfford === null || relay(before)!.secondsToAfford! > 0).toBe(true)
  })
})

describe('Rule: Agents turn compute into work, and unused compute is wasted', () => {
  test('Scenario: Creating an agent', () => {
    const s = apply(withState(started(), { machines: racks(1) }), FIXTURE, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })
    expect(s.agents).toHaveLength(1)
    expect(s.agents[0]?.model).toBe('kin-0.1')
    expect(s.agents[0]?.name.length).toBeGreaterThan(0)
    expect(computeRates(s, FIXTURE).wasted).toBe(0)
  })

  test('Scenario: Not enough free compute', () => {
    const full = apply(withState(started(), { machines: racks(1), models: ['kin-0.1', 'kin-0.2'] }), FIXTURE, {
      type: 'createAgent',
      model: 'kin-0.1',
      job: 'earn',
    })
    const result = attempt(full, FIXTURE, { type: 'createAgent', model: 'kin-0.2', job: 'earn' })
    expect(result.verdict).toEqual({ ok: false, reason: 'not enough free compute: needs 4 kFLOP/s' })
  })

  test('Scenario: Context gates contracts', () => {
    const s = withState(started(), { research: ['contract-broker'] })
    const contract = chooseContract(FIXTURE, modsOf(s, FIXTURE), s.contractPick, 64)
    expect(contract?.id).toBe('payroll')
  })
})

describe('Rule: Training reserves compute until the model arrives', () => {
  test('Scenario: Training kin-0.2', () => {
    const ready = withState(started(), { research: ['training-harness'], machines: racks(10) })
    const free = computeRates(ready, FIXTURE).free
    expect(free).toBe(10)
    const running = apply(ready, FIXTURE, { type: 'startTraining', model: 'kin-0.2', flops: 10 })
    expect(computeRates(running, FIXTURE).free).toBe(free - 10)
    const almost = tick(running, 199)
    expect(almost.models).not.toContain('kin-0.2')
    const done = tick(almost, 1)
    expect(done.models).toContain('kin-0.2')
    expect(done.training).toBeNull()
    expect(computeRates(done, FIXTURE).free).toBe(10)
  })
})

describe('Rule: Distill resets the run and pays Logits', () => {
  // Payout floor(k * sqrt(lifetime / T0)) with k = 1 and T0 = 1000: 16,000 tokens pay 4.
  const deep = (extra: Partial<GameState> = {}) =>
    withState(started(), {
      cash: 500,
      rp: 40,
      lifetimeTokens: 16000,
      runTokens: 16000,
      machines: racks(6),
      models: ['kin-0.1', 'kin-0.2', 'kin-0.3'],
      research: ['distillation', 'training-harness', 'batching'],
      agents: [{ id: 'agent-1', name: 'Edna P.', model: 'kin-0.1', job: 'earn', lifetimeTokens: 5 }],
      story: ['first-rack'],
      ...extra,
    })

  test('Scenario: Distilling', () => {
    const before = deep()
    expect(distillPayout(before, FIXTURE)).toBe(4)
    const s = apply(before, FIXTURE, { type: 'distill' })
    expect(s.logits).toBe(4)
    expect(s.cash).toBe(FIXTURE.balance.startCash)
    expect(s.machines).toEqual(racks(0))
    expect(s.agents).toEqual([])
    expect(s.research).toEqual([])
    expect(s.models).toEqual(['kin-0.1'])
    expect(s.story).toContain('first-rack')
    expect(s.stats.distills).toBe(1)
  })

  test('Scenario: Distill before it is unlocked', () => {
    const s = withState(started(), { lifetimeTokens: 16000, research: [] })
    expect(buildView(s, FIXTURE).distill).toBeNull()
    expect(buildView(s, FIXTURE).actions.some((a) => a.id === 'distill')).toBe(false)
  })

  test('Scenario: Unspent Logits boost production', () => {
    const base = apply(withState(started(), { machines: racks(1) }), FIXTURE, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })
    const plain = computeRates(base, FIXTURE).tokPerSec
    const boosted = computeRates(withState(base, { logits: 5 }), FIXTURE).tokPerSec
    expect(boosted / plain).toBeCloseTo(1.1, 9)
  })
})

describe('Rule: Progress survives time away', () => {
  const earning = () => apply(withState(started(), { machines: racks(1) }), FIXTURE, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })
  const outline = [
    { away: 30 * 60, simulated: 30 * 60, research: [] as string[], note: 'under the cap' },
    { away: 5 * 3600, simulated: 2 * 3600, research: [] as string[], note: 'base cap' },
    { away: 5 * 3600, simulated: 5 * 3600, research: ['night-shift'], note: 'Night Shift researched' },
  ]
  for (const row of outline) {
    test(`Scenario Outline: Offline catch-up (${row.note})`, () => {
      const before = withState(earning(), { research: row.research })
      const after = catchUp(before, FIXTURE, row.away)
      expect(after.runSeconds - before.runSeconds).toBeCloseTo(row.simulated, 6)
      expect(after.log.map((l) => l.text)).toContain(FIXTURE.text.offlineReturn)
    })
  }
})
