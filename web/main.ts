// The browser entry. It builds the ports, starts the shared core Game with
// the Era 1 content, and draws the pane. Closing or leaving the tab saves
// and frees the ticker lock, so another open tab takes over at once.

import { ERA1 } from '../content/era1'
import { Game } from '../core/game'
import { mountApp } from './app'
import { installJsx } from './jsx'
import { createWebPorts, findLocalStorage, memoryStorage, webStorage } from './ports'
import { createToaster } from './toast'

const NO_STORAGE_LINE = 'this browser blocks storage. the game runs, but a reload starts over.'

function element(id: string): HTMLElement {
  const found = document.getElementById(id)
  if (found === null) throw new Error(`toKin: the page has no #${id}`)
  return found
}

installJsx()

const toast = createToaster(element('toasts'))
const local = findLocalStorage()
const game = new Game(createWebPorts({ storage: local === null ? memoryStorage() : webStorage(local), toast }), ERA1)

function start(): void {
  game.start().catch((error: unknown) => {
    toast(`toKin could not start: ${error instanceof Error ? error.message : String(error)}`)
  })
}

mountApp(element('app'), game)
if (local === null) toast(NO_STORAGE_LINE)
start()

addEventListener('pagehide', () => void game.stop())
// A page restored from the back-forward cache stopped on pagehide, so it starts again.
addEventListener('pageshow', (event: PageTransitionEvent) => {
  if (event.persisted) start()
})
