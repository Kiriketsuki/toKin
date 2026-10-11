// Checks the portability boundary. The core and the content must run in any
// host, so they never import Claude Code, never touch its global $ API, and
// read no wall clock and no random source of their own. The shared pane in
// ui/ draws in every host, so it keeps the same rules. The sim and the
// browser host in web/ are hosts, so they may use their own platform, but
// they still never import Claude Code.
//
// Usage: bun scripts/check-boundary.ts
// It prints each violation and exits 1 when it finds any.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export type Violation = {
  readonly file: string
  readonly line: number
  readonly rule: string
  readonly text: string
}

type Zone = {
  readonly dir: string
  // A strict zone allows relative imports only, and no host globals.
  readonly isStrict: boolean
}

export const ZONES: readonly Zone[] = [
  { dir: 'core', isStrict: true },
  { dir: 'content', isStrict: true },
  { dir: 'ui', isStrict: true },
  { dir: 'sim', isStrict: false },
  { dir: 'web', isStrict: false },
]

const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const SPEC = /\.spec\.(ts|tsx)$/

// Globals a strict zone must not use. Specs may use them to build fixtures.
const HOST_GLOBALS: readonly { readonly rule: string; readonly pattern: RegExp }[] = [
  { rule: 'wall clock: Date.now', pattern: /\bDate\s*\.\s*now\b/ },
  { rule: 'wall clock: new Date', pattern: /\bnew\s+Date\b/ },
  { rule: 'unseeded random: Math.random', pattern: /\bMath\s*\.\s*random\b/ },
  { rule: 'host global: process', pattern: /(?<![\w$.])process\s*\./ },
  { rule: 'host global: Bun', pattern: /(?<![\w$.])Bun\s*\./ },
  { rule: 'host global: globalThis', pattern: /(?<![\w$.])globalThis\b/ },
  { rule: 'host global: console', pattern: /(?<![\w$.])console\s*\./ },
  { rule: 'host timer', pattern: /(?<![\w$.])(setTimeout|setInterval|queueMicrotask)\s*\(/ },
  { rule: 'dynamic load: require', pattern: /(?<![\w$.])require\s*\(/ },
  { rule: 'dynamic load: import()', pattern: /(?<![\w$.])import\s*\(/ },
]

// The engine API of a Claude Code hook is a lone $ identifier.
// A $ inside a name, or the ${ of a template, does not count.
const DOLLAR_API = /(?<![\w$\\])\$(?![\w${])/

// Finds where the module name of an import or export-from statement starts,
// and of a bare import. These run on text with strings blanked, so an import
// written inside a string does not count. The name is then read at the same
// offset from the text that keeps strings.
const IMPORT_FROM = /\b(?:import|export)\b[^;]*?\bfrom\s*(?=['"])/g
const IMPORT_BARE = /\bimport\s*(?=['"])/g

// Blanks comments, and with blankStrings also string and template text.
// The output has the same length as the input and keeps every newline and
// quote mark, so offsets and line numbers match the file. A regex literal
// that holds a quote mark can confuse it. The core and content hold none.
export function blank(source: string, blankStrings: boolean): string {
  let out = ''
  let mode: 'code' | 'line' | 'block' | '"' | "'" | '`' = 'code'
  const braces: number[] = []
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i] ?? ''
    const next = source[i + 1] ?? ''
    if (mode === 'code') {
      if (c === '/' && next === '/') mode = 'line'
      else if (c === '/' && next === '*') mode = 'block'
      else if (c === '"' || c === "'" || c === '`') mode = c
      else if (c === '{' && braces.length > 0) braces[braces.length - 1] = (braces.at(-1) ?? 0) + 1
      else if (c === '}' && braces.length > 0) {
        if (braces.at(-1) === 0) {
          braces.pop()
          mode = '`'
        } else braces[braces.length - 1] = (braces.at(-1) ?? 1) - 1
      }
      out += mode === 'line' || mode === 'block' ? ' ' : c
      continue
    }
    const step = scanInside(mode, c, next, blankStrings)
    out += step.text
    if (step.skip) {
      out += step.skipText
      i += 1
    }
    if (step.enterExpression) braces.push(0)
    mode = step.mode
  }
  return out
}

type InsideStep = {
  readonly mode: 'code' | 'line' | 'block' | '"' | "'" | '`'
  readonly text: string
  readonly skip: boolean
  readonly skipText: string
  readonly enterExpression: boolean
}

// One character inside a comment, a string or a template.
function scanInside(
  mode: 'line' | 'block' | '"' | "'" | '`',
  c: string,
  next: string,
  blankStrings: boolean,
): InsideStep {
  const keep = (ch: string): string => (ch === '\n' ? '\n' : ' ')
  const shown = (ch: string): string => (blankStrings ? keep(ch) : ch)
  const base = { mode, text: '', skip: false, skipText: '', enterExpression: false }
  if (mode === 'line') return { ...base, mode: c === '\n' ? 'code' : 'line', text: keep(c) }
  if (mode === 'block') {
    if (c === '*' && next === '/') return { ...base, mode: 'code', text: ' ', skip: true, skipText: ' ' }
    return { ...base, text: keep(c) }
  }
  if (c === '\\') return { ...base, text: shown(c), skip: true, skipText: shown(next) }
  if (mode === '`' && c === '$' && next === '{') {
    return { ...base, mode: 'code', text: shown(c), skip: true, skipText: shown(next), enterExpression: true }
  }
  if (c === mode) return { ...base, mode: 'code', text: c }
  return { ...base, text: shown(c) }
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

// Reads the quoted module name that starts at index.
function moduleAt(source: string, index: number): string {
  const quote = source[index] ?? ''
  const end = source.indexOf(quote, index + 1)
  return end < 0 ? '' : source.slice(index + 1, end)
}

function importViolations(file: string, kept: string, code: string, zone: Zone, isSpec: boolean): Violation[] {
  const found: Violation[] = []
  for (const pattern of [IMPORT_FROM, IMPORT_BARE]) {
    for (const match of code.matchAll(pattern)) {
      const at = (match.index ?? 0) + match[0].length
      const spec = moduleAt(kept, at)
      const line = lineOf(code, at)
      if (spec === 'claude-code' || spec.startsWith('claude-code/')) {
        found.push({ file, line, rule: 'imports claude-code', text: spec })
      } else if (zone.isStrict && !spec.startsWith('.') && !(isSpec && spec === 'bun:test')) {
        found.push({ file, line, rule: 'imports a non-relative module', text: spec })
      }
    }
  }
  return found
}

function globalViolations(file: string, code: string, zone: Zone, isSpec: boolean): Violation[] {
  const found: Violation[] = []
  const lines = code.split('\n')
  lines.forEach((text, index) => {
    if (DOLLAR_API.test(text)) found.push({ file, line: index + 1, rule: 'uses the global $ API', text: text.trim() })
    if (!zone.isStrict || isSpec) return
    for (const { rule, pattern } of HOST_GLOBALS) {
      if (pattern.test(text)) found.push({ file, line: index + 1, rule, text: text.trim() })
    }
  })
  return found
}

// Checks one file's source text against the rules of its zone.
export function checkSource(file: string, source: string, zone: Zone): Violation[] {
  const isSpec = SPEC.test(file)
  const noComments = blank(source, false)
  const codeOnly = blank(source, true)
  return [
    ...importViolations(file, noComments, codeOnly, zone, isSpec),
    ...globalViolations(file, codeOnly, zone, isSpec),
  ]
}

function listSources(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listSources(path)
    return SOURCE.test(entry.name) ? [path] : []
  })
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

// Checks every source file in every zone under root.
export function checkBoundary(root: string): Violation[] {
  return ZONES.flatMap(zone => {
    const dir = join(root, zone.dir)
    if (!isDirectory(dir)) return []
    return listSources(dir).flatMap(path =>
      checkSource(relative(root, path), readFileSync(path, 'utf8'), zone),
    )
  })
}

function main(): number {
  const root = resolve(import.meta.dir, '..')
  const violations = checkBoundary(root)
  for (const v of violations) console.error(`${v.file}:${v.line}: ${v.rule}: ${v.text}`)
  if (violations.length > 0) {
    console.error(`check-boundary: ${violations.length} violation(s).`)
    return 1
  }
  console.log('check-boundary: core, content, ui, sim and web keep to the boundary.')
  return 0
}

if (import.meta.main) process.exit(main())
