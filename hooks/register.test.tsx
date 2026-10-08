import { expect, test } from 'claude-code/testing'

// The props the engine hands a docked pane.
function paneProps() {
  return {
    title: 'toKin',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  }
}

// The pane text names PORTS_VERSION from core/ports.ts. When it draws, the
// loader has followed the import from hooks/ into core/.
test('the pane draws a value imported from core/ on every surface', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'tokin', surface, component: 'Pane', requestId: 'tokin', props: paneProps() })
    expect(await pane.find({ type: 'Text', text: /Ports contract v1/ })).toBeDefined()
    await pane.unmount()
  }
})
