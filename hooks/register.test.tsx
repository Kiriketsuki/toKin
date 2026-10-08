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
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', async (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  return { clock, opened, writes }
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
