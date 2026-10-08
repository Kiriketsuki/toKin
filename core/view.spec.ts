import { describe, expect, test } from 'bun:test'
import { FIXTURE } from './fixtures'
import { initialState } from './state'
import { play, repeat, started, withState } from './testkit'
import { buildView } from './view'
import { distillPayout, newlyRevealed, makeCtx, shopCost } from './view-rows'
import { computeRates, modsOf } from './economy'

const view = (s: ReturnType<typeof started>) => buildView(s, FIXTURE)
const option = (s: ReturnType<typeof started>, id: string) => view(s).actions.find((a) => a.id === id)

describe('buildView basics', () => {
  test('before the founder is named there are no actions', () => {
    const v = buildView(initialState(1, FIXTURE), FIXTURE)
    expect(v.needsFounder).toBe(true)
    expect(v.actions).toEqual([])
    expect(v.computeUnit).toBe('kFLOP/s')
  })

  test('a new game shows the hand work action and the Relay Rack', () => {
    const v = view(started())
    expect(v.needsFounder).toBe(false)
    expect(v.header.founder).toBe('Ada')
    expect(v.header.year).toBe(1952)
    expect(option(started(), 'work')?.enabled).toBe(true)
    expect(option(started(), 'work')?.label).toContain('$0.50')
    expect(v.machines.find((m) => m.id === 'relay-rack')?.isVisible).toBe(true)
    expect(v.machines.find((m) => m.id === 'valve-bank')?.isVisible).toBe(false)
    expect(v.log.length).toBe(1)
  })

  test('the view does not change the state and is deterministic', () => {
    const s = play(started(), repeat({ type: 'work' }, 10))
    const before = JSON.stringify(s)
    const a = buildView(s, FIXTURE)
    expect(JSON.stringify(s)).toBe(before)
    expect(JSON.stringify(buildView(s, FIXTURE, 123))).toBe(JSON.stringify(a))
  })

  test('the log keeps the last 12 lines', () => {
    const log = Array.from({ length: 30 }, (_, i) => ({ t: i, text: `line ${i}` }))
    const v = view(withState(started(), { log }))
    expect(v.log.length).toBe(12)
    expect(v.log.at(-1)?.text).toBe('line 29')
  })
})

describe('machines', () => {
  test('cost and seconds to afford', () => {
    const s = withState(started(), { cash: 10 })
    const row = view(s).machines.find((m) => m.id === 'relay-rack')
    expect(row?.cost).toBe(25)
    expect(row?.canAfford).toBe(false)
    expect(row?.secondsToAfford).toBeNull()
    expect(option(s, 'buy:relay-rack')?.enabled).toBe(false)
    expect(option(s, 'buy:relay-rack')?.reason).toBe('not enough cash: needs 25.00')
  })

  test('a buyable machine has zero seconds to afford', () => {
    const row = view(withState(started(), { cash: 25 })).machines[0]
    expect(row?.canAfford).toBe(true)
    expect(row?.secondsToAfford).toBe(0)
  })

  test('a researched machine shows once half its cost is held, then stays', () => {
    const base = withState(started(), { research: ['valve-logic'] })
    const shown = (s: typeof base) => view(s).machines.find((m) => m.id === 'valve-bank')?.isVisible
    expect(shown(withState(base, { cash: 199 }))).toBe(false)
    expect(shown(withState(base, { cash: 200 }))).toBe(true)
    expect(shown(withState(base, { cash: 0, revealed: ['valve-bank'] }))).toBe(true)
    expect(newlyRevealed(makeCtx(withState(base, { cash: 200 }), FIXTURE, modsOf(base, FIXTURE), computeRates(base, FIXTURE)))).toContain('valve-bank')
  })
})

describe('compute and agents', () => {
  const withAgent = () =>
    play(withState(started(), { machines: { 'relay-rack': 10 } }), [{ type: 'createAgent', model: 'kin-0.1', job: 'earn' }])

  test('used, free, wasted and total', () => {
    const c = view(withAgent()).header.compute
    expect(c).toEqual({ total: 10, used: 1, free: 9, wasted: 9 })
  })

  test('an Earn agent shows cash output and tok/s', () => {
    const v = view(withAgent())
    expect(v.header.tokPerSec).toBe(2)
    expect(v.header.cashPerSec).toBeCloseTo(0.2, 9)
    expect(v.agents[0]?.output).toEqual({ kind: 'cash', perSec: expect.closeTo(0.2, 9), contract: 'payroll' })
    expect(v.contracts.find((c) => c.id === 'payroll')).toMatchObject({ isPicked: true, agents: 1, isAuto: false })
  })

  test('an agent with too little context is idle and its compute is wasted', () => {
    const s = play(withAgent(), [{ type: 'pickContract', contract: 'census' }])
    const v = view(s)
    expect(v.agents[0]?.output).toEqual({ kind: 'idle', reason: 'context too short: needs 512' })
    expect(v.header.compute.wasted).toBe(10)
    expect(v.header.compute.used).toBe(1)
  })

  test('research agents show RP output and assign options skip the current job', () => {
    const s = play(withAgent(), [{ type: 'assignAgent', agent: 'agent-1', job: 'research' }])
    const v = view(s)
    expect(v.agents[0]?.output.kind).toBe('rp')
    expect(v.header.rpPerSec).toBeCloseTo(0.02, 9)
    expect(v.actions.some((a) => a.id === 'assign:agent-1:research')).toBe(false)
    expect(v.actions.some((a) => a.id === 'assign:agent-1:earn')).toBe(true)
    expect(v.actions.some((a) => a.id === 'remove:agent-1')).toBe(true)
  })

  test('create options are disabled with a reason when compute is short', () => {
    const s = started()
    const create = option(s, 'create:kin-0.1:earn')
    expect(create?.enabled).toBe(false)
    expect(create?.reason).toBe('not enough free compute: needs 1 kFLOP/s')
    expect(option(s, 'create:kin-0.1:train')).toBeUndefined()
  })

  test('the contract picker disappears after Contract Broker', () => {
    const s = withState(started(), { research: ['contract-broker'] })
    expect(view(s).actions.some((a) => a.id.startsWith('pick:'))).toBe(false)
    expect(view(s).contracts.every((c) => c.isAuto)).toBe(true)
  })
})

