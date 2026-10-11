import { describe, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'

import { fileFor } from './serve-web'

const ROOT = resolve(import.meta.dir, '..', 'build', 'web')

describe('fileFor', () => {
  test('maps a path to a file under the build', () => {
    expect(fileFor('/index.html')).toBe(join(ROOT, 'index.html'))
    expect(fileFor('/assets/a.js')).toBe(join(ROOT, 'assets', 'a.js'))
  })

  test('never leaves the build folder', () => {
    for (const path of ['/../package.json', '/%2e%2e/%2e%2e/package.json', '/..%2fpackage.json']) {
      expect(fileFor(path)?.startsWith(ROOT)).toBe(true)
    }
  })

  test('refuses a path that does not decode', () => {
    expect(fileFor('/%E0%A4%A')).toBeNull()
  })
})
