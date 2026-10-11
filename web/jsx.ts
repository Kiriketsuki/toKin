// The JSX factory the shared pane compiles against in the browser. JSX in
// ui/ calls a global h, as it does inside Claude Code. The engine's h calls a
// function tag at once with its props, key and children included, so this h
// does the same for the kit elements. A string tag goes to Preact.

import { h as preactH } from 'preact'

import { Box } from './kit'

type Tag = string | ((props: Record<string, unknown>) => unknown)

export function kitH(tag: Tag, props: Record<string, unknown> | null | undefined, ...children: unknown[]) {
  if (typeof tag !== 'function') return preactH(tag, props ?? null, ...(children as never[]))
  const all: Record<string, unknown> = { ...(props ?? {}) }
  if (children.length === 1) all.children = children[0]
  else if (children.length > 1) all.children = children
  return tag(all)
}

// `<>...</>` is a column Box, as it is in Claude Code.
export function KitFragment(props: { children?: unknown }) {
  return Box({ flexDirection: 'column', children: props.children as never })
}

// Installs h and Fragment as globals. The browser entry calls it once,
// before the first draw.
export function installJsx(): void {
  Object.assign(globalThis, { h: kitH, Fragment: KitFragment })
}
