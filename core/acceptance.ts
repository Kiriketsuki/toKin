// The Acceptance Scenarios of docs/specs/todo/tokin-build-1-spec.md as plain
// data, with no test library. Each case returns the checks that failed, so
// two runners share one source: core/acceptance.spec.ts under bun test and
// hooks/acceptance.test.ts under claude plugin test. The fixture keeps the
// spec's start numbers, so the figures match the scenario text. The host-only
// scenarios (a dormant session, /tokin stop, a second session) live in the
// hooks tests.

import { ERA1 } from '../content/era1'
import { apply, attempt } from './actions'
import { distillPayout } from './distill'
import { chooseContract, computeRates, modsOf } from './economy'
import { FIXTURE } from './fixtures'
import { catchUp } from './offline'
import { started, tick, withState } from './testkit'
import type { ContentPack, GameState } from './types'
import { buildView } from './view'

export interface AcceptanceCase {
  readonly name: string
  readonly run: () => readonly string[]
}

// Collects the labels of checks that fail.
function checker() {
  const failed: string[] = []
  const check = (label: string, ok: boolean): void => {
    if (!ok) failed.push(label)
  }
  return { failed, check }
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps
const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })
const relay = (s: GameState, content: ContentPack = FIXTURE) => buildView(s, content).machines.find((m) => m.id === 'relay-rack')
const earning = () => apply(withState(started(), { machines: racks(1) }), FIXTURE, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })

// Payout floor(k * sqrt(lifetime / T0)) with k = 1 and T0 = 1000: 16,000 tokens pay 4.
const deep = () =>
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
  })

function handWork(): readonly string[] {
  const { failed, check } = checker()
  let s = started(42, ERA1)
  for (let i = 0; i < 10; i++) s = apply(s, ERA1, { type: 'work' })
  check('the player holds $5.00', near(s.cash, 5))
  check('the log shows the first-contract line', s.log.some((l) => l.text === 'the numbers add up. they always do, eventually.'))
  return failed
}

function buyRaisesPrice(): readonly string[] {
  const { failed, check } = checker()
  const s = apply(withState(started(), { cash: 60 }), FIXTURE, { type: 'buyMachine', machine: 'relay-rack' })
  check('total compute is 1 kFLOP/s', computeRates(s, FIXTURE).compute === 1)
  check('the next Relay Rack costs $28.25', near(relay(s)?.cost ?? 0, 28.25))
  return failed
}

function buyWithoutCash(): readonly string[] {
  const { failed, check } = checker()
  const before = withState(started(), { cash: 10 })
  const result = attempt(before, FIXTURE, { type: 'buyMachine', machine: 'relay-rack' })
  check('the purchase is refused', !result.verdict.ok)
  check('nothing changes', result.state === before)
  const row = relay(before)
  check('the button shows it cannot afford it', row?.canAfford === false)
  check('the button shows the time to afford it', row !== undefined && (row.secondsToAfford === null || row.secondsToAfford > 0))
  return failed
}

function createAgent(): readonly string[] {
  const { failed, check } = checker()
  const s = earning()
  check('one agent exists', s.agents.length === 1)
  check('the agent runs kin-0.1', s.agents[0]?.model === 'kin-0.1')
  check('the agent has a generated name', (s.agents[0]?.name.length ?? 0) > 0)
  check('wasted compute is 0 kFLOP/s', computeRates(s, FIXTURE).wasted === 0)
  return failed
}

function noFreeCompute(): readonly string[] {
  const { failed, check } = checker()
  const full = apply(withState(started(), { machines: racks(1), models: ['kin-0.1', 'kin-0.2'] }), FIXTURE, {
    type: 'createAgent',
    model: 'kin-0.1',
    job: 'earn',
  })
  const result = attempt(full, FIXTURE, { type: 'createAgent', model: 'kin-0.2', job: 'earn' })
  check('the action fails', !result.verdict.ok)
  check('the reason names the 4 kFLOP/s need', !result.verdict.ok && result.verdict.reason === 'not enough free compute: needs 4 kFLOP/s')
  return failed
}

