// The Preact kit. It draws the shared pane in ui/ with DOM elements: Box is
// a flex div, Text a span, Button a button and Input a small form. Each
// element keeps the Claude Code meaning of its props, and each Button and
// Input carries its key as data-key, so a test finds it the way a Claude
// Code test does.

import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

import type { BoxProps, ButtonProps, InputProps, Kit, TextProps, UiElement } from '../ui/kit'
import { COLOR } from '../ui/theme'

// The theme colors map to CSS classes, so the page can retune them for a
// light or a dark background. Any other color draws as given.
const TONES: ReadonlyMap<string, string> = new Map([
  [COLOR.title, 'tone-title'],
  [COLOR.good, 'tone-good'],
  [COLOR.warn, 'tone-warn'],
  [COLOR.info, 'tone-info'],
])

function classes(...names: readonly (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

// A gap of 1 is one text row or one character, as in a terminal.
function gapStyle(props: BoxProps): Record<string, string> {
  const style: Record<string, string> = {}
  if (props.rowGap !== undefined) style.rowGap = `calc(${props.rowGap} * var(--row))`
  if (props.columnGap !== undefined) style.columnGap = `${props.columnGap}ch`
  return style
}

export function Box(props: BoxProps): UiElement {
  const direction = props.flexDirection ?? 'row'
  const className = classes('box', `box-${direction}`, props.flexWrap === 'wrap' && 'box-wrap')
  return h('div', { key: props.key, class: className, style: gapStyle(props) }, props.children as never)
}

export function Text(props: TextProps): UiElement {
  const tone = props.color === undefined ? undefined : TONES.get(props.color)
  const style = props.color !== undefined && tone === undefined ? { color: props.color } : undefined
  const className = classes('text', props.bold && 'text-bold', props.dimColor && 'text-dim', tone)
  return h('span', { key: props.key, class: className, style }, props.children as never)
}

// A dim Button still presses. The core refuses the action and the pane shows the reason.
export function Button(props: ButtonProps): UiElement {
  const className = classes('button', props.dimColor && 'button-dim', props.variant === 'primary' && 'button-primary')
  return h(
    'button',
    { key: props.key, type: 'button', class: className, 'data-key': props.key, onClick: () => props.onPress() },
    props.label,
  )
}

interface FieldProps extends Omit<InputProps, 'key'> {
  readonly fieldKey: string
}

function Field(props: FieldProps): UiElement {
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (props.autoFocus) input.current?.focus()
  }, [])
  const submit = (event: Event): void => {
    event.preventDefault()
    props.onSubmit(value)
  }
  return h(
    'form',
    { class: 'field', 'data-key': props.fieldKey, onSubmit: submit },
    props.label !== undefined && h('label', { class: 'field-label', for: props.fieldKey }, props.label),
    h('input', {
      ref: input,
      id: props.fieldKey,
      class: 'field-input',
      value,
      placeholder: props.placeholder,
      autoComplete: 'off',
      spellcheck: false,
      onInput: (event: Event) => setValue((event.currentTarget as HTMLInputElement).value),
    }),
    h('button', { type: 'submit', class: 'button button-primary' }, props.submitLabel ?? 'ok'),
  )
}

export function Input(props: InputProps): UiElement {
  const { key, ...rest } = props
  return h(Field, { key, fieldKey: key, ...rest })
}

export const PREACT_KIT: Kit = { Box, Text, Button, Input }
