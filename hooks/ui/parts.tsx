// Shared pieces for the pane sections. Every section takes a Ctx and draws
// only from ctx.view, so the pane never reads game state.

import type { Elements } from 'claude-code'

import type { ActionOption, ViewModel } from '../../core/types'
import { isNarrow } from './layout'
import type { UiState } from './keys'
import { COLOR } from './theme'

// The element constructors the pane needs. Mobile has no Input, so the pane
// draws only on terminal and desktop.
export type Kit = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button' | 'Input'>

export interface Ctx {
  readonly kit: Kit
  readonly view: ViewModel
  readonly ui: UiState
  readonly columns: number
  readonly narrow: boolean
  // Called with the Button key. The host maps it with resolveKey.
  readonly press: (key: string) => void
  readonly submitName: (text: string) => void
}

export function makeCtx(
  kit: Kit,
  view: ViewModel,
  ui: UiState,
  columns: number,
  press: (key: string) => void,
  submitName: (text: string) => void,
): Ctx {
  return { kit, view, ui, columns, narrow: isNarrow(columns), press, submitName }
}

export function Heading(ctx: Ctx, title: string) {
  const { Text } = ctx.kit
  return (
    <Text bold color={COLOR.title}>
      {title}
    </Text>
  )
}

// A Button whose key is the ActionOption id. A disabled option draws dim,
// and the core refuses the press with the reason.
export function ActionButton(ctx: Ctx, option: ActionOption) {
  const { Button } = ctx.kit
  return (
    <Button key={option.id} label={option.label} dimColor={!option.enabled} onPress={() => ctx.press(option.id)} />
  )
}

export function ButtonRow(ctx: Ctx, options: readonly ActionOption[]) {
  const { Box } = ctx.kit
  if (options.length === 0) return null
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
      {options.map((o) => ActionButton(ctx, o))}
    </Box>
  )
}

// The options whose id starts with a prefix, in view order.
export function optionsWith(ctx: Ctx, prefix: string): readonly ActionOption[] {
  return ctx.view.actions.filter((a) => a.id.startsWith(prefix))
}

export function optionFor(ctx: Ctx, id: string): ActionOption | undefined {
  return ctx.view.actions.find((a) => a.id === id)
}
