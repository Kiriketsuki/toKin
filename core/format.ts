// Number and text formatting that every host shares. A host draws numbers
// through these functions, so the pane and a later standalone build agree.

const SUFFIXES: readonly (readonly [number, string])[] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
]

// Trims trailing zeros: 4.00 becomes 4, 3.50 becomes 3.5.
function trim(text: string): string {
  if (!text.includes('.')) return text
  const chars = [...text]
  while (chars.at(-1) === '0') chars.pop()
  if (chars.at(-1) === '.') chars.pop()
  return chars.join('')
}

// A short number: 4, 28.25, 1.5k, 2.4M. Negative values keep their sign.
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  for (const [size, suffix] of SUFFIXES) {
    if (abs >= size) return `${sign}${trim((abs / size).toFixed(2))}${suffix}`
  }
  const digits = abs >= 100 ? 1 : 2
  return `${sign}${trim(abs.toFixed(digits))}`
}

// A money amount without the currency sign: 5.00, 28.25, 1.5k.
export function fmtMoney(n: number): string {
  return Math.abs(n) < 1000 ? n.toFixed(2) : fmtNum(n)
}

// A span of seconds: 45s, 3m 20s, 2h 5m.
export function fmtDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes}m ${total % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// Fills {name} placeholders. A placeholder with no value stays as written.
export function fill(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = vars[key]
    return value === undefined ? whole : String(value)
  })
}
