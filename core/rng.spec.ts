import { describe, expect, test } from 'bun:test'
import { nextDraw, nextIndex, seedToState } from './rng'

describe('rng', () => {
  test('the same state gives the same draw', () => {
    expect(nextDraw(123)).toEqual(nextDraw(123))
  })

  test('a draw stays in [0, 1) and moves the state', () => {
    const draw = nextDraw(seedToState(7))
    expect(draw.value).toBeGreaterThanOrEqual(0)
    expect(draw.value).toBeLessThan(1)
    expect(draw.state).not.toBe(seedToState(7))
  })

  test('a chain of draws is repeatable', () => {
    const chain = (seed: number) =>
      Array.from({ length: 5 }).reduce<{ s: number; vs: number[] }>(
        (acc) => {
          const d = nextDraw(acc.s)
          return { s: d.state, vs: [...acc.vs, d.value] }
        },
        { s: seedToState(seed), vs: [] },
      ).vs
    expect(chain(9)).toEqual(chain(9))
    expect(chain(9)).not.toEqual(chain(10))
  })

  test('nextIndex stays inside the size', () => {
    const indexes = Array.from({ length: 200 }).reduce<{ s: number; is: number[] }>(
      (acc) => {
        const r = nextIndex(acc.s, 6)
        return { s: r.state, is: [...acc.is, r.index] }
      },
      { s: 1, is: [] },
    ).is
    expect(Math.min(...indexes)).toBe(0)
    expect(Math.max(...indexes)).toBe(5)
  })

  test('nextIndex of an empty list gives 0', () => {
    expect(nextIndex(5, 0).index).toBe(0)
  })

  test('seedToState wraps to an unsigned 32-bit integer', () => {
    expect(seedToState(-1)).toBe(4294967295)
    expect(seedToState(3.9)).toBe(3)
  })
})
