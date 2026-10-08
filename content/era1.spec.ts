import { describe, expect, test } from 'bun:test'

import type { Condition, ContentPack } from '../core/types'
import { jsonProblems } from '../scripts/export-content'
import { ERA1 } from './era1'
import exported from './era1.json'

const ids = (list: readonly { readonly id: string }[]) => list.map((item) => item.id)
const MACHINES = new Set(ids(ERA1.machines))
const MODELS = new Set(ids(ERA1.models))
const CONTRACTS = new Set(ids(ERA1.contracts))
const RESEARCH = new Set(ids(ERA1.research))

// Lists every id a condition names that does not resolve.
function conditionProblems(c: Condition): string[] {
  switch (c.kind) {
    case 'machine':
      return MACHINES.has(c.machine) ? [] : [`machine ${c.machine}`]
    case 'research':
      return RESEARCH.has(c.research) ? [] : [`research ${c.research}`]
    case 'model':
      return MODELS.has(c.model) ? [] : [`model ${c.model}`]
    case 'all':
    case 'any':
      return c.of.flatMap(conditionProblems)
    default:
      return []
  }
}

describe('era1 tables', () => {
  test('hold the counts the spec names', () => {
    expect(ERA1.machines).toHaveLength(4)
    expect(ERA1.models).toHaveLength(4)
    expect(ERA1.contracts).toHaveLength(4)
    expect(ERA1.research).toHaveLength(12)
    expect(ERA1.shop).toHaveLength(6)
    expect(ERA1.story.length).toBeGreaterThanOrEqual(18)
    expect(ERA1.story.length).toBeLessThanOrEqual(24)
  })

  test('use the canonical ids and unique ids in each table', () => {
    expect(ids(ERA1.machines)).toEqual(['relay-rack', 'valve-bank', 'drum-cabinet', 'core-lattice'])
    expect(ids(ERA1.models)).toEqual(['kin-0.1', 'kin-0.2', 'kin-0.3', 'kin-0.4'])
    expect(ids(ERA1.contracts)).toEqual(['payroll', 'ballistics', 'census', 'actuarial'])
    for (const table of [ERA1.machines, ERA1.models, ERA1.contracts, ERA1.research, ERA1.shop, ERA1.story]) {
      expect(new Set(ids(table)).size).toBe(table.length)
    }
  })

  test('match the spec numbers', () => {
    expect(ERA1.machines.map((m) => [m.baseCost, m.ratio, m.flops])).toEqual([
      [25, 1.13, 1], [400, 1.14, 12], [6000, 1.15, 100], [90000, 1.15, 1500],
    ])
    expect(ERA1.models.map((m) => [m.footprint, m.tokPerSec, m.quality, m.context])).toEqual([
      [1, 2, 1.0, 64], [4, 6, 1.6, 256], [20, 20, 2.8, 1024], [120, 72, 5.0, 4096],
    ])
    expect(ERA1.contracts.map((c) => [c.minContext, c.payPerToken])).toEqual([
      [32, 0.1], [128, 0.15], [512, 0.22], [2048, 0.35],
    ])
    expect(ERA1.research.map((r) => r.cost)).toEqual([10, 25, 30, 40, 60, 120, 200, 300, 800, 1500, 2500, 5000])
  })

  test('start with one unlocked machine and one start model', () => {
    expect(ERA1.machines.filter((m) => m.startsUnlocked).map((m) => m.id)).toEqual(['relay-rack'])
    expect(ERA1.models.filter((m) => m.acquire.kind === 'start').map((m) => m.id)).toEqual(['kin-0.1'])
  })

  test('give every machine and research item a flavour line', () => {
    for (const item of [...ERA1.machines, ...ERA1.research]) expect(item.flavour?.length ?? 0).toBeGreaterThan(0)
  })
})

