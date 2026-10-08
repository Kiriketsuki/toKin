// The pane body. drawPane is a pure function of the view model, the pane
// state and the width. The host adapter resolves the element kit and wires
// press and submitName to the engine.

import { KEY_FOUNDER } from './keys'
import { Header } from './header'
import { Distill, Log } from './footer'
import { Agents, Contracts, Machines } from './tables'
import { Research, Shop, Training } from './progress'
import { ActionButton, Heading, makeCtx, optionFor } from './parts'
import type { Ctx, Kit } from './parts'
import type { UiState } from './keys'
import type { ViewModel } from '../../core/types'

export type { Kit } from './parts'

export interface PaneInput {
  readonly kit: Kit
  readonly view: ViewModel
  readonly ui: UiState
  readonly columns: number
  readonly press: (key: string) => void
  readonly submitName: (text: string) => void
}

// First run: ask for the founder name before anything else shows.
function FounderPrompt(ctx: Ctx) {
  const { Box, Text, Input } = ctx.kit
  return (
    <Box flexDirection="column" key="section:founder">
      {Heading(ctx, 'toKin')}
      <Text>A cold room. A machine. You need a name on the paperwork.</Text>
      <Input
        key={KEY_FOUNDER}
        label="Founder name"
        placeholder="type a name"
        submitLabel="found"
        autoFocus
        onSubmit={(text) => ctx.submitName(text)}
      />
      {ctx.ui.notice !== null && <Text>{ctx.ui.notice}</Text>}
    </Box>
  )
}

function WorkButton(ctx: Ctx) {
  const work = optionFor(ctx, 'work')
  return work ? ActionButton(ctx, work) : null
}

export function drawPane(input: PaneInput) {
  const ctx = makeCtx(input.kit, input.view, input.ui, input.columns, input.press, input.submitName)
  const { Box } = ctx.kit
  if (ctx.view.needsFounder) return FounderPrompt(ctx)
  return (
    <Box flexDirection="column" rowGap={1}>
      {Header(ctx)}
      {WorkButton(ctx)}
      {Machines(ctx)}
      {Agents(ctx)}
      {Contracts(ctx)}
      {Research(ctx)}
      {Training(ctx)}
      {Shop(ctx)}
      {Distill(ctx)}
      {Log(ctx)}
    </Box>
  )
}