function contextGates(): readonly string[] {
  const { failed, check } = checker()
  const s = withState(started(), { research: ['contract-broker'] })
  const contract = chooseContract(FIXTURE, modsOf(s, FIXTURE), s.contractPick, 64)
  check('a context-64 agent works Payroll tabulation, not Ballistics tables', contract?.id === 'payroll')
  return failed
}

function trainKin02(): readonly string[] {
  const { failed, check } = checker()
  const ready = withState(started(), { research: ['training-harness'], machines: racks(10) })
  const free = computeRates(ready, FIXTURE).free
  check('10 kFLOP/s is free', free === 10)
  const running = apply(ready, FIXTURE, { type: 'startTraining', model: 'kin-0.2', flops: 10 })
  check('free compute drops by 10 kFLOP/s', computeRates(running, FIXTURE).free === free - 10)
  const almost = tick(running, 199)
  check('kin-0.2 is still locked at 199 s', !almost.models.includes('kin-0.2'))
  const done = tick(almost, 1)
  check('kin-0.2 unlocks after 200 s', done.models.includes('kin-0.2'))
  check('the run ends', done.training === null)
  check('the compute is free again', computeRates(done, FIXTURE).free === 10)
  return failed
}

function distilling(): readonly string[] {
  const { failed, check } = checker()
  const before = deep()
  check('lifetime tokens are high enough for 4 Logits', distillPayout(before, FIXTURE) === 4)
  const s = apply(before, FIXTURE, { type: 'distill' })
  check('the player holds 4 Logits', s.logits === 4)
  check('cash resets', s.cash === FIXTURE.balance.startCash)
  check('machines reset', Object.values(s.machines).every((n) => n === 0))
  check('agents reset', s.agents.length === 0)
  check('research resets', s.research.length === 0)
  check('models above kin-0.1 reset', s.models.length === 1 && s.models[0] === 'kin-0.1')
  check('fired story beats remain', s.story.includes('first-rack'))
  check('stats remain and count the Distill', s.stats.distills === 1)
  return failed
}

function distillLocked(): readonly string[] {
  const { failed, check } = checker()
  const view = buildView(withState(started(), { lifetimeTokens: 16000, research: [] }), FIXTURE)
  check('the Distill preview does not show', view.distill === null)
  check('the Distill control does not show', !view.actions.some((a) => a.id === 'distill'))
  return failed
}

function unspentBonus(): readonly string[] {
  const { failed, check } = checker()
  const base = earning()
  const plain = computeRates(base, FIXTURE).tokPerSec
  const boosted = computeRates(withState(base, { logits: 5 }), FIXTURE).tokPerSec
  check('5 unspent Logits make tok/s 10% higher', near(boosted / plain, 1.1, 1e-9))
  return failed
}

function offline(away: number, simulated: number, research: readonly string[]): () => readonly string[] {
  return () => {
    const { failed, check } = checker()
    const before = withState(earning(), { research })
    const after = catchUp(before, FIXTURE, away)
    check(`the game simulates ${simulated} s`, near(after.runSeconds - before.runSeconds, simulated))
    check('the log shows "you slept. it did not."', after.log.some((l) => l.text === FIXTURE.text.offlineReturn))
    return failed
  }
}

export const ACCEPTANCE: readonly AcceptanceCase[] = [
  { name: 'Scenario: Working a contract by hand', run: handWork },
  { name: 'Scenario: Buying a machine raises the next price', run: buyRaisesPrice },
  { name: 'Scenario: Buying without enough cash', run: buyWithoutCash },
  { name: 'Scenario: Creating an agent', run: createAgent },
  { name: 'Scenario: Not enough free compute', run: noFreeCompute },
  { name: 'Scenario: Context gates contracts', run: contextGates },
  { name: 'Scenario: Training kin-0.2', run: trainKin02 },
  { name: 'Scenario: Distilling', run: distilling },
  { name: 'Scenario: Distill before it is unlocked', run: distillLocked },
  { name: 'Scenario: Unspent Logits boost production', run: unspentBonus },
  { name: 'Scenario Outline: Offline catch-up (30m, under the cap)', run: offline(1800, 1800, []) },
  { name: 'Scenario Outline: Offline catch-up (5h, base cap)', run: offline(18000, 7200, []) },
  { name: 'Scenario Outline: Offline catch-up (5h, Night Shift researched)', run: offline(18000, 18000, ['night-shift']) },
]
