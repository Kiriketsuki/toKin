import { expect, test } from 'claude-code/testing'

import type { Action, ViewModel } from '../core/types'
import { distillView, freshView, playingView } from '../ui/fixtures'
import { founderAction, INITIAL_UI, reduceUi, resolveKey } from '../ui/keys'
import type { UiState } from '../ui/keys'
import { drawPane } from '../ui/pane'

const SURFACES = ['terminal', 'desktop'] as const

function paneProps(columns: number) {
  return {
    title: 'toKin',
    isFocused: true,
    bodyColumns: columns,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  }
}

// Registers a test hook that draws the pane on a request id the real adapter
// does not use. It must run before the test first touches $. The hook records
// every Action a press or a submit makes in rig.actions.
function makeRig(on: any, requestId: string, view: ViewModel, columns: number) {
  const rig = { actions: [] as Action[], ui: INITIAL_UI as UiState }
  on('ui.render', { component: 'Pane', requestId }, async ($: any, e: any) => {
    const press = (key: string) => {
      const cmd = resolveKey(view, key, rig.ui)
      if (cmd.kind === 'ui') {
        rig.ui = reduceUi(rig.ui, cmd.command)
      }
      if (cmd.kind === 'action') rig.actions.push(cmd.action)
    }
    const submitName = (text: string) => {
      const action = founderAction(text)
      if (action) rig.actions.push(action)
    }
    return drawPane({ kit: $.ui.resolve(e), view, ui: rig.ui, columns: e.props.bodyColumns, press, submitName })
  })
  // The test hook cannot invalidate, so a test remounts to see new pane state.
  const mount = (ui: any, surface: 'terminal' | 'desktop', keepUi = false) => {
    rig.actions = []
    if (!keepUi) rig.ui = INITIAL_UI
    return ui.mount({ plugin: 'test', surface, component: 'Pane', requestId, props: paneProps(columns) })
  }
  return { rig, mount }
}

test('the sections draw on every surface', async ($, on) => {
  const { mount } = makeRig(on, 'ui-test', playingView(), 100)
  for (const surface of SURFACES) {
    const mounted = await mount($.ui, surface)
    for (const title of [/Machines/, /Agents/, /Contracts/, /Log/, /RP /, /tok\/s/, /compute/]) {
      expect(await mounted.find({ type: 'Text', text: title })).toBeDefined()
    }
    expect(await mounted.find({ type: 'Text', text: /Ada/ })).toBeDefined()
    await mounted.unmount()
  }
})

test('a press on the buy button yields the buyMachine action', async ($, on) => {
  const { rig, mount } = makeRig(on, 'ui-test', playingView(), 100)
  for (const surface of SURFACES) {
    const mounted = await mount($.ui, surface)
    await mounted.press({ key: 'buy:relay-rack' })
    expect(rig.actions).toEqual([{ type: 'buyMachine', machine: 'relay-rack' }])
    await mounted.press({ key: 'work' })
    expect(rig.actions.at(-1)).toEqual({ type: 'work' })
    await mounted.unmount()
  }
})

test('the first run shows the founder prompt and submits the name', async ($, on) => {
  const { rig, mount } = makeRig(on, 'ui-test', freshView(), 100)
  const mounted = await mount($.ui, 'terminal')
  expect(await mounted.find({ key: 'founder-name' })).toBeDefined()
  expect(await mounted.find({ type: 'Text', text: /Machines/ })).toBeUndefined()
  await mounted.input({ key: 'founder-name', text: 'Grace' })
  expect(rig.actions).toEqual([{ type: 'nameFounder', name: 'Grace' }])
  await mounted.unmount()
})

test('a narrow pane draws fewer text columns than a wide one', async ($, on) => {
  const wide = makeRig(on, 'ui-wide', playingView(), 100)
  const narrow = makeRig(on, 'ui-narrow', playingView(), 50)
  const w = await wide.mount($.ui, 'terminal')
  const n = await narrow.mount($.ui, 'terminal')
  const wideText = await w.findAll({ type: 'Text' })
  const narrowText = await n.findAll({ type: 'Text' })
  expect(narrowText.length).toBeLessThanOrEqual(wideText.length)
  expect(await n.find({ type: 'Text', text: /each,/ })).toBeUndefined()
  expect(await w.find({ type: 'Text', text: /each,/ })).toBeDefined()
  await w.unmount()
  await n.unmount()
})

test('Distill shows a preview and acts only after the confirm step', async ($, on) => {
  const { rig, mount } = makeRig(on, 'ui-test', distillView(), 100)
  const mounted = await mount($.ui, 'terminal')
  expect(await mounted.find({ type: 'Text', text: /Payout: 3 Logits/ })).toBeDefined()
  await mounted.press({ key: 'ui:distill-ask' })
  expect(rig.ui.confirmingDistill).toBe(true)
  expect(rig.actions).toEqual([])
  expect(await mounted.find({ key: 'distill' })).toBeUndefined()
  await mounted.unmount()
  const confirming = await mount($.ui, 'terminal', true)
  expect(await confirming.find({ key: 'distill' })).toBeDefined()
  await confirming.press({ key: 'distill' })
  expect(rig.actions).toEqual([{ type: 'distill' }])
  await confirming.unmount()
})

// The reveal rule lives in the view model (isVisible). The pane must draw only
// the machines the view marks visible, and must show the time to afford.
test('a machine shows only once the view reveals it, with its time to afford', async ($, on) => {
  const base = playingView()
  const target = base.machines[1]!
  const withTarget = (patch: Partial<typeof target>): ViewModel => ({
    ...base,
    machines: base.machines.map((m) => (m.id === target.id ? { ...m, ...patch } : m)),
  })
  const hidden = makeRig(on, 'ui-test-hidden', withTarget({ isVisible: false }), 100)
  const shown = makeRig(on, 'ui-test-shown', withTarget({ isVisible: true, canAfford: false, secondsToAfford: 90 }), 100)
  const stuck = makeRig(on, 'ui-test-stuck', withTarget({ isVisible: true, canAfford: false, secondsToAfford: null }), 100)

  const a = await hidden.mount($.ui, 'terminal')
  expect(await a.find({ key: target.id })).toBeUndefined()
  await a.unmount()

  const b = await shown.mount($.ui, 'terminal')
  expect(await b.find({ key: target.id })).toBeDefined()
  expect(await b.find({ type: 'Text', text: /in 1m|in 90s|in 1:30|in 1 /i })).toBeDefined()
  await b.unmount()

  const c = await stuck.mount($.ui, 'terminal')
  expect(await c.find({ type: 'Text', text: /out of reach/ })).toBeDefined()
  await c.unmount()
})
