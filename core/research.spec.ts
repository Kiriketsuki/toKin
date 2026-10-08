import { describe, expect, test } from 'bun:test'
import { apply, attempt } from './actions'
import { isMachineUnlocked, modsOf } from './economy'
import { FIXTURE } from './fixtures'
import { started, withState } from './testkit'
import type { ContentPack, GameState } from './types'

const buy = (research: string) => ({ type: 'research', research }) as const
const rich = (extra: Partial<GameState> = {}): GameState => withState(started(), { rp: 1e6, ...extra })

const GATED: ContentPack = {
  ...FIXTURE,
  research: [
    ...FIXTURE.research,
    { id: 'gated', name: 'Gated', description: '', cost: 5, requires: [{ kind: 'research', research: 'batching' }], effects: [] },
    { id: 'racks', name: 'Racks', description: '', cost: 5, requires: [{ kind: 'machine', machine: 'relay-rack', gte: 2 }], effects: [] },
  ],
}

describe('research', () => {
  test('spends RP and records the item', () => {
    const s = apply(withState(started(), { rp: 30 }), FIXTURE, buy('batching'))
    expect(s.rp).toBe(5)
    expect(s.research).toEqual(['batching'])
  })

  test('applies a tokMult effect at once', () => {
    expect(modsOf(apply(rich(), FIXTURE, buy('batching')), FIXTURE).tokMult).toBe(1.25)
  })

  test('applies unlockMachine, unlockJob, contractBroker and unlockDistill', () => {
    const s = ['valve-logic', 'training-harness', 'contract-broker', 'distillation'].reduce(
      (acc, id) => apply(acc, FIXTURE, buy(id)),
      rich({ models: ['kin-0.1', 'kin-0.2', 'kin-0.3'] }),
    )
    const mods = modsOf(s, FIXTURE)
    expect(isMachineUnlocked(FIXTURE.machines[1]!, mods)).toBe(true)
    expect(mods.unlockedJobs.has('train')).toBe(true)
    expect(mods.hasBroker).toBe(true)
    expect(mods.canDistill).toBe(true)
  })

  test('applies machine discount, context, offline cap, quality and training cost', () => {
    const s = ['tube-binning', 'punch-card-context', 'night-shift', 'attention-prototype', 'gradient-checkpointing'].reduce(
      (acc, id) => apply(acc, FIXTURE, buy(id)),
      rich(),
    )
    const mods = modsOf(s, FIXTURE)
    expect(mods.machineCostMult).toBe(0.85)
    expect(mods.contextMult).toBe(1.5)
    expect(mods.offlineCapSeconds).toBe(28800)
    expect(mods.qualityBoosts).toEqual([{ value: 1.5, minTier: 3 }])
    expect(mods.trainingCostMult).toBe(0.7)
  })

  test('refuses with too little RP', () => {
    const s = withState(started(), { rp: 24 })
    const r = attempt(s, FIXTURE, buy('batching'))
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'not enough RP: needs 25' })
  })

  test('refuses a repeat purchase', () => {
    const s = apply(rich(), FIXTURE, buy('batching'))
    const r = attempt(s, FIXTURE, buy('batching'))
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'Batching is already done' })
  })

  test('refuses an unknown id', () => {
    expect(attempt(rich(), FIXTURE, buy('nope')).verdict).toEqual({ ok: false, reason: 'unknown id nope' })
  })

  test('refuses when a research prerequisite is missing, then allows it', () => {
    const s = rich()
    const r = attempt(s, GATED, buy('gated'))
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'Gated is locked' })
    const after = apply(apply(s, GATED, buy('batching')), GATED, buy('gated'))
    expect(after.research).toEqual(['batching', 'gated'])
  })

  test('refuses when a machine prerequisite is missing', () => {
    const s = rich({ machines: { 'relay-rack': 1, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 } })
    expect(attempt(s, GATED, buy('racks')).verdict.ok).toBe(false)
    expect(attempt({ ...s, machines: { ...s.machines, 'relay-rack': 2 } }, GATED, buy('racks')).verdict.ok).toBe(true)
  })
})
