// The Claude Code host adapter for toKin. It wires the core Game to the
// engine: /tokin opens the pane and starts the game, a tick every second
// moves the state, and the pane draws the view model from $.state. The mod
// stays dormant in a session until the player runs /tokin there.
//
// Every call on `$` sits in this file, because the plugin validator follows
// `$` only inside the file that holds the hooks.

import type { Hook, Register } from 'claude-code'

import { ERA1 } from '../content/era1'
import { Game } from '../core/game'
import { buildView } from '../core/view'
import { createPorts, newInstanceId, paneStore, publish } from './adapter'
import type { Bridge } from './adapter'
import { handleName, handlePress } from './controller'
import { drawPane } from './ui/pane'

// The engine interface a hook receives.
type Host = Parameters<Hook<'session.start'>>[0]

const PANE = 'tokin'

const openPane = { id: PANE, title: 'toKin', focus: true } as const

const VIEWER_LINE = 'running in another session. this pane is read-only.'

// The Game of this session. A hot reload drops it, and /tokin builds a new one.
let game: Game | null = null

// The state references. The engine needs plugin and key as literals.
const GAME_REF = { plugin: 'tokin', key: 'game' } as const
const ROLE_REF = { plugin: 'tokin', key: 'role' } as const
const PANE_REF = { plugin: 'tokin', key: 'pane' } as const

// The engine calls the adapter needs, as arrow functions over $.
function bridgeOf($: Host): Bridge {
  return {
    storeGet: key => $.store.get(key),
    storeSet: (key, value) => $.store.set(key, value),
    clockNow: () => $.clock.now(),
    clockEvery: (ms, fn) => $.clock.every(ms, fn),
    toast: text => $.ui.toast(text),
    setGame: state => $.state.set(GAME_REF, state),
    setRole: role => $.state.set(ROLE_REF, role),
    getPane: async () => (await $.state.get(PANE_REF)).value,
    setPane: ui => $.state.set(PANE_REF, ui),
  }
}

async function ensureGame(bridge: Bridge): Promise<Game> {
  if (game !== null) return game
  const created = new Game(await createPorts(bridge, newInstanceId(await bridge.clockNow())), ERA1)
  created.subscribe(snapshot => void publish(bridge, snapshot))
  game = created
  return created
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokin',
      description: 'Open the toKin game pane',
    })
    await ensureGame(bridgeOf($))

    return next(e)
  })

  on('command.run', { command: 'tokin' }, async $ => {
    const bridge = bridgeOf($)
    const current = await ensureGame(bridge)
    await current.start()
    await publish(bridge, current.snapshot())
    await $.ui.open(openPane)

    return { text: 'toKin pane opened.' }
  })

  on('session.end', async (_$, e, next) => {
    await game?.stop()

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    // Mobile has no Input element, so the founder prompt cannot draw there.
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text>toKin needs the terminal or the desktop app.</Text>
    }
    const kit = $.ui.resolve(e)
    const { Box, Text } = kit
    const state = (await $.state.get(GAME_REF)).value ?? null
    const role = (await $.state.get(ROLE_REF)).value ?? 'dormant'
    const ui = (await $.state.get(PANE_REF)).value
    if (state === null || role === 'dormant') {
      return <Text dimColor>Run /tokin to start toKin in this session.</Text>
    }
    const store = paneStore(bridgeOf($))

    return (
      <Box flexDirection="column">
        {role === 'viewer' && <Text dimColor>{VIEWER_LINE}</Text>}
        {drawPane({
          kit,
          view: buildView(state, ERA1),
          ui: ui ?? { confirmingDistill: false, notice: null },
          columns: e.props.bodyColumns,
          press: key => void (game && handlePress(game, store, key)),
          submitName: text => void (game && handleName(game, store, text)),
        })}
      </Box>
    )
  })
}
