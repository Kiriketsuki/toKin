import { describe, expect, test } from 'bun:test'
import { chooseContract, computeRates, handWorkCash, machineCost, modelStats, modsOf, totalCompute } from './economy'
import { FIXTURE } from './fixtures'
import { started, withState } from './testkit'

const rack = FIXTURE.machines[0]!
const kin1 = FIXTURE.models[0]!
const kin3 = FIXTURE.models[2]!

describe('machine cost', () => {
  test('follows base * ratio^owned, rounded to the cent', () => {
    const mods = modsOf(started(), FIXTURE)
    expect(machineCost(rack, 0, mods)).toBe(25)
    expect(machineCost(rack, 1, mods)).toBe(28.25)
    expect(machineCost(rack, 2, mods)).toBe(31.92)
  })

  test('Vacuum Tube Binning cuts 15%', () => {
    const s = withState(started(), { research: ['tube-binning'] })
    expect(machineCost(rack, 0, modsOf(s, FIXTURE))).toBe(21.25)
  })
})

describe('modifiers', () => {
  test('a fresh game has neutral multipliers', () => {
    const mods = modsOf(started(), FIXTURE)
    expect(mods.tokMult).toBe(1)
    expect(mods.contextMult).toBe(1)
    expect(mods.hasBroker).toBe(false)
    expect(mods.offlineCapSeconds).toBe(7200)
    expect([...mods.unlockedJobs].sort()).toEqual(['earn', 'research'])
  })

  test('research, shop levels and unspent Logits multiply tok/s', () => {
    const s = withState(started(), { research: ['batching'], shop: { 'soft-targets': 2 }, logits: 5 })
    expect(modsOf(s, FIXTURE).tokMult).toBeCloseTo(1.25 * 1.2 * 1.1, 10)
  })

  test('Drum Cabinets add context up to the cap, Long Memory and Punch-card stack', () => {
    const s = withState(started(), {
      machines: { 'relay-rack': 0, 'valve-bank': 0, 'drum-cabinet': 7, 'core-lattice': 0 },
      research: ['punch-card-context'],
      shop: { 'long-memory': 2 },
    })
    expect(modsOf(s, FIXTURE).contextMult).toBeCloseTo(1.5 * 1.5 * 1.5, 10)
  })

  test('Night Shift raises the offline cap to 8 hours', () => {
    expect(modsOf(withState(started(), { research: ['night-shift'] }), FIXTURE).offlineCapSeconds).toBe(28800)
  })

  test('quality boost applies from its minimum tier only', () => {
    const mods = modsOf(withState(started(), { research: ['attention-prototype'] }), FIXTURE)
    expect(modelStats(kin1, mods).quality).toBe(1)
    expect(modelStats(kin3, mods).quality).toBeCloseTo(2.8 * 1.5, 10)
  })
})

describe('contract choice', () => {
  const mods = modsOf(started(), FIXTURE)
  const broker = modsOf(withState(started(), { research: ['contract-broker'] }), FIXTURE)

  test('without Broker the picked contract needs enough context', () => {
    expect(chooseContract(FIXTURE, mods, 'payroll', 64)?.id).toBe('payroll')
    expect(chooseContract(FIXTURE, mods, 'ballistics', 64)).toBeNull()
    expect(chooseContract(FIXTURE, mods, 'ballistics', 128)?.id).toBe('ballistics')
  })

  test('with Broker the best-paying contract that fits wins', () => {
    expect(chooseContract(FIXTURE, broker, 'ballistics', 64)?.id).toBe('payroll')
    expect(chooseContract(FIXTURE, broker, 'payroll', 600)?.id).toBe('census')
    expect(chooseContract(FIXTURE, broker, 'payroll', 4096)?.id).toBe('actuarial')
    expect(chooseContract(FIXTURE, broker, 'payroll', 10)).toBeNull()
  })
})

describe('rates', () => {
  const setup = (job: 'earn' | 'research') =>
    withState(started(), {
      cash: 100,
      machines: { 'relay-rack': 1, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 },
      agents: [{ id: 'a1', name: 'Test', model: 'kin-0.1', job, lifetimeTokens: 0 }],
    })

  test('an Earn agent pays tok/s * rate * quality', () => {
    const r = computeRates(setup('earn'), FIXTURE)
    expect(r.cashPerSec).toBeCloseTo(2 * 0.1 * 1, 10)
    expect(r.tokPerSec).toBe(2)
    expect(r.rpPerSec).toBe(0)
  })

  test('a Research agent makes tok/s * quality^2 * 0.01 RP/s', () => {
    const s = withState(setup('research'), {
      machines: { 'relay-rack': 0, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 },
    })
    expect(computeRates(s, FIXTURE).rpPerSec).toBeCloseTo(2 * 1 * 0.01, 10)
    const big = withState(s, {
      models: ['kin-0.1', 'kin-0.2'],
      agents: [{ id: 'a1', name: 'T', model: 'kin-0.2', job: 'research', lifetimeTokens: 0 }],
    })
    expect(computeRates(big, FIXTURE).rpPerSec).toBeCloseTo(6 * 1.6 ** 2 * 0.01, 10)
  })

  test('compute totals, used, free and wasted', () => {
    const s = setup('earn')
    const r = computeRates(s, FIXTURE)
    expect(totalCompute(s, FIXTURE)).toBe(1)
    expect([r.compute, r.used, r.free, r.wasted]).toEqual([1, 1, 0, 0])
  })

  test('an idle agent and free compute both count as wasted', () => {
    const s = withState(setup('earn'), {
      machines: { 'relay-rack': 3, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 },
      contractPick: 'census',
    })
    const r = computeRates(s, FIXTURE)
    expect(r.agents[0]?.isIdle).toBe(true)
    expect(r.cashPerSec).toBe(0)
    expect(r.free).toBe(2)
    expect(r.wasted).toBe(3)
  })

  test('a Train agent is idle with no run', () => {
    const s = withState(setup('earn'), {
      agents: [{ id: 'a1', name: 'T', model: 'kin-0.1', job: 'train', lifetimeTokens: 0 }],
    })
    expect(computeRates(s, FIXTURE).wasted).toBe(1)
  })

  test('training reservations count as used', () => {
    const s = withState(setup('earn'), {
      machines: { 'relay-rack': 11, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 },
      training: { model: 'kin-0.2', reservedFlops: 10, progress: 0 },
    })
    const r = computeRates(s, FIXTURE)
    expect(r.used).toBe(11)
    expect(r.free).toBe(0)
  })
})

describe('hand work', () => {
  test('pays handWorkTokens * the hand work contract rate', () => {
    expect(handWorkCash(FIXTURE)).toBe(0.5)
  })
})
