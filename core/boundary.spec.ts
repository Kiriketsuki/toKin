import { describe, expect, test } from 'bun:test'

import { blank, checkBoundary, checkSource, ZONES } from '../scripts/check-boundary'

const ROOT = new URL('..', import.meta.url).pathname
const CORE = ZONES.find(zone => zone.dir === 'core') ?? { dir: 'core', isStrict: true }
const SIM = ZONES.find(zone => zone.dir === 'sim') ?? { dir: 'sim', isStrict: false }
const UI = ZONES.find(zone => zone.dir === 'ui') ?? { dir: 'ui', isStrict: true }
const WEB = ZONES.find(zone => zone.dir === 'web') ?? { dir: 'web', isStrict: false }

function rules(file: string, source: string, zone = CORE): string[] {
  return checkSource(file, source, zone).map(v => v.rule)
}

describe('the repository keeps the boundary', () => {
  test('core, content, ui, sim and web have no violations', () => {
    expect(checkBoundary(ROOT)).toEqual([])
  })

  test('the shared pane and the browser host are zones', () => {
    expect(UI.isStrict).toBe(true)
    expect(WEB.isStrict).toBe(false)
  })
})

describe('the ui and web zones', () => {
  test('the shared pane imports neither a host nor a package', () => {
    expect(rules('ui/a.tsx', "import type { Elements } from 'claude-code'\n", UI)).toEqual(['imports claude-code'])
    expect(rules('ui/a.tsx', "import { h } from 'preact'\n", UI)).toEqual(['imports a non-relative module'])
    expect(rules('ui/a.tsx', "import { fmtNum } from '../core/format'\n", UI)).toEqual([])
  })

  test('the browser host may import Preact but not Claude Code', () => {
    expect(rules('web/a.ts', "import { render } from 'preact'\nsetInterval(() => 0, 1000)\n", WEB)).toEqual([])
    expect(rules('web/a.ts', "import { atom } from 'claude-code'\n", WEB)).toEqual(['imports claude-code'])
  })
})

describe('checkSource', () => {
  test('flags a claude-code import and a claude-code/testing import', () => {
    expect(rules('core/a.ts', "import type { Register } from 'claude-code'\n")).toEqual(['imports claude-code'])
    expect(rules('core/a.ts', 'import { test } from "claude-code/testing"\n')).toEqual(['imports claude-code'])
    expect(rules('core/a.ts', "export type * from 'claude-code'\n")).toEqual(['imports claude-code'])
  })

  test('flags a claude-code import in the sim, which may use Node', () => {
    expect(rules('sim/a.ts', "import { readFileSync } from 'node:fs'\n", SIM)).toEqual([])
    expect(rules('sim/a.ts', "import 'claude-code'\n", SIM)).toEqual(['imports claude-code'])
  })

  test('flags a lone $ identifier, the engine API', () => {
    expect(rules('core/a.ts', 'export const f = ($, e) => $.ui.toast(e)\n')).toContain('uses the global $ API')
    expect(rules('core/a.ts', 'const s = $\n')).toEqual(['uses the global $ API'])
  })

  test('ignores $ inside names, templates, strings and comments', () => {
    const source = [
      'const cost$ = 1',
      'const text = `cash ${cost$}`',
      "const label = 'pay $5'",
      '// $ in a comment',
      '/* $.ui */',
    ].join('\n')
    expect(rules('core/a.ts', source)).toEqual([])
  })

  test('ignores an import written inside a string', () => {
    expect(rules('core/a.spec.ts', "const s = \"import x from 'claude-code'\"\n")).toEqual([])
  })

  test('flags host globals and package imports in strict non-spec files', () => {
    expect(rules('core/a.ts', 'const t = Date.now()\n')).toEqual(['wall clock: Date.now'])
    expect(rules('core/a.ts', 'const r = Math.random()\n')).toEqual(['unseeded random: Math.random'])
    expect(rules('core/a.ts', 'console.log(1)\n')).toEqual(['host global: console'])
    expect(rules('core/a.ts', "import { readFileSync } from 'node:fs'\n")).toEqual(['imports a non-relative module'])
  })

  test('lets a spec import bun:test and read the clock', () => {
    expect(rules('core/a.spec.ts', "import { test } from 'bun:test'\nconst t = Date.now()\n")).toEqual([])
  })

  test('reports the line of a violation', () => {
    const [found] = checkSource('core/a.ts', "const a = 1\n\nimport 'claude-code'\n", CORE)
    expect(found?.line).toBe(3)
  })
})

describe('blank', () => {
  test('keeps length, newlines and quote marks', () => {
    const source = "a('x$y') // c\n`t ${b} u`"
    const out = blank(source, true)
    expect(out.length).toBe(source.length)
    expect(out.split('\n').length).toBe(2)
    expect(out).toContain("a('   ')")
    // The template text and its ${ marker blank. The expression b stays code.
    expect(out).toContain('b}')
    expect(out.includes('$')).toBe(false)
  })
})
