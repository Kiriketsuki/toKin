// The element kit the pane draws with. Each host passes its own: the Claude
// Code mod passes the elements of $.ui.resolve, and the browser passes the
// Preact kit in web/kit.ts. The pane names only the props below, so each
// host maps a small, fixed set.
//
// JSX in ui/ compiles to calls on a global h, and every tag is a function
// from this kit. Both hosts give h the same contract: it calls a function
// tag at once with its props, key and children included. So a kit element
// sees its own key.
//
// JSX.Element is the element type of the host that type-checks the pane.
// tsconfig.json checks ui/ against the Claude Code globals, and
// tsconfig.web.json checks it against the browser globals in web/env.d.ts.

export type UiElement = JSX.Element

export type UiChildren = UiElement | string | number | boolean | null | undefined | readonly UiChildren[]

export interface BoxProps {
  readonly key?: string
  readonly flexDirection?: 'row' | 'column'
  readonly flexWrap?: 'wrap'
  readonly rowGap?: number
  readonly columnGap?: number
  readonly children?: UiChildren
}

export interface TextProps {
  readonly key?: string
  readonly bold?: boolean
  readonly dimColor?: boolean
  // A color from ui/theme.ts. A host may map it to its own palette.
  readonly color?: string
  readonly children?: UiChildren
}

export interface ButtonProps {
  readonly key?: string
  readonly label: string
  readonly dimColor?: boolean
  readonly variant?: 'primary' | 'secondary'
  readonly onPress: () => void
}

export interface InputProps {
  readonly key: string
  readonly label?: string
  readonly placeholder?: string
  readonly submitLabel?: string
  readonly autoFocus?: true
  readonly onSubmit: (value: string) => void
}

export interface Kit {
  readonly Box: (props: BoxProps) => UiElement
  readonly Text: (props: TextProps) => UiElement
  readonly Button: (props: ButtonProps) => UiElement
  readonly Input: (props: InputProps) => UiElement
}
