import { describe, expect, test } from 'bun:test'
import { apply } from './actions'
import { FIXTURE } from './fixtures'
import { initialState } from './state'
import { step } from './step'
import { play, repeat, SEED, started, tick, withState } from './testkit'
import type { Action, GameState } from './types'

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })
const earner = (): GameState =>
  play(withState(started(), { machines: racks(1) }), [{ type: 'createAgent', model: 'kin-0.1', job: 'earn' }])

describe('step', () => {
  test('an Earn agent adds cash and tokens each second', () => {
    const s = step(earner(), FIXTURE, 1)
    expect(s.cash).toBeCloseTo(0.2, 10)
    expect(s.runTokens).toBe(2)
    expect(s.lifetimeTokens).toBe(2)
    expect(s.agents[0]?.lifetimeTokens).toBe(2)
    expect(s.clock).toBe(1)
    expect(s.runSeconds).toBe(1)
  })

  test('a Research agent adds RP, not cash', () => {
    const s = step(play(earner(), [{ type: 'assignAgent', agent: 'agent-1', job: 'research' }]), FIXTURE, 10)
    expect(s.rp).toBeCloseTo(0.2, 10)
    expect(s.cash).toBe(0)
    expect(s.runTokens).toBe(20)
  })

  test('an idle agent makes nothing', () => {
    const idle = apply(earner(), FIXTURE, { type: 'pickContract', contract: 'census' })
    const s = step(idle, FIXTURE, 5)
    expect([s.cash, s.runTokens, s.agents[0]?.lifetimeTokens]).toEqual([0, 0, 0])
  })

  test('one big step equals many small steps', () => {
    const big = step(earner(), FIXTURE, 100)
    const small = tick(earner(), 100)
    expect(big.cash).toBeCloseTo(small.cash, 6)
    expect(big.runTokens).toBeCloseTo(small.runTokens, 6)
  })

  test('step never mutates its input', () => {
    const s = earner()
    const frozen = JSON.stringify(s)
    step(s, FIXTURE, 3)
    expect(JSON.stringify(s)).toBe(frozen)
  })

  test('an unnamed founder, zero dt and bad dt change nothing', () => {
    const fresh = initialState(SEED, FIXTURE)
    expect(step(fresh, FIXTURE, 10)).toBe(fresh)
    const s = earner()
    expect(step(s, FIXTURE, 0)).toBe(s)
    expect(step(s, FIXTURE, -1)).toBe(s)
    expect(step(s, FIXTURE, Number.NaN)).toBe(s)
  })

  test('unspent Logits lift cash by 10% at five Logits', () => {
    const base = step(earner(), FIXTURE, 10).cash
    const boosted = step(withState(earner(), { logits: 5 }), FIXTURE, 10).cash
    expect(boosted / base).toBeCloseTo(1.1, 10)
  })

  test('the story fires from step and moves the year', () => {
    const s = step(withState(started(), { machines: racks(1) }), FIXTURE, 1)
    expect(s.story).toContain('first-rack')
    expect(s.year).toBe(1953)
    expect(step(s, FIXTURE, 1).story.filter((id) => id === 'first-rack')).toHaveLength(1)
  })

  test('the log keeps only the last logLimit lines', () => {
    const small = { ...FIXTURE, balance: { ...FIXTURE.balance, logLimit: 3 } }
    const s = play(started(SEED, small), repeat({ type: 'work' }, 10), small)
    expect(s.log.length).toBeLessThanOrEqual(3)
  })
})

describe('determinism', () => {
  const script: readonly Action[] = [
    { type: 'work' },
    { type: 'buyMachine', machine: 'relay-rack' },
    { type: 'createAgent', model: 'kin-0.1', job: 'earn' },
  ]
  const run = (seed: number): GameState => {
    const s = play(withState(started(seed), { cash: 500, machines: racks(5) }), [
      ...script,
      ...repeat({ type: 'createAgent', model: 'kin-0.1', job: 'research' }, 3),
    ])
    return tick(s, 120)
  }

  test('the same seed and actions give the same state', () => {
    expect(run(7)).toEqual(run(7))
    expect(JSON.stringify(run(7))).toBe(JSON.stringify(run(7)))
  })

  test('a different seed gives different agent names and the same economy', () => {
    const a = run(1)
    const b = run(2)
    expect(a.agents.map((x) => x.name)).not.toEqual(b.agents.map((x) => x.name))
    expect(a.cash).toBeCloseTo(b.cash, 9)
  })

  test('the state survives a JSON round trip', () => {
    const s = run(3)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
})

describe('initialState', () => {
  test('starts with kin-0.1, no machines and the hand work contract', () => {
    const s = initialState(5, FIXTURE)
    expect(s.models).toEqual(['kin-0.1'])
    expect(s.machines['relay-rack']).toBe(0)
    expect(s.contractPick).toBe('payroll')
    expect(s.year).toBe(1952)
    expect(s.founder).toBeNull()
    expect(s.cash).toBe(0)
  })
})
