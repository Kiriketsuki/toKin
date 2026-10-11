// The agents table, the contracts list and the machines list. Wide panes show
// every column. A pane under 80 columns drops the model and tok/s columns.

import { fmtCompute, fmtDollars, fmtDuration, fmtNum, fmtRate } from '../core/format'
import type { AgentOutput, AgentRow } from '../core/types'
import { row } from './layout'
import { ActionButton, ButtonRow, Heading, optionFor, optionsWith } from './parts'
import type { Ctx } from './parts'

function outputText(out: AgentOutput): string {
  switch (out.kind) {
    case 'cash':
      return `${fmtDollars(out.perSec)}/s on ${out.contract}`
    case 'rp':
      return `${fmtNum(out.perSec)} RP/s`
    case 'train':
      return `trains at ${fmtNum(out.flops)}`
    case 'idle':
      return `idle: ${out.reason}`
  }
}

function agentLine(ctx: Ctx, a: AgentRow): string {
  if (ctx.narrow) return row([a.name, a.job, outputText(a.output)], [12, 8, 30])
  return row([a.name, a.model, a.job, fmtRate(a.tokPerSec), outputText(a.output)], [14, 10, 9, 9, 36])
}

function agentBlock(ctx: Ctx, a: AgentRow) {
  const { Box, Text } = ctx.kit
  const manage = [...optionsWith(ctx, `assign:${a.id}:`), ...optionsWith(ctx, `remove:${a.id}`)]
  return (
    <Box flexDirection="column" key={a.id}>
      <Text>{agentLine(ctx, a)}</Text>
      {ButtonRow(ctx, manage)}
    </Box>
  )
}

export function Agents(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const { agents } = ctx.view
  return (
    <Box flexDirection="column" key="section:agents">
      {Heading(ctx, `Agents (${agents.length})`)}
      {agents.length === 0 && <Text dimColor>No agents yet.</Text>}
      {agents.map((a) => agentBlock(ctx, a))}
      {ButtonRow(ctx, optionsWith(ctx, 'create:'))}
    </Box>
  )
}

export function Contracts(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const { contracts } = ctx.view
  if (contracts.length === 0) return null
  return (
    <Box flexDirection="column" key="section:contracts">
      {Heading(ctx, 'Contracts')}
      {contracts.map((c) => {
        const option = optionFor(ctx, `pick:${c.id}`)
        const mark = c.isPicked || c.isAuto ? '*' : ' '
        const pay = `${fmtDollars(c.payPerToken)}/tok`
        const detail = ctx.narrow ? pay : `${pay}, needs ${fmtNum(c.minContext)} context, ${c.agents} agents`
        return (
          <Box flexDirection="row" columnGap={1} key={c.id}>
            <Text>{mark}</Text>
            {option ? ActionButton(ctx, option) : <Text>{c.name}</Text>}
            <Text dimColor>{detail}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

function afford(seconds: number | null, canAfford: boolean): string {
  if (canAfford) return 'ready'
  return seconds === null ? 'out of reach' : `in ${fmtDuration(seconds)}`
}

export function Machines(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const rows = ctx.view.machines.filter((m) => m.isVisible)
  return (
    <Box flexDirection="column" key="section:machines">
      {Heading(ctx, 'Machines')}
      {rows.map((m) => {
        const option = optionFor(ctx, `buy:${m.id}`)
        const power = ctx.narrow ? '' : `${fmtCompute(m.flops, ctx.view.computeUnit)} each, `
        return (
          <Box flexDirection="row" columnGap={1} key={m.id}>
            {option ? ActionButton(ctx, option) : <Text>{m.name}</Text>}
            <Text dimColor>
              x{m.owned}, {power}{afford(m.secondsToAfford, m.canAfford)}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
