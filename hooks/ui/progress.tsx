// Research, training and the shop.

import { fmtCompute, fmtDuration, fmtNum, fmtPercent } from '../../core/format'
import { ActionButton, Heading, optionFor } from './parts'
import type { Ctx } from './parts'

function researchStatus(ctx: Ctx, status: string, cost: number, seconds: number | null, lock: string | null): string {
  if (status === 'done') return 'done'
  if (status === 'locked') return lock ?? 'locked'
  const when = seconds === null ? '' : `, in ${fmtDuration(seconds)}`
  return `${fmtNum(cost)} RP${when}`
}

export function Research(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const rows = ctx.view.research.filter((r) => r.isVisible)
  if (rows.length === 0) return null
  return (
    <Box flexDirection="column" key="section:research">
      {Heading(ctx, 'Research')}
      {rows.map((r) => {
        const option = optionFor(ctx, `research:${r.id}`)
        const status = researchStatus(ctx, r.status, r.cost, r.secondsToAfford, r.lockReason)
        return (
          <Box flexDirection="column" key={r.id}>
            <Box flexDirection="row" columnGap={1}>
              {option && r.status !== 'done' ? ActionButton(ctx, { ...option, label: r.name }) : <Text>{r.name}</Text>}
              <Text dimColor>{status}</Text>
            </Box>
            {!ctx.narrow && <Text dimColor>  {r.description}</Text>}
          </Box>
        )
      })}
    </Box>
  )
}

function activeRun(ctx: Ctx) {
  const { Text } = ctx.kit
  const run = ctx.view.training.active
  if (run === null) return null
  const left = run.secondsLeft === null ? 'stalled' : `${fmtDuration(run.secondsLeft)} left`
  const done = run.cost > 0 ? fmtPercent(run.progress / run.cost) : '0%'
  return (
    <Text>
      Training {run.model}: {done}, {fmtCompute(run.reservedFlops, ctx.view.computeUnit)} reserved, {left}
    </Text>
  )
}

export function Training(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const training = ctx.view.training
  if (!training.isUnlocked) return null
  const options = training.options
  return (
    <Box flexDirection="column" key="section:training">
      {Heading(ctx, 'Training')}
      {activeRun(ctx)}
      {training.active === null && options.length === 0 && <Text dimColor>No model left to train.</Text>}
      {training.active === null &&
        options.map((o) => {
          const option = optionFor(ctx, `train:${o.model}`)
          const time = o.secondsAtFree === null ? 'needs free compute' : `${fmtDuration(o.secondsAtFree)} on free compute`
          return (
            <Box flexDirection="row" columnGap={1} key={o.model}>
              {option ? ActionButton(ctx, option) : <Text>{o.model}</Text>}
              <Text dimColor>{time}</Text>
            </Box>
          )
        })}
    </Box>
  )
}

export function Shop(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const { shop } = ctx.view
  if (shop.length === 0) return null
  return (
    <Box flexDirection="column" key="section:shop">
      {Heading(ctx, 'Logit shop')}
      {shop.map((s) => {
        const option = optionFor(ctx, `shop:${s.id}`)
        const level = s.maxLevel === null ? `L${s.level}` : `L${s.level}/${s.maxLevel}`
        const cost = s.cost === null ? 'maxed' : `${fmtNum(s.cost)} Logits`
        return (
          <Box flexDirection="row" columnGap={1} key={s.id}>
            {option && s.cost !== null ? ActionButton(ctx, { ...option, label: s.name }) : <Text>{s.name}</Text>}
            <Text dimColor>
              {level}, {cost}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
