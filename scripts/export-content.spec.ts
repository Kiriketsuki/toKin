import { describe, expect, test } from 'bun:test'

import { jsonProblems } from './export-content'

describe('jsonProblems', () => {
  test('accepts plain JSON data with tagged effects', () => {
    const pack = { id: 'era1', effects: [{ kind: 'tokMult', value: 1.25 }], unlock: null, on: true }
    expect(jsonProblems(pack)).toEqual([])
  })

  test('names each value JSON cannot carry', () => {
    const pack = { a: () => 1, b: [1, Number.POSITIVE_INFINITY], c: undefined, d: new Map() }
    expect(jsonProblems(pack)).toEqual([
      '$.a: function is not JSON',
      '$.b[1]: non-finite number',
      '$.c: undefined is not JSON',
      '$.d: not a plain object',
    ])
  })
})
