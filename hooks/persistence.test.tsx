// Host-level persistence tests: dormancy, the save round trip through the
// plugin store, offline catch-up, save loading after migration, and the
// ticker lock with a second session. Each test drives the real hooks module
// through the engine test kit, with the store and clock mocked beneath it.

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { ERA1 } from '../content/era1'
import { apply } from '../core/actions'
import { STORAGE_KEYS } from '../core/ports'
import { toSave } from '../core/save'
import { initialState } from '../core/state'
import { step } from '../core/step'
import type { GameState } from '../core/types'

const NOW = 1_800_000_000_000

function paneProps() {
  return {
    title: 'toKin',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  }
}

// The test hooks stand in for the engine beneath the plugin. They record
// every store read and write, so a test can prove what the plugin touched.
function setup(on: On, store: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: NOW })
  const reads: string[] = []
  const writes: string[] = []
  const entries = new Map<string, unknown>(Object.entries(store))
  on('store.get', async (_$, e) => {
    reads.push(e.key)
    return { value: entries.get(e.key) }
  })
  on('store.set', async (_$, e) => {
    writes.push(e.key)
    entries.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  return { clock, reads, writes, entries }
}

function startSession($: Engine) {
  return $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
}

function runTokin($: Engine, args = '') {
  return $.command.run({ command: 'tokin', args, origin: { kind: 'composer' } } as never)
}

function mountPane($: Engine) {
  return $.ui.mount({ plugin: 'tokin', surface: 'terminal', component: 'Pane', requestId: 'tokin', props: paneProps() })
}

// A founder with one Relay Rack and one kin-0.1 agent on Earn, so time makes cash.
function earningState(): GameState {
  let state = apply(initialState(7, ERA1), ERA1, { type: 'nameFounder', name: 'Ada' })
  for (let i = 0; i < 200; i++) state = apply(state, ERA1, { type: 'work' })
  state = apply(state, ERA1, { type: 'buyMachine', machine: 'relay-rack' })
  return apply(state, ERA1, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })
}

function savedState(entries: Map<string, unknown>): GameState {
  return entries.get(STORAGE_KEYS.save) as GameState
}

test('a session that never runs /tokin reads and writes nothing in the store', async ($, on) => {
  const { clock, reads, writes } = setup(on)
  await startSession($)
  await clock.advance(60_000)
  expect(reads.length).toBe(0)
  expect(writes.length).toBe(0)
})

test('the save round-trips through the plugin store across a stop and a restart', async ($, on) => {
  const { clock, entries } = setup(on)
  await startSession($)
  await runTokin($)
  const pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.press({ key: 'work' })
  await pane.unmount()
  await clock.advance(2_000)
  await runTokin($, 'stop')
  const stopped = savedState(entries)
  expect(stopped.founder).toBe('Ada')
  await runTokin($)
  const reloaded = savedState(entries)
  expect(reloaded.founder).toBe('Ada')
  expect(reloaded.seed).toBe(stopped.seed)
  expect(reloaded.cash).toBeGreaterThanOrEqual(stopped.cash)
})

test('offline catch-up matches the same time of live ticks within one percent', async ($, on) => {
  const away = 1800
  const before = earningState()
  const { entries } = setup(on, { [STORAGE_KEYS.save]: toSave(before, NOW - away * 1000) })
  await startSession($)
  await runTokin($)
  let live = before
  for (let i = 0; i < away; i++) live = step(live, ERA1, 1)
  const caught = savedState(entries)
  const gained = caught.cash - before.cash
  const expected = live.cash - before.cash
  expect(expected).toBeGreaterThan(0)
  expect(Math.abs(gained - expected) / expected).toBeLessThan(0.01)
})

test('a save from every schema version loads, and a newer one is kept aside', async ($, on) => {
  const current = earningState()
  const future = { ...toSave(current, NOW) as object, version: 999 }
  const { entries } = setup(on, { [STORAGE_KEYS.save]: future })
  await startSession($)
  await runTokin($)
  expect(entries.get('tokin.save.backup')).toEqual(future)
  expect(savedState(entries).version).toBe(current.version)
})

test('the current schema version loads with its founder and machines intact', async ($, on) => {
  const current = earningState()
  const { entries } = setup(on, { [STORAGE_KEYS.save]: toSave(current, NOW) })
  await startSession($)
  await runTokin($)
  const loaded = savedState(entries)
  expect(loaded.founder).toBe('Ada')
  expect(loaded.machines).toEqual(current.machines)
  expect(loaded.agents.length).toBe(1)
})

test('a second session runs read-only while another session holds a fresh lock', async ($, on) => {
  const current = earningState()
  const { clock, entries } = setup(on, {
    [STORAGE_KEYS.save]: toSave(current, NOW),
    [STORAGE_KEYS.lock]: { sessionId: 'session-a', heartbeat: NOW },
  })
  await startSession($)
  await runTokin($)
  const pane = await mountPane($)
  expect(await pane.find({ type: 'Text', text: /running in another session/ })).toBeDefined()
  await pane.unmount()
  const saved = JSON.stringify(entries.get(STORAGE_KEYS.save))
  // Session A keeps its heartbeat fresh, so this session never takes over.
  for (let i = 0; i < 5; i++) {
    entries.set(STORAGE_KEYS.lock, { sessionId: 'session-a', heartbeat: NOW + (i + 1) * 2_000 })
    await clock.advance(2_000)
  }
  expect(JSON.stringify(entries.get(STORAGE_KEYS.save))).toBe(saved)
  expect((entries.get(STORAGE_KEYS.lock) as { sessionId: string }).sessionId).toBe('session-a')
})
