// Runs the spec's Acceptance Scenarios (core/acceptance.ts) under bun test.

import { expect, test } from 'bun:test'

import { ACCEPTANCE } from './acceptance'

for (const scenario of ACCEPTANCE) {
  test(scenario.name, () => {
    expect(scenario.run()).toEqual([])
  })
}
