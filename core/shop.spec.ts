import { describe, expect, test } from 'bun:test'
import { apply, attempt } from './actions'
import { modsOf } from './economy'
import { FIXTURE } from './fixtures'
import { shopCost, shopMaxLevel } from './shop'
import { started, withState } from './testkit'
import type { GameState } from './types'

const ready = (logits: number, extra: Partial<GameState> = {}) => withState(started(), { logits, ...extra })
const buy = (item: string) => ({ type: 'buyShop', item }) as const
const def = (id: string) => FIXTURE.shop.find((s) => s.id === id)!

describe('Logits shop costs', () => {
  test('table costs set the max level', () => {
    expect(shopMaxLevel(def('warm-start'))).toBe(3)
    expect([0, 1, 2, 3].map((l) => shopCost(def('warm-start'), l))).toEqual([1, 3, 9, null])
  })

  test('geometric costs round up', () => {
    expect([0, 1, 2, 3].map((l) => shopCost(def('soft-targets'), l))).toEqual([2, 4, 6, 9])
  })

  test('maxLevel caps a geometric curve', () => {
    expect(shopMaxLevel(def('long-memory'))).toBe(4)
    expect(shopCost(def('long-memory'), 4)).toBeNull()
  })
})

describe('Logits shop purchases', () => {
  test('a purchase spends Logits and raises the level', () => {
    const s = apply(ready(5), FIXTURE, buy('soft-targets'))
    expect(s.logits).toBe(3)
    expect(s.shop['soft-targets']).toBe(1)
  })

  test('refuses when the player cannot pay', () => {
    const before = ready(1)
    const r = attempt(before, FIXTURE, buy('soft-targets'))
    expect(r.verdict).toEqual({ ok: false, reason: 'not enough Logits: needs 2' })
    expect(r.state).toBe(before)
  })

  test('refuses at the max level', () => {
    const before = ready(100, { shop: { 'long-memory': 4 } })
    const r = attempt(before, FIXTURE, buy('long-memory'))
    expect(r.verdict).toEqual({ ok: false, reason: 'Long Memory is at max level' })
    expect(r.state).toBe(before)
  })

  test('refuses an unknown item', () => {
    expect(attempt(ready(5), FIXTURE, buy('nope')).verdict.ok).toBe(false)
  })

  test('Warm Start tops up racks at once and never lowers them', () => {
    const one = apply(ready(5), FIXTURE, buy('warm-start'))
    expect(one.machines['relay-rack']).toBe(1)
    const two = apply(withState(one, { machines: { ...one.machines, 'relay-rack': 7 } }), FIXTURE, buy('warm-start'))
    expect(two.machines['relay-rack']).toBe(7)
    expect(two.shop['warm-start']).toBe(2)
  })

  test('Soft Targets adds 10% tok/s per level', () => {
    const s = apply(ready(5), FIXTURE, buy('soft-targets'))
    expect(modsOf(s, FIXTURE).tokMult).toBeCloseTo(1.1 * (1 + 0.02 * 3), 9)
  })

  test('Long Memory adds 25% context per level', () => {
    const s = apply(ready(5), FIXTURE, buy('long-memory'))
    expect(modsOf(s, FIXTURE).contextMult).toBeCloseTo(1.25, 9)
  })

  test('Curriculum adds 20% training speed per level', () => {
    const s = apply(ready(5), FIXTURE, buy('curriculum'))
    expect(modsOf(s, FIXTURE).trainSpeedMult).toBeCloseTo(1.2, 9)
  })

  test('Hand-me-down and Old Notes spend Logits and record the level', () => {
    const pack = {
      ...FIXTURE,
      shop: [
        ...FIXTURE.shop,
        { id: 'old-notes', name: 'Old Notes', description: 'keep research', maxLevel: 1, cost: { kind: 'table', values: [3] }, effect: { kind: 'keepResearch', research: ['batching'] } },
      ],
    } as typeof FIXTURE
    const s = apply(ready(4), pack, buy('old-notes'))
    expect(s.logits).toBe(1)
    expect(s.shop['old-notes']).toBe(1)
  })
})
