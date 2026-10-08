// The header: founder, year, cash, compute, tok/s, RP and Logits.

import { fmtDollars, fmtNum, fmtPercent, fmtRate } from '../../core/format'
import type { Ctx } from './parts'
import { COLOR } from './theme'

function computeLine(ctx: Ctx): string {
  const { compute } = ctx.view.header
  const unit = ctx.view.computeUnit
  const used = `compute ${fmtNum(compute.used)}/${fmtNum(compute.total)} ${unit}`
  return `${used}, wasted ${fmtNum(compute.wasted)}`
}

function logitsLine(ctx: Ctx): string {
  const head = ctx.view.header
  const bonus = head.logitBonus > 0 ? ` (+${fmtPercent(head.logitBonus)} tok/s)` : ''
  return `Logits ${fmtNum(head.logits)}${bonus}`
}

export function Header(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const head = ctx.view.header
  const wasteful = head.compute.wasted > 0
  return (
    <Box flexDirection="column" key="section:header">
      <Text bold>
        toKin | {head.founder ?? 'unnamed founder'} | {head.year}
      </Text>
      <Text>
        <Text color={COLOR.good}>{fmtDollars(head.cash)}</Text> ({fmtRate(head.cashPerSec)}) | {fmtNum(head.tokPerSec)} tok/s
      </Text>
      <Text color={wasteful ? COLOR.warn : undefined}>{computeLine(ctx)}</Text>
      <Text>
        RP {fmtNum(head.rp)} ({fmtRate(head.rpPerSec)}) | {logitsLine(ctx)}
      </Text>
      {ctx.ui.notice !== null && <Text color={COLOR.warn}>{ctx.ui.notice}</Text>}
    </Box>
  )
}
