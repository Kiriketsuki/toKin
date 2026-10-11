// The globals the shared pane in ui/ compiles against in the browser.
// tsconfig.web.json reads this file in place of the Claude Code globals, so
// ui/ type-checks against both hosts. web/jsx.ts installs h and Fragment at
// run time. JSX.Element is a Preact element, and there are no intrinsic
// (string) tags: the pane draws only with its kit.

import type { VNode } from 'preact'

declare global {
  const h: (
    tag: string | ((props: never) => VNode<any> | null | undefined),
    props: Record<string, unknown> | null | undefined,
    ...children: unknown[]
  ) => VNode<any>

  const Fragment: (props: { children?: unknown }) => VNode<any>

  namespace JSX {
    type Element = VNode<any>
    type ElementType = (props: never) => VNode<any> | null | undefined
    interface IntrinsicElements {}
    interface ElementChildrenAttribute {
      children: unknown
    }
    interface IntrinsicAttributes {
      key?: string
    }
  }
}

export {}
