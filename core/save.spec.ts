import { describe, expect, test } from 'bun:test'
import { FIXTURE } from './fixtures'
import { loadSave, MIGRATIONS, toSave } from './save'
import type { Migrations } from './save'
import { initialState } from './state'
import { play, repeat, started } from './testkit'
import { STATE_VERSION } from './types'

const played = () => play(started(), repeat({ type: 'work' }, 12))

describe('save', () => {
  test('nothing stored loads as none', () => {
    expect(loadSave(undefined)).toEqual({ kind: 'none' })
  })

  test('a state survives a save and a load', () => {
    const state = played()
    const result = loadSave(toSave(state, 5000))
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.state).toEqual({ ...state, lastSavedAt: 5000 })
      expect(result.migratedFrom).toBeNull()
    }
  })

  test('toSave cuts the link to the live state', () => {
    const state = played()
    const saved = toSave(state, 1) as { log: unknown[] }
    expect(saved.log).not.toBe(state.log)
  })

  test('the migration chain runs from an old version to the target', () => {
    const migrations: Migrations = {
      1: (old) => ({ ...old, extra: 1 }),
      2: (old) => ({ ...old, extra: Number(old.extra) + 10 }),
    }
    const old = { ...(toSave(played(), 1) as object), version: 1 }
    const result = loadSave(old as never, 3, migrations)
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.migratedFrom).toBe(1)
      expect(result.state.version).toBe(3)
      expect((result.state as unknown as { extra: number }).extra).toBe(11)
    }
  })

  test('a missing migration is a bad save', () => {
    const old = { ...(toSave(played(), 1) as object), version: 1 }
    const result = loadSave(old as never, 2, {})
    expect(result).toEqual({ kind: 'bad', reason: 'no migration from version 1' })
  })

  test('a save from a newer version is a bad save', () => {
    const newer = { ...(toSave(played(), 1) as object), version: STATE_VERSION + 1 }
    const result = loadSave(newer as never)
    expect(result.kind).toBe('bad')
  })

  test('shape problems are named', () => {
    const base = toSave(initialState(1, FIXTURE), 0) as Record<string, unknown>
    const cases: [string, Record<string, unknown>][] = [
      ['field cash is not a number', { ...base, cash: 'x' }],
      ['field models is not a list of text', { ...base, models: [1] }],
      ['field machines is not a table of numbers', { ...base, machines: { a: 'b' } }],
      ['field agents is malformed', { ...base, agents: [{ id: 1 }] }],
      ['field stats is malformed', { ...base, stats: null }],
    ]
    for (const [reason, raw] of cases) expect(loadSave(raw as never)).toEqual({ kind: 'bad', reason })
  })

  test('a value that is not an object is a bad save', () => {
    expect(loadSave('text').kind).toBe('bad')
    expect(loadSave([1]).kind).toBe('bad')
  })

  test('the shipped chain is empty at version 1', () => {
    expect(Object.keys(MIGRATIONS)).toEqual([])
  })
})
