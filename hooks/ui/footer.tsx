// The log and the Distill preview with its confirm step.

import { fmtNum } from '../../core/format'
import { KEY_ASK_DISTILL, KEY_CANCEL_DISTILL, KEY_DISTILL } from './keys'
import { Heading } from './parts'
import type { Ctx } from './parts'
import { COLOR } from './theme'

const LOG_LINES = 8

export function Log(ctx: Ctx) {
  const { Box, Text } = ctx.kit
  const lines = ctx.view.log.slice(-LOG_LINES)
  return (
    <Box flexDirection="column" key="section:log">
      {Heading(ctx, 'Log')}
      {lines.length === 0 && <Text dimColor>Quiet.</Text>}
      {lines.map((l, i) => (
        <Text key={`${l.t}:${i}`} dimColor={i < lines.length - 1}>
          {l.text}
        </Text>
      ))}
    </Box>
  )
}

function confirmStep(ctx: Ctx, logits: number) {
  const { Box, Text, Button } = ctx.kit
  return (
    <Box flexDirection="column">
      <Text color={COLOR.warn}>Distill now for {fmtNum(logits)} Logits? The reset cannot be undone.</Text>
      <Box flexDirection="row" columnGap={1}>
        <Button key={KEY_DISTILL} label="Confirm Distill" variant="primary" onPress={() => ctx.press(KEY_DISTILL)} />
        <Button key={KEY_CANCEL_DISTILL} label="Cancel" onPress={() => ctx.press(KEY_CANCEL_DISTILL)} />
      </Box>
    </Box>
  )
}

export function Distill(ctx: Ctx) {
  const { Box, Text, Button } = ctx.kit
  const preview = ctx.view.distill
  if (preview === null) return null
  return (
    <Box flexDirection="column" key="section:distill">
      {Heading(ctx, 'Distill')}
      <Text>Payout: {fmtNum(preview.logits)} Logits</Text>
      {!ctx.narrow && <Text dimColor>Resets: {preview.resets.join(', ')}</Text>}
      {!ctx.narrow && <Text dimColor>Keeps: {preview.keeps.join(', ')}</Text>}
      {ctx.ui.confirmingDistill && preview.canDistill ? (
        confirmStep(ctx, preview.logits)
      ) : (
        <Button
          key={KEY_ASK_DISTILL}
          label="Distill..."
          dimColor={!preview.canDistill}
          onPress={() => ctx.press(KEY_ASK_DISTILL)}
        />
      )}
    </Box>
  )
}