describe('research', () => {
  const research = (s: ReturnType<typeof started>, id: string) => view(s).research.find((r) => r.id === id)

  test('an item shows at half its RP cost', () => {
    expect(research(withState(started(), { rp: 4 }), 'valve-logic')?.isVisible).toBe(false)
    const at5 = research(withState(started(), { rp: 5 }), 'valve-logic')
    expect(at5).toMatchObject({ status: 'available', isVisible: true, canAfford: false })
  })

  test('status moves from available to owned', () => {
    const s = withState(started(), { rp: 10 })
    expect(research(s, 'valve-logic')?.canAfford).toBe(true)
    expect(option(s, 'research:valve-logic')?.label).toBe('Research Valve Logic (10 RP)')
    expect(research(withState(s, { research: ['valve-logic'] }), 'valve-logic')?.status).toBe('done')
  })

  test('a gated item is locked and names its gate', () => {
    const row = research(started(), 'distillation')
    expect(row).toMatchObject({ status: 'locked', isVisible: false, lockReason: 'needs kin-0.3' })
  })
})

describe('training', () => {
  test('is locked before Training Harness', () => {
    expect(view(started()).training).toEqual({ isUnlocked: false, active: null, options: [] })
  })

  test('lists the next model with cost and time at free compute', () => {
    const s = withState(started(), { research: ['training-harness'], machines: { 'relay-rack': 10 } })
    const t = view(s).training
    expect(t.isUnlocked).toBe(true)
    expect(t.options).toEqual([{ model: 'kin-0.2', cost: 2000, secondsAtFree: 200 }])
    expect(option(s, 'train:kin-0.2')?.action).toEqual({ type: 'startTraining', model: 'kin-0.2', flops: 10 })
  })

  test('shows progress and time left for an active run', () => {
    const s = withState(started(), {
      research: ['training-harness'],
      machines: { 'relay-rack': 10 },
      training: { model: 'kin-0.2', reservedFlops: 10, progress: 500 },
    })
    expect(view(s).training.active).toEqual({ model: 'kin-0.2', reservedFlops: 10, progress: 500, cost: 2000, secondsLeft: 150 })
    expect(view(s).header.compute.used).toBe(10)
  })
})

describe('shop and Distill', () => {
  test('Distill preview is null until researched', () => {
    expect(view(started()).distill).toBeNull()
    expect(option(started(), 'distill')).toBeUndefined()
  })

  test('Distill preview shows the payout', () => {
    const s = withState(started(), { research: ['distillation'], lifetimeTokens: 4000 })
    const v = view(s)
    expect(v.distill?.logits).toBe(2)
    expect(v.distill?.canDistill).toBe(true)
    expect(v.distill?.resets).toContain('machines')
    expect(distillPayout(withState(s, { stats: { ...s.stats, logitsEarned: 5 } }), FIXTURE)).toBe(0)
    expect(view(withState(s, { lifetimeTokens: 10 })).distill?.canDistill).toBe(false)
  })

  test('shop rows follow the cost curves and level limits', () => {
    const s = withState(started(), { logits: 3, shop: { 'warm-start': 3, 'soft-targets': 1 } })
    const rows = view(s).shop
    expect(rows.find((r) => r.id === 'warm-start')).toMatchObject({ level: 3, maxLevel: 3, cost: null, canAfford: false })
    expect(rows.find((r) => r.id === 'soft-targets')).toMatchObject({ maxLevel: null, cost: 4, canAfford: false })
    expect(rows.find((r) => r.id === 'long-memory')).toMatchObject({ maxLevel: 4, cost: 3 })
    expect(shopCost(FIXTURE.shop[2]!, 4)).toBeNull()
    expect(view(s).header.logitBonus).toBeCloseTo(0.06, 9)
  })
})
