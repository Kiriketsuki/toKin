import { describe, expect, test } from 'bun:test'
import { apply, attempt, check } from './actions'
import { computeRates } from './economy'
import { FIXTURE } from './fixtures'
import { initialState } from './state'
import { play, repeat, started, withState } from './testkit'

const work = { type: 'work' } as const
const buyRack = { type: 'buyMachine', machine: 'relay-rack' } as const
const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })

describe('founder', () => {
  test('naming the founder logs the first line', () => {
    const s = started()
    expect(s.founder).toBe('Ada')
    expect(s.log.at(-1)?.text).toBe('Ada opens the garage. it is 1952.')
  })

  test('actions refuse until the founder has a name', () => {
    const s = initialState(1, FIXTURE)
    const r = attempt(s, FIXTURE, work)
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'name the founder first' })
  })

  test('a blank or second name is refused', () => {
    const s = initialState(1, FIXTURE)
    expect(apply(s, FIXTURE, { type: 'nameFounder', name: '  ' })).toBe(s)
    const named = started()
    expect(apply(named, FIXTURE, { type: 'nameFounder', name: 'Bob' })).toBe(named)
  })
})

describe('Hand work', () => {
  test('ten presses pay $5.00 with no machines and fire the story line', () => {
    const s = play(started(), repeat(work, 10))
    expect(s.cash).toBe(5)
    expect(s.runTokens).toBe(50)
    expect(s.lifetimeTokens).toBe(50)
    expect(s.stats.workPresses).toBe(10)
    expect(s.log.map((l) => l.text)).toContain('the numbers add up. they always do, eventually.')
  })

  test('the story line does not fire before the tenth press', () => {
    const s = play(started(), repeat(work, 9))
    expect(s.log.map((l) => l.text)).not.toContain('the numbers add up. they always do, eventually.')
  })

  test('work never mutates its input', () => {
    const s = started()
    const frozen = JSON.stringify(s)
    apply(s, FIXTURE, work)
    expect(JSON.stringify(s)).toBe(frozen)
  })
})

describe('Machines', () => {
  test('buying a rack with $60 gives 1 kFLOP/s and a $28.25 next price', () => {
    const s = apply(withState(started(), { cash: 60 }), FIXTURE, buyRack)
    expect(computeRates(s, FIXTURE).compute).toBe(1)
    expect(s.cash).toBe(35)
    const v = check(withState(s, { cash: 28.25 }), FIXTURE, buyRack)
    expect(v.ok).toBe(true)
    const short = check(withState(s, { cash: 28.24 }), FIXTURE, buyRack)
    expect(short).toEqual({ ok: false, reason: 'not enough cash: needs 28.25' })
  })

  test('buying without enough cash changes nothing', () => {
    const s = withState(started(), { cash: 10 })
    const r = attempt(s, FIXTURE, buyRack)
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'not enough cash: needs 25.00' })
  })

  test('a locked machine needs its research', () => {
    const rich = withState(started(), { cash: 1000 })
    const buyValve = { type: 'buyMachine', machine: 'valve-bank' } as const
    expect(check(rich, FIXTURE, buyValve)).toEqual({ ok: false, reason: 'Tensor Valve Bank is locked' })
    const open = apply(withState(rich, { research: ['valve-logic'] }), FIXTURE, buyValve)
    expect(open.machines['valve-bank']).toBe(1)
    expect(open.cash).toBe(600)
  })

  test('an unknown machine is refused', () => {
    const s = started()
    expect(check(s, FIXTURE, { type: 'buyMachine', machine: 'nope' })).toEqual({ ok: false, reason: 'unknown id nope' })
  })

  test('research discount lowers the price paid', () => {
    const s = withState(started(), { cash: 100, research: ['tube-binning'] })
    expect(apply(s, FIXTURE, buyRack).cash).toBeCloseTo(78.75, 10)
  })
})

