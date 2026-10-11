// The browser page around the shared pane. It draws the view model with the
// Preact kit on every game snapshot, keeps the pane state (the Distill
// confirm step and the notice), and sends presses through the shared
// controller. It holds no game rule.

import { h, render } from 'preact'
import type { RefObject } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

import type { Game, Snapshot } from '../core/game'
import { handleName, handlePress } from '../ui/controller'
import type { PaneStore } from '../ui/controller'
import { afterAction, INITIAL_UI } from '../ui/keys'
import type { UiState } from '../ui/keys'
import { drawPane } from '../ui/pane'
import { PREACT_KIT } from './kit'

export const VIEWER_LINE = 'running in another tab. this tab is read-only.'
// The notice a press gets in a read-only tab.
export const VIEWER_NOTICE = 'running in another tab'
export const LOADING_LINE = 'opening the ledger.'

// The pane reads its width in characters, as a terminal pane does. Under 80
// it drops table columns.
const DEFAULT_COLUMNS = 100
const MIN_COLUMNS = 20

function charWidth(): number {
  const probe = document.createElement('span')
  probe.className = 'probe'
  probe.textContent = '0'.repeat(10)
  document.body.append(probe)
  const width = probe.getBoundingClientRect().width / 10
  probe.remove()
  return width > 0 ? width : 9
}

function useColumns(ref: RefObject<HTMLElement>): number {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof ResizeObserver === 'undefined') return
    const width = charWidth()
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setColumns(Math.max(MIN_COLUMNS, Math.floor(entry.contentRect.width / width)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return columns
}

function App(props: { readonly game: Game }) {
  const { game } = props
  const [snapshot, setSnapshot] = useState<Snapshot>(() => game.snapshot())
  const [ui, setUi] = useState<UiState>(INITIAL_UI)
  const latest = useRef(ui)
  const pane = useRef<HTMLDivElement>(null)
  const columns = useColumns(pane)

  useEffect(() => {
    const unsubscribe = game.subscribe(setSnapshot)
    setSnapshot(game.snapshot())
    return () => void unsubscribe()
  }, [game])

  // A tab that takes over the game drops the read-only notice.
  useEffect(() => {
    if (snapshot.role === 'ticker' && latest.current.notice === VIEWER_NOTICE) {
      latest.current = INITIAL_UI
      setUi(INITIAL_UI)
    }
  }, [snapshot.role])

  const store: PaneStore = {
    read: async () => latest.current,
    write: async (next) => {
      latest.current = next
      setUi(next)
    },
  }
  // A read-only tab answers every press with the host line, not the core refusal.
  const press = (key: string): void => {
    if (game.snapshot().role === 'viewer') void store.write(afterAction(VIEWER_NOTICE))
    else void handlePress(game, store, key)
  }
  const submitName = (text: string): void => void handleName(game, store, text)
  const view = snapshot.state === null ? null : game.view()

  return (
    <div class="pane" ref={pane}>
      {snapshot.role === 'viewer' && (
        <p class="viewer" role="status">
          {VIEWER_LINE}
        </p>
      )}
      {view === null ? (
        <p class="loading">{LOADING_LINE}</p>
      ) : (
        drawPane({ kit: PREACT_KIT, view, ui, columns, press, submitName })
      )}
    </div>
  )
}

export function mountApp(root: HTMLElement, game: Game): void {
  render(<App game={game} />, root)
}
