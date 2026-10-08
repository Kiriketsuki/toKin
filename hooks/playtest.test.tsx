// An automated host playtest. It plays toKin through the real hooks module
// and the real pane, from a fresh save to the first Distill. The early game
// is played by pressing pane buttons. The long middle of the run is played by
// the balance bot over the core, and the save it reaches is loaded back
// through the host, where the pane performs the Distill. It stands in for the
// live playtest only as far as the test kit allows: the live T10 run stays
// with the player.

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { ERA1 } from '../content/era1'
import { apply } from '../core/actions'
import { distillPayout } from '../core/distill'
import { STORAGE_KEYS } from '../core/ports'
import { toSave } from '../core/save'
import { initialState } from '../core/state'
import { step } from '../core/step'
import type { GameState } from '../core/types'
import { BOT } from '../sim/balance'
import { nextAction } from '../sim/bot'
import { paramsForSeed } from '../sim/runner'

const NOW = 1_800_000_000_000

function paneProps() {
  return {
    title: 'toKin',
    isFocused: true,
    bodyColumns: 100,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  }
}

function setup(on: On, store: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: NOW })
  const toasts: string[] = []
  const entries = new Map<string, unknown>(Object.entries(store))
  on('store.get', async (_$, e) => ({ value: entries.get(e.key) }))
  on('store.set', async (_$, e) => {
    entries.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.toast', async (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  return { clock, toasts, entries }
}

async function openGame($: Engine) {
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'tokin', args: '', origin: { kind: 'composer' } } as never)
  return $.ui.mount({ plugin: 'tokin', surface: 'terminal', component: 'Pane', requestId: 'tokin', props: paneProps() })
}

const saved = (entries: Map<string, unknown>) => entries.get(STORAGE_KEYS.save) as GameState

// Error toasts start with "toKin:". Story toasts are plain lowercase lines.
const errorsIn = (toasts: readonly string[]) => toasts.filter((t) => t.startsWith('toKin:'))

test('the early game plays through the pane: work, buy a rack, hire an agent, earn', async ($, on) => {
  const { clock, toasts, entries } = setup(on)
  const pane = await openGame($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  for (let i = 0; i < 60; i++) await pane.press({ key: 'work' })
  await pane.press({ key: 'buy:relay-rack' })
  await pane.press({ key: 'create:kin-0.1:earn' })
  await pane.unmount()
  await clock.advance(31_000)
  const state = saved(entries)
  expect(state.machines['relay-rack']).toBe(1)
  expect(state.agents).toHaveLength(1)
  expect(state.runTokens).toBeGreaterThan(0)
  expect(errorsIn(toasts)).toEqual([])
})

// Plays the balance bot over the core until Distill pays at least 8 Logits,
// as the bot's own Distill rule does, and stops before the Distill itself.
function playToDistill(): GameState {
  const p = paramsForSeed(BOT, 1)
  let state = apply(initialState(1, ERA1), ERA1, { type: 'nameFounder', name: 'Ada' })
  let carry = 0
  while (state.runSeconds < 6000) {
    if (state.research.includes('distillation') && distillPayout(state, ERA1) >= 8) return state
    if (state.agents.length < p.handUntilAgents) {
      const total = carry + p.pressesPerSec
      for (let i = 0; i < Math.floor(total); i++) state = apply(state, ERA1, { type: 'work' })
      carry = total - Math.floor(total)
    }
    for (let n = 0; n < 200; n++) {
      const action = nextAction(state, ERA1, p)
      if (action === null || action.type === 'distill') break
      const next = apply(state, ERA1, action)
      if (next === state) break
      state = next
    }
    state = step(state, ERA1, 1)
  }
  throw new Error('the bot did not reach Distill within 6000 s')
}

test('a full run reaches the first Distill, and the pane performs it with a confirm step', async ($, on) => {
  const ready = playToDistill()
  expect(ready.models).toContain('kin-0.3')
  const { toasts, entries } = setup(on, { [STORAGE_KEYS.save]: toSave(ready, NOW) })
  const pane = await openGame($)
  await pane.press({ key: 'ui:distill-ask' })
  await pane.press({ key: 'distill' })
  await pane.unmount()
  const after = saved(entries)
  expect(after.stats.distills).toBe(1)
  expect(after.logits).toBeGreaterThanOrEqual(8)
  expect(after.research).not.toContain('distillation')
  expect(after.agents).toEqual([])
  expect(after.log.map((l) => l.text)).toContain('it forgot almost everything. it kept what mattered.')
  expect(errorsIn(toasts)).toEqual([])
})
