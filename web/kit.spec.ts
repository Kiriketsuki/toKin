import { beforeAll, describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'

import { INITIAL_UI } from '../ui/keys'
import { distillView, freshView, playingView } from '../ui/fixtures'
import { drawPane } from '../ui/pane'
import type { PaneInput } from '../ui/pane'
import { COLOR } from '../ui/theme'
import { installJsx, kitH } from './jsx'
import { Button, PREACT_KIT, Text } from './kit'

beforeAll(() => installJsx())

function draw(input: Partial<PaneInput> & Pick<PaneInput, 'view'>): string {
  const pane = drawPane({
    kit: PREACT_KIT,
    ui: INITIAL_UI,
    columns: 100,
    press: () => undefined,
    submitName: () => undefined,
    ...input,
  })
  return renderToString(pane)
}

// The data-key of every Button and Input in the markup, in order.
function keysIn(html: string): string[] {
  return [...html.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1] ?? '')
}

describe('the Preact kit draws the shared pane', () => {
  test('the first run shows only the founder prompt', () => {
    const html = draw({ view: freshView() })
    expect(keysIn(html)).toEqual(['founder-name'])
    expect(html).toContain('Founder name')
    expect(html).not.toContain('Machines')
  })

  test('the sections draw, with a button for each shown action', () => {
    const view = playingView()
    const html = draw({ view })
    for (const title of ['Machines', 'Agents', 'Contracts', 'Log', 'tok/s', 'compute', 'Ada']) {
      expect(html).toContain(title)
    }
    const keys = keysIn(html)
    expect(keys).toContain('work')
    expect(keys).toContain('buy:relay-rack')
    const ids = new Set(view.actions.map((a) => a.id))
    for (const key of keys) expect(ids.has(key) || key.startsWith('ui:')).toBe(true)
  })

  test('a refused action draws as a dim button', () => {
    const view = playingView()
    const refused = view.actions.find((a) => !a.enabled)
    expect(refused).toBeDefined()
    const html = draw({ view })
    expect(html).toMatch(new RegExp(`class="button button-dim" data-key="${refused?.id}"`))
  })

  test('a narrow pane draws fewer characters than a wide one', () => {
    const view = playingView()
    expect(draw({ view, columns: 60 }).length).toBeLessThan(draw({ view, columns: 120 }).length)
  })

  test('Distill shows the confirm buttons only after the ask', () => {
    const view = distillView()
    expect(keysIn(draw({ view }))).toContain('ui:distill-ask')
    const confirming = keysIn(draw({ view, ui: { confirmingDistill: true, notice: null } }))
    expect(confirming).toContain('distill')
    expect(confirming).toContain('ui:distill-cancel')
  })
})

describe('the kit elements', () => {
  test('h hands a kit element its key and children, as the Claude Code engine does', () => {
    const element = kitH(Button as never, { key: 'work', label: 'Work', onPress: () => undefined })
    expect(renderToString(element as never)).toBe('<button type="button" class="button" data-key="work">Work</button>')
    const text = kitH(Text as never, { bold: true }, 'a', 'b')
    expect(renderToString(text as never)).toBe('<span class="text text-bold">ab</span>')
  })

  test('a theme color becomes a tone class, and any other color draws inline', () => {
    expect(renderToString(Text({ color: COLOR.warn, children: 'x' }) as never)).toContain('tone-warn')
    expect(renderToString(Text({ color: '#123456', children: 'x' }) as never)).toContain('color:#123456')
  })

  test('a press calls onPress', () => {
    let pressed = 0
    const element = Button({ key: 'work', label: 'Work', onPress: () => (pressed += 1) })
    ;(element.props as { onClick: () => void }).onClick()
    expect(pressed).toBe(1)
  })
})
