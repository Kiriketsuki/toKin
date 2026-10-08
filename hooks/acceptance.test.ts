// Runs the spec's Acceptance Scenarios (core/acceptance.ts) under
// claude plugin test, as the spec's first Exit Criterion asks.

import { expect, test } from 'claude-code/testing'

import { ACCEPTANCE } from '../core/acceptance'

for (const scenario of ACCEPTANCE) {
  test(scenario.name, async () => {
    expect(scenario.run()).toEqual([])
  })
}
