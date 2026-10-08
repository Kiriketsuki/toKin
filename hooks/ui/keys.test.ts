import { expect, test } from 'claude-code/testing'

import { afterAction, founderAction, INITIAL_UI, reduceUi, resolveKey } from './keys'
import { distillView, playingView } from './fixtures'

test('a buy key resolves to the buyMachine action', () => {
  const view = playingView()
  const cmd = resolveKey(view, 'buy:relay-rack', INITIAL_UI)
  expect(cmd).toEqual({ kind: 'action', action: { type: 'buyMachine', machine: 'relay-rack' } })
})

test('the work key resolves to the work action', () => {
  expect(resolveKey(playingView(), 'work', INITIAL_UI)).toEqual({ kind: 'action', action: { type: 'work' } })
})

test('an unknown key resolves to none', () => {
  expect(resolveKey(playingView(), 'buy:no-such-thing', INITIAL_UI).kind).toBe('none')
})

test('Distill needs the confirm step', () => {
  const view = distillView()
  expect(resolveKey(view, 'distill', INITIAL_UI).kind).toBe('none')
  const asked = reduceUi(INITIAL_UI, 'askDistill')
  expect(asked.confirmingDistill).toBe(true)
  expect(resolveKey(view, 'distill', asked)).toEqual({ kind: 'action', action: { type: 'distill' } })
  expect(reduceUi(asked, 'cancelDistill').confirmingDistill).toBe(false)
  expect(afterAction(null).confirmingDistill).toBe(false)
})

test('ask and cancel keys resolve to ui commands', () => {
  const view = distillView()
  expect(resolveKey(view, 'ui:distill-ask', INITIAL_UI)).toEqual({ kind: 'ui', command: 'askDistill' })
  expect(resolveKey(view, 'ui:distill-cancel', INITIAL_UI)).toEqual({ kind: 'ui', command: 'cancelDistill' })
})

test('founderAction trims the name and refuses a blank one', () => {
  expect(founderAction('  Ada ')).toEqual({ type: 'nameFounder', name: 'Ada' })
  expect(founderAction('   ')).toBeNull()
})
