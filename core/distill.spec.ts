import { describe, expect, test } from 'bun:test'
import { apply, attempt } from './actions'
import { distillPayout } from './distill'
import { computeRates, modsOf } from './economy'
import { FIXTURE } from './fixtures'
import { started, withState } from './testkit'
import type { ContentPack, GameState } from './types'

// The fixture has no Hand-me-down or Old Notes, so this pack adds them.
const PACK: ContentPack = {
  ...FIXTURE,
  shop: [
    ...FIXTURE.shop,
    { id: 'hand-me-down', name: 'Hand-me-down', description: 'keep models', maxLevel: 2, cost: { kind: 'table', values: [5, 20] }, effect: { kind: 'keepModels', perLevel: [['kin-0.2'], ['kin-0.2', 'kin-0.3']] } },
    { id: 'old-notes', name: 'Old Notes', description: 'keep research', maxLevel: 1, cost: { kind: 'table', values: [3] }, effect: { kind: 'keepResearch', research: ['training-harness', 'contract-broker'] } },
  ],
}

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })

// A mid-run state that has unlocked Distill and made 10,000 tokens.
function deep(extra: Partial<GameState> = {}): GameState {
  return withState(started(42, PACK), {
    cash: 500,
    rp: 40,
    lifetimeTokens: 10000,
    runTokens: 10000,
    runSeconds: 321,
    machines: racks(6),
    models: ['kin-0.1', 'kin-0.2', 'kin-0.3'],
    research: ['distillation', 'training-harness', 'contract-broker', 'batching'],
    agents: [{ id: 'agent-1', name: 'Edna P.', model: 'kin-0.1', job: 'earn', lifetimeTokens: 5 }],
    contractPick: 'census',
    revealed: ['valve-bank'],
    ...extra,
  })
}

const distill = (s: GameState) => apply(s, PACK, { type: 'distill' })

describe('Distilling', () => {
  test('pays floor(k * sqrt(lifetime / T0)) Logits', () => {
    expect(distillPayout(deep(), PACK)).toBe(3)
    expect(distill(deep()).logits).toBe(3)
  })

  test('resets the run and keeps the meta state', () => {
    const before = deep({ shop: { 'soft-targets': 1 }, story: ['first-ten'] })
    const s = distill(before)
    expect(s.cash).toBe(0)
    expect(s.rp).toBe(0)
    expect(s.runTokens).toBe(0)
    expect(s.runSeconds).toBe(0)
    expect(s.machines).toEqual(racks(0))
    expect(s.agents).toEqual([])
    expect(s.training).toBeNull()
    expect(s.models).toEqual(['kin-0.1'])
    expect(s.research).toEqual([])
    expect(s.contractPick).toBe('payroll')
    expect(s.revealed).toEqual([])
    expect(s.lifetimeTokens).toBe(10000)
    expect(s.shop).toEqual({ 'soft-targets': 1 })
    expect(s.story).toContain('first-ten')
    expect(s.founder).toBe('Ada')
    expect(s.nextAgentId).toBe(before.nextAgentId)
    expect(s.stats).toMatchObject({ distills: 1, logitsEarned: 3, bestRunSeconds: 321 })
    expect(s.log.at(-1)?.text).toBe('distilled for 3 Logits')
  })

  test('does not mutate the input', () => {
    const before = deep()
    const snapshot = JSON.stringify(before)
    distill(before)
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  test('a second Distill pays only for new tokens', () => {
    const once = distill(deep())
    expect(distillPayout(once, PACK)).toBe(0)
    const twice = distill(withState(once, { lifetimeTokens: 40000, research: ['distillation'] }))
    expect(twice.logits).toBe(6)
    expect(twice.stats.logitsEarned).toBe(6)
  })

  test('keeps the shortest run time', () => {
    const once = distill(deep())
    const twice = distill(withState(once, { lifetimeTokens: 40000, runSeconds: 900, research: ['distillation'] }))
    expect(twice.stats.bestRunSeconds).toBe(321)
  })

  test('Hand-me-down keeps models by level', () => {
    const one = distill(deep({ shop: { 'hand-me-down': 1 } }))
    expect(one.models).toEqual(['kin-0.1', 'kin-0.2'])
    const two = distill(deep({ shop: { 'hand-me-down': 2 } }))
    expect(two.models).toEqual(['kin-0.1', 'kin-0.2', 'kin-0.3'])
  })

  test('Hand-me-down keeps only models the player owns', () => {
    const s = distill(deep({ shop: { 'hand-me-down': 2 }, models: ['kin-0.1', 'kin-0.2'] }))
    expect(s.models).toEqual(['kin-0.1', 'kin-0.2'])
  })

  test('Old Notes keeps its research', () => {
    const s = distill(deep({ shop: { 'old-notes': 1 } }))
    expect(s.research).toEqual(['training-harness', 'contract-broker'])
  })

  test('Warm Start gives racks at each Distill', () => {
    const s = distill(deep({ shop: { 'warm-start': 2 } }))
    expect(s.machines['relay-rack']).toBe(2)
  })

  test('an agent state is gone but rates still compute', () => {
    const s = distill(deep())
    expect(computeRates(s, PACK).tokPerSec).toBe(0)
  })
})

describe('Distill before unlock', () => {
  test('is refused without the Distillation research', () => {
    const before = deep({ research: ['batching'] })
    const r = attempt(before, PACK, { type: 'distill' })
    expect(r.verdict).toEqual({ ok: false, reason: 'distill is locked' })
    expect(r.state).toBe(before)
  })

  test('is refused when the payout is below 1', () => {
    const before = deep({ lifetimeTokens: 500 })
    const r = attempt(before, PACK, { type: 'distill' })
    expect(r.verdict.ok).toBe(false)
    expect(r.state).toBe(before)
  })
})

describe('Unspent Logits bonus', () => {
  test('each Logit adds 2% to tok/s', () => {
    const base = deep({ logits: 0 })
    const rich = deep({ logits: 5 })
    expect(modsOf(base, PACK).tokMult).toBeCloseTo(1.25, 9)
    expect(modsOf(rich, PACK).tokMult).toBeCloseTo(1.25 * 1.1, 9)
  })

  test('agents make more tokens with unspent Logits', () => {
    const agent = [{ id: 'agent-1', name: 'Edna P.', model: 'kin-0.1', job: 'earn' as const, lifetimeTokens: 0 }]
    const a = computeRates(withState(started(42, PACK), { machines: racks(5), agents: agent, logits: 0 }), PACK)
    const b = computeRates(withState(started(42, PACK), { machines: racks(5), agents: agent, logits: 10 }), PACK)
    expect(b.tokPerSec / a.tokPerSec).toBeCloseTo(1.2, 9)
  })

  test('spending Logits removes the bonus', () => {
    const s = apply(deep({ logits: 2 }), PACK, { type: 'buyShop', item: 'warm-start' })
    expect(s.logits).toBe(1)
    expect(modsOf(s, PACK).tokMult).toBeCloseTo(1.25 * 1.02, 9)
  })
})
