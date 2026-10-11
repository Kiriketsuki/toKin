// Maps a pressed key to a command. The pane gives every Button a key that
// encodes its Action, such as "buy:relay-rack". These functions are pure, so a
// ui.press handler and a test share one mapping and the pane keeps no state of
// its own beyond UiState.

import type { Action, ViewModel } from '../core/types'

// Pane-local values. This mirrors TokinPane in types/index.d.ts.
export interface UiState {
  readonly confirmingDistill: boolean
  readonly notice: string | null
}

export const INITIAL_UI: UiState = { confirmingDistill: false, notice: null }

export const KEY_ASK_DISTILL = 'ui:distill-ask'
export const KEY_CANCEL_DISTILL = 'ui:distill-cancel'
export const KEY_DISTILL = 'distill'
export const KEY_FOUNDER = 'founder-name'

export type UiCommand = 'askDistill' | 'cancelDistill'

export type KeyCommand =
  | { readonly kind: 'action'; readonly action: Action }
  | { readonly kind: 'ui'; readonly command: UiCommand }
  | { readonly kind: 'none' }

const NONE: KeyCommand = { kind: 'none' }

// Turns a Button key into a command. Distill needs the confirm step: the
// "distill" key does nothing until the player has asked and UiState says so.
export function resolveKey(view: ViewModel, key: string, ui: UiState): KeyCommand {
  if (key === KEY_ASK_DISTILL) return { kind: 'ui', command: 'askDistill' }
  if (key === KEY_CANCEL_DISTILL) return { kind: 'ui', command: 'cancelDistill' }
  if (key === KEY_DISTILL) {
    return ui.confirmingDistill && view.distill !== null ? { kind: 'action', action: { type: 'distill' } } : NONE
  }
  const option = view.actions.find((a) => a.id === key)
  return option ? { kind: 'action', action: option.action } : NONE
}

// The action a submitted founder name stands for. A blank name gives null.
export function founderAction(text: string): Action | null {
  const name = text.trim()
  return name.length === 0 ? null : { type: 'nameFounder', name }
}

// Applies a UI command to the pane state. It returns a new object.
export function reduceUi(ui: UiState, command: UiCommand): UiState {
  return { ...ui, confirmingDistill: command === 'askDistill', notice: null }
}

// The pane state after the host ran an action. Any action ends the confirm
// step, and a refusal reason becomes the notice.
export function afterAction(refusal: string | null): UiState {
  return { confirmingDistill: false, notice: refusal }
}
