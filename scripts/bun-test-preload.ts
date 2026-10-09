// Loads before every bun test file. The hooks tests import claude-code and
// claude-code/testing, which exist only inside the Claude Code engine. Under
// bun test these stand-ins let a hooks test file load and mark each of its
// tests as skipped. claude plugin test runs them for real.

import { describe, expect, mock, test } from 'bun:test'

const SKIP_NOTE = '(runs under claude plugin test)'

function engineOnly(name: string): () => never {
  return () => {
    throw new Error(`claude-code ${name} runs only inside the Claude Code engine`)
  }
}

mock.module('claude-code/testing', () => ({
  test: (name: string) => test.skip(`${name} ${SKIP_NOTE}`, () => {}),
  describe: (name: string) => describe.skip(`${name} ${SKIP_NOTE}`, () => {}),
  expect,
  mock: {},
  tier: {},
}))

// A hooks module may build atoms at module scope, so atom answers its
// reference. Every other helper needs the engine and throws.
mock.module('claude-code', () => ({
  atom: (ref: unknown) => ref,
  derive: engineOnly('derive'),
  memberOf: engineOnly('memberOf'),
  read: engineOnly('read'),
  update: engineOnly('update'),
}))
