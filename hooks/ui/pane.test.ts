import { expect, test } from 'claude-code/testing'

import type { Action, ViewModel } from '../../core/types'
import { distillView, freshView, playingView } from './fixtures'
import { founderAction, INITIAL_UI, reduceUi, resolveKey } from './keys'
import type { UiState } from './keys'
import { drawPane } from './pane'

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
