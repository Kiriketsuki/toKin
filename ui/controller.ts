// Turns pane input into game calls. A button key and a founder name arrive
// here from the pane. The controller maps them with ui/keys.ts, sends
// the Action to the game and stores the pane notice. It holds no game rule.

import type { Game } from '../core/game'
import type { UiState } from './keys'
import { afterAction, founderAction, reduceUi, resolveKey } from './keys'

// Where the pane keeps its own state between presses.
export interface PaneStore {
  read(): Promise<UiState>
  write(ui: UiState): Promise<void>
}

export async function handlePress(game: Game, store: PaneStore, key: string): Promise<void> {
  const view = game.view()
  if (view === null) return
  const ui = await store.read()
  const command = resolveKey(view, key, ui)
  if (command.kind === 'ui') await store.write(reduceUi(ui, command.command))
  else if (command.kind === 'action') {
    const verdict = game.dispatch(command.action)
    await store.write(afterAction(verdict.ok ? null : verdict.reason))
  }
}

export async function handleName(game: Game, store: PaneStore, text: string): Promise<void> {
  const action = founderAction(text)
  if (action === null) {
    await store.write(afterAction('a name needs at least one letter'))
    return
  }
  const verdict = game.dispatch(action)
  await store.write(afterAction(verdict.ok ? null : verdict.reason))
}
