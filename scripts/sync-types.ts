// Copies the Claude Code plugin API declarations into .claude-plugin/types/
// so tsc can type hooks/ before any session has loaded the mod. The engine
// writes the same file there itself each time it loads the mod from a
// folder, so this script matters only on a fresh clone.
//
// Usage: bun scripts/sync-types.ts [path/to/claude-code.d.ts]
// Without a path, it reads CLAUDE_CODE_TYPES, then searches the bundled
// plugin-authoring skill in the Claude temp cache for the newest build.

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')
const TARGET = join(ROOT, '.claude-plugin', 'types', 'claude-code', 'index.d.ts')
const PATTERN = '.cache/claude-tmp/*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts'

// Orders version strings such as 2.1.294 numerically.
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

// The version is the folder name after bundled-skills.
function versionOf(path: string): string {
  const parts = path.split('/')
  const index = parts.indexOf('bundled-skills')
  return index >= 0 ? (parts[index + 1] ?? '0') : '0'
}

function findBundled(): string | undefined {
  const glob = new Bun.Glob(PATTERN)
  const found = [...glob.scanSync({ cwd: homedir(), absolute: true, dot: true })]
  const sorted = found.sort((a, b) =>
    compareVersions(versionOf(b), versionOf(a)) || statSync(b).mtimeMs - statSync(a).mtimeMs,
  )
  return sorted[0]
}

function main(): number {
  const source = process.argv[2] ?? process.env.CLAUDE_CODE_TYPES ?? findBundled()
  if (source === undefined || !existsSync(source)) {
    console.error('sync-types: no claude-code.d.ts found.')
    console.error('Give its path as an argument, or load the mod once with claude --plugin-dir.')
    return 1
  }
  mkdirSync(dirname(TARGET), { recursive: true })
  copyFileSync(source, TARGET)
  console.log(`sync-types: copied ${source} to ${TARGET}`)
  return 0
}

process.exit(main())