describe('Agents', () => {
  const owner = () => withState(started(), { machines: racks(1) })
  const create = { type: 'createAgent', model: 'kin-0.1', job: 'earn' } as const

  test('creating an agent uses free compute and leaves no waste', () => {
    const s = apply(owner(), FIXTURE, create)
    expect(s.agents).toHaveLength(1)
    expect(s.agents[0]).toMatchObject({ model: 'kin-0.1', job: 'earn', lifetimeTokens: 0, id: 'agent-1' })
    expect(s.agents[0]?.name.split(' ')).toHaveLength(2)
    expect(computeRates(s, FIXTURE).wasted).toBe(0)
    expect(s.nextAgentId).toBe(2)
  })

  test('free compute must cover the footprint', () => {
    const full = apply(owner(), FIXTURE, create)
    const s = withState(full, { models: ['kin-0.1', 'kin-0.2'] })
    const r = attempt(s, FIXTURE, { type: 'createAgent', model: 'kin-0.2', job: 'earn' })
    expect(r.state).toBe(s)
    expect(r.verdict).toEqual({ ok: false, reason: 'not enough free compute: needs 4 kFLOP/s' })
  })

  test('a model that is not unlocked is refused', () => {
    const s = withState(started(), { machines: racks(10) })
    expect(check(s, FIXTURE, { type: 'createAgent', model: 'kin-0.2', job: 'earn' })).toEqual({
      ok: false,
      reason: 'kin-0.2 is locked',
    })
  })

  test('the Train job needs the Training Harness', () => {
    const train = { type: 'createAgent', model: 'kin-0.1', job: 'train' } as const
    expect(check(owner(), FIXTURE, train)).toEqual({ ok: false, reason: 'Train is locked' })
    expect(check(withState(owner(), { research: ['training-harness'] }), FIXTURE, train).ok).toBe(true)
  })

  test('Contract Broker makes a kin-0.1 agent work Payroll, not Ballistics', () => {
    const s = apply(withState(owner(), { research: ['contract-broker'], contractPick: 'ballistics' }), FIXTURE, create)
    expect(computeRates(s, FIXTURE).agents[0]?.contract).toBe('payroll')
  })

  test('without Broker a pick above the context idles the agent', () => {
    const s = apply(owner(), FIXTURE, create)
    const picked = apply(s, FIXTURE, { type: 'pickContract', contract: 'ballistics' })
    const rates = computeRates(picked, FIXTURE)
    expect(rates.agents[0]?.isIdle).toBe(true)
    expect(rates.wasted).toBe(1)
  })

  test('Punch-card Context lifts kin-0.1 to context 96, still below Ballistics', () => {
    const s = apply(withState(owner(), { research: ['punch-card-context'], contractPick: 'ballistics' }), FIXTURE, create)
    expect(computeRates(s, FIXTURE).agents[0]?.isIdle).toBe(true)
  })

  test('reassigning is free and keeps the agent', () => {
    const s = apply(owner(), FIXTURE, create)
    const moved = apply(s, FIXTURE, { type: 'assignAgent', agent: 'agent-1', job: 'research' })
    expect(moved.agents[0]?.job).toBe('research')
    expect(moved.cash).toBe(s.cash)
    expect(computeRates(moved, FIXTURE).rpPerSec).toBeGreaterThan(0)
  })

  test('assigning the same job or an unknown agent is refused', () => {
    const s = apply(owner(), FIXTURE, create)
    const same = attempt(s, FIXTURE, { type: 'assignAgent', agent: 'agent-1', job: 'earn' })
    expect(same.state).toBe(s)
    expect(same.verdict.ok).toBe(false)
    expect(check(s, FIXTURE, { type: 'assignAgent', agent: 'zz', job: 'research' }).ok).toBe(false)
  })

  test('removing an agent frees its compute', () => {
    const s = apply(owner(), FIXTURE, create)
    const gone = apply(s, FIXTURE, { type: 'removeAgent', agent: 'agent-1' })
    expect(gone.agents).toHaveLength(0)
    expect(computeRates(gone, FIXTURE).free).toBe(1)
    expect(check(gone, FIXTURE, { type: 'removeAgent', agent: 'agent-1' }).ok).toBe(false)
  })

  test('agent ids never repeat after a removal', () => {
    const one = apply(owner(), FIXTURE, create)
    const gone = apply(one, FIXTURE, { type: 'removeAgent', agent: 'agent-1' })
    expect(apply(gone, FIXTURE, create).agents[0]?.id).toBe('agent-2')
  })

  test('agent names come from the pool and differ across agents', () => {
    const s = play(withState(started(), { machines: racks(6) }), repeat(create, 6))
    const names = s.agents.map((a) => a.name)
    expect(new Set(names).size).toBe(6)
    for (const n of names) {
      const [first, last] = n.split(' ')
      expect(FIXTURE.names.first).toContain(first!)
      expect(FIXTURE.names.last).toContain(last!)
    }
  })
})

describe('pickContract', () => {
  test('sets the pick, and refuses a repeat or an unknown id', () => {
    const s = started()
    expect(apply(s, FIXTURE, { type: 'pickContract', contract: 'census' }).contractPick).toBe('census')
    expect(check(s, FIXTURE, { type: 'pickContract', contract: 'payroll' }).ok).toBe(false)
    expect(check(s, FIXTURE, { type: 'pickContract', contract: 'x' }).ok).toBe(false)
  })
})

describe('extension points', () => {
  test('an action with no handler yet is refused and leaves the state alone', () => {
    const s = started()
    const r = attempt(s, FIXTURE, { type: 'distill' })
    expect(r.state).toBe(s)
    expect(r.verdict.ok).toBe(false)
  })
})
