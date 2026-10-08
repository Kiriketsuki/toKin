// The Claude Code host adapter for toKin. This first version registers
// /tokin and opens an empty pane. A later wave replaces it with the full
// wiring: the clock tick, the save, the ticker lock and the pane views.

import type { Register } from 'claude-code'

import { PORTS_VERSION } from '../core/ports'

const PANE = 'tokin'

const openPane = { id: PANE, title: 'toKin', focus: true } as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokin',
      description: 'Open the toKin game pane',
    })

    return next(e)
  })

  on('command.run', { command: 'tokin' }, async $ => {
    await $.ui.open(openPane)

    return { text: 'toKin pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text>toKin</Text>
        <Text dimColor>The garage is empty. Ports contract v{PORTS_VERSION}.</Text>
      </Box>
    )
  })
}
