// Width helpers for the pane. A pane under NARROW_COLUMNS drops table columns.

export const NARROW_COLUMNS = 80

export function isNarrow(columns: number): boolean {
  return columns < NARROW_COLUMNS
}

// Cuts text to a width and marks the cut with a dot.
export function clip(text: string, width: number): string {
  if (width <= 0) return ''
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}.`
}

// Pads or cuts text to exactly width characters.
export function cell(text: string, width: number): string {
  return clip(text, width).padEnd(width)
}

// Joins table cells with two spaces. widths and cells pair up by index.
export function row(cells: readonly string[], widths: readonly number[]): string {
  return cells.map((c, i) => cell(c, widths[i] ?? c.length)).join('  ').trimEnd()
}
