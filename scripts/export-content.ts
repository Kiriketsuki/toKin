// Writes a content pack as a JSON file, so a port in another language can
// load the same tables. It refuses a pack that is not plain JSON data: a
// function, an undefined value, a non-finite number or a class instance.
//
// Usage: bun scripts/export-content.ts [module] [exportName] [outFile]
// Defaults: content/era1.ts, ERA1, build/content/era1.json.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')

// Lists every place in value that JSON cannot carry unchanged.
export function jsonProblems(value: unknown, path = '$'): string[] {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return []
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}: non-finite number`]
  if (Array.isArray(value)) return value.flatMap((item, index) => jsonProblems(item, `${path}[${index}]`))
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) return [`${path}: not a plain object`]
    return Object.entries(value).flatMap(([key, item]) => jsonProblems(item, `${path}.${key}`))
  }
  return [`${path}: ${typeof value} is not JSON`]
}

async function main(): Promise<number> {
  const [modulePath = 'content/era1.ts', exportName = 'ERA1', outFile = 'build/content/era1.json'] =
    process.argv.slice(2)
  const loaded: Record<string, unknown> = await import(resolve(ROOT, modulePath))
  const pack = loaded[exportName]
  if (pack === undefined) {
    console.error(`export-content: ${modulePath} has no export named ${exportName}.`)
    return 1
  }
  const problems = jsonProblems(pack)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`export-content: ${problem}`)
    return 1
  }
  const target = resolve(ROOT, outFile)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(pack, null, 2)}\n`)
  console.log(`export-content: wrote ${target}`)
  return 0
}

if (import.meta.main) process.exit(await main())