describe('era1 references', () => {
  test('every id a research item names resolves', () => {
    const bad = ERA1.research.flatMap((r) => [
      ...r.requires.flatMap(conditionProblems),
      ...r.effects.flatMap((e) => (e.kind === 'unlockMachine' && !MACHINES.has(e.machine) ? [`machine ${e.machine}`] : [])),
    ])
    expect(bad).toEqual([])
  })

  test('every unlockMachine effect covers a locked machine exactly once', () => {
    const unlocked = ERA1.research.flatMap((r) => r.effects).flatMap((e) => (e.kind === 'unlockMachine' ? [e.machine] : []))
    const locked = ERA1.machines.filter((m) => !m.startsUnlocked).map((m) => m.id)
    expect([...unlocked].sort()).toEqual([...locked].sort())
  })

  test('every id a shop item names resolves, and levels match the cost', () => {
    for (const item of ERA1.shop) {
      const e = item.effect
      if (e.kind === 'startMachines') expect(MACHINES.has(e.machine)).toBe(true)
      if (e.kind === 'keepModels') for (const level of e.perLevel) for (const m of level) expect(MODELS.has(m)).toBe(true)
      if (e.kind === 'keepResearch') for (const r of e.research) expect(RESEARCH.has(r)).toBe(true)
      if (item.cost.kind === 'table') expect(item.maxLevel).toBe(item.cost.values.length)
      if (e.kind === 'startMachines') expect(e.perLevel).toHaveLength(item.maxLevel ?? -1)
      if (e.kind === 'keepModels') expect(e.perLevel).toHaveLength(item.maxLevel ?? -1)
    }
  })

  test('every story trigger resolves, and every beat is in the voice', () => {
    for (const beat of ERA1.story) {
      expect(conditionProblems(beat.trigger)).toEqual([])
      expect(beat.text).toBe(beat.text.toLowerCase())
      expect(beat.text).not.toMatch(/[;—]/)
    }
  })

  test('story years only move forward', () => {
    const years = ERA1.story.flatMap((b) => (b.year === undefined ? [] : [b.year]))
    expect(years).toEqual([...years].sort((a, b) => a - b))
    expect(years[0]).toBeGreaterThan(ERA1.balance.startYear)
  })

  test('the balance names a real hand-work contract', () => {
    expect(CONTRACTS.has(ERA1.balance.handWorkContract)).toBe(true)
  })

  test('the spec sample lines appear verbatim', () => {
    const lines = [...ERA1.story.map((b) => b.text), ERA1.text.offlineReturn, ERA1.mirror?.rateLimit]
    for (const sample of [
      'the room is cold. the payroll ledger is due friday.',
      'the numbers add up. they always do, eventually.',
      'a relay rack, secondhand. it clicks like rain on tin.',
      '{agent} takes the next ledger. it does not ask for lunch.',
      "it finished mrs. halloran's payroll. that was your job on tuesdays.",
      'the valves glow orange. the garage is warm for the first time in years.',
      'the cooling bucket needs refilling twice a day now.',
      'the second one is better. you are not sure how.',
      'you ask it a question you cannot answer. it tries.',
      'it counts the town in an afternoon. the town does not know.',
      'the street lights dim when the lattice starts. the neighbours have opinions.',
      'it forgot almost everything. it kept what mattered.',
      'you slept. it did not.',
      'the punch-card supplier is out of stock. come back later.',
    ]) expect(lines).toContain(sample)
  })

  test('the name pool is large and free of duplicates', () => {
    expect(ERA1.names.first.length).toBeGreaterThanOrEqual(55)
    expect(new Set(ERA1.names.first).size).toBe(ERA1.names.first.length)
    expect(new Set(ERA1.names.last).size).toBe(ERA1.names.last.length)
    for (const last of ERA1.names.last) expect(last).toMatch(/^[A-Z][.]/)
    for (const last of ERA1.names.last) expect(last).toHaveLength(2)
  })
})

describe('era1 JSON', () => {
  test('holds no value JSON cannot carry', () => {
    expect(jsonProblems(ERA1)).toEqual([])
  })

  test('round-trips through JSON unchanged', () => {
    const copy: ContentPack = JSON.parse(JSON.stringify(ERA1))
    expect(copy).toEqual(ERA1)
  })

  test('the exported content/era1.json matches the module', () => {
    expect(exported).toEqual(JSON.parse(JSON.stringify(ERA1)))
  })
})
