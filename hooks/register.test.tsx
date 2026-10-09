import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

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

// The engine answers session.start and command.run beneath the plugins. The
// test hooks stand in for them and record the pane the plugin opens.
function setup(on: On, store: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  const writes: string[] = []
  const entries = new Map<string, unknown>(Object.entries(store))
  on('store.get', async (_$, e) => ({ value: entries.get(e.key) }))
  on('store.set', async (_$, e) => {
    writes.push(e.key)
    entries.set(e.key, e.value)
    return { value: undefined }
  })
  const opened: string[] = []
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('classic.StopFailure', async () => ({}))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', async (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  return { clock, opened, writes, entries }
}

async function boot($: Engine) {
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  return $.command.run({ command: 'tokin', args: '', origin: { kind: 'composer' } } as never)
}

function mountPane($: Engine, surface: (typeof SURFACES)[number] = 'terminal') {
  return $.ui.mount({ plugin: 'tokin', surface, component: 'Pane', requestId: 'tokin', props: paneProps() })
}

test('the pane asks for /tokin until the player runs it', async ($, on) => {
  setup(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const pane = await mountPane($)
  expect(await pane.find({ type: 'Text', text: /Run \/tokin/ })).toBeDefined()
  await pane.unmount()
})

test('/tokin opens the pane and shows the founder prompt on every surface', async ($, on) => {
  const { opened } = setup(on)
  const result = await boot($)
  expect(opened).toContain('tokin')
  expect(result).toBeDefined()
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await mountPane($, surface)
    expect(await pane.find({ key: 'founder-name' })).toBeDefined()
    await pane.unmount()
  }
})

test('naming the founder and pressing Work dispatches actions', async ($, on) => {
  setup(on)
  await boot($)
  let pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.unmount()
  pane = await mountPane($)
  expect(await pane.find({ key: 'founder-name' })).toBeUndefined()
  expect(await pane.find({ key: 'work' })).toBeDefined()
  await pane.press({ key: 'work' })
  await pane.press({ key: 'work' })
  await pane.unmount()
  pane = await mountPane($)
  expect(await pane.find({ type: 'Text', text: /\$1\.00/ })).toBeDefined()
  await pane.unmount()
})

test('a refused press leaves a notice in the pane', async ($, on) => {
  setup(on)
  await boot($)
  let pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.unmount()
  pane = await mountPane($)
  await pane.press({ key: 'buy:relay-rack' })
  await pane.unmount()
  pane = await mountPane($)
  expect(await pane.find({ type: 'Text', text: /not enough cash/ })).toBeDefined()
  await pane.unmount()
})

test('the clock ticks the game and the game saves to the plugin store', async ($, on) => {
  const { clock, writes } = setup(on)
  await boot($)
  const pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.unmount()
  const before = writes.filter(k => k === 'tokin.save').length
  await clock.advance(31_000)
  expect(writes.filter(k => k === 'tokin.save').length).toBeGreaterThan(before)
  expect(writes).toContain('tokin.lock')
})

const SUMMARY = { role: 'user' as const, text: 'summary', toolUses: [] }

async function named($: Engine) {
  await boot($)
  const pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.unmount()
}

async function countText($: Engine, text: RegExp): Promise<number> {
  const pane = await mountPane($)
  const found = await pane.findAll({ type: 'Text', text })
  await pane.unmount()
  return found.length
}

test('a real rate limit logs the supplier line once inside ten minutes', async ($, on) => {
  const { clock } = setup(on)
  await named($)
  await $.classic.StopFailure({ error: 'rate_limit' })
  await $.classic.StopFailure({ error: 'overloaded' })
  expect(await countText($, /punch-card supplier is out of stock/)).toBe(1)
  await clock.advance(601_000)
  await $.classic.StopFailure({ error: 'rate_limit' })
  expect(await countText($, /punch-card supplier is out of stock/)).toBe(2)
})

test('an error that is not a rate signal logs nothing', async ($, on) => {
  setup(on)
  await named($)
  await $.classic.StopFailure({ error: 'authentication_failed' })
  expect(await countText($, /punch-card supplier/)).toBe(0)
})

test('a compaction logs the ledger joke, a precompute does not', async ($, on) => {
  setup(on)
  on('session.compact', async () => ({ messages: [SUMMARY] }))
  await named($)
  await $.session.compact({ trigger: 'precompute', messages: [SUMMARY] })
  expect(await countText($, /ledger was boiled down/)).toBe(0)
  await $.session.compact({ trigger: 'manual', messages: [SUMMARY] })
  expect(await countText($, /ledger was boiled down/)).toBe(1)
})

test('/tokin stop saves, releases the lock and stops the clock', async ($, on) => {
  const { clock, entries } = setup(on)
  await named($)
  await clock.advance(2_000)
  const result = await $.command.run({ command: 'tokin', args: 'stop', origin: { kind: 'composer' } } as never)
  expect(JSON.stringify(result)).toContain('toKin stopped.')
  const lock = entries.get('tokin.lock') as { sessionId?: string } | undefined
  expect(lock?.sessionId).toBe('')
  const saved = JSON.stringify(entries.get('tokin.save'))
  await clock.advance(40_000)
  expect(JSON.stringify(entries.get('tokin.save'))).toBe(saved)
  const pane = await mountPane($)
  expect(await pane.find({ type: 'Text', text: /Run \/tokin/ })).toBeDefined()
  await pane.unmount()
})

test('the first lock claim uses the current time when /tokin runs long after session start', async ($, on) => {
  const { clock, entries } = setup(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await clock.advance(3 * 3600_000)
  await $.command.run({ command: 'tokin', args: '', origin: { kind: 'composer' } } as never)
  const lock = entries.get('tokin.lock') as { heartbeat: number }
  expect(lock.heartbeat).toBe(1_800_000_000_000 + 3 * 3600_000)
  await clock.advance(2_000)
  const pane = await mountPane($)
  await pane.input({ key: 'founder-name', text: 'Ada' })
  await pane.unmount()
  expect(await countText($, /you slept/)).toBeLessThanOrEqual(1)
})
