import { describe, expect, test } from 'bun:test'
import { flush, makeSession, makeWorld } from './fakeports'
import { FIXTURE } from './fixtures'
import { Game } from './game'
import { applyMirror, isMirrorDue, MIRROR_INTERVAL_MS } from './mirror'
import { started } from './testkit'
import type { ContentPack } from './types'

const WITH_MIRROR: ContentPack = {
  ...FIXTURE,
  mirror: { rateLimit: 'supplier out of stock', compaction: 'ledger boiled down' },
}

describe('mirror throttle', () => {
  test('a first event is due and a repeat inside ten minutes is not', () => {
    expect(isMirrorDue({}, 'rateLimit', 5)).toBe(true)
    expect(isMirrorDue({ rateLimit: 1000 }, 'rateLimit', 1000 + MIRROR_INTERVAL_MS - 1)).toBe(false)
    expect(isMirrorDue({ rateLimit: 1000 }, 'rateLimit', 1000 + MIRROR_INTERVAL_MS)).toBe(true)
  })

  test('each kind has its own window', () => {
    expect(isMirrorDue({ rateLimit: 1000 }, 'compaction', 1001)).toBe(true)
  })

  test('applyMirror logs once, changes nothing else and leaves the input alone', () => {
    const before = started()
    const first = applyMirror(before, WITH_MIRROR, {}, 'rateLimit', 100)
    expect(first.isLogged).toBe(true)
    expect(first.state.log.at(-1)?.text).toBe('supplier out of stock')
    expect(before.log.length).toBe(first.state.log.length - 1)
    expect({ ...first.state, log: [] }).toEqual({ ...before, log: [] })
    const again = applyMirror(first.state, WITH_MIRROR, first.clock, 'rateLimit', 200)
    expect(again.isLogged).toBe(false)
    expect(again.state).toBe(first.state)
  })

  test('content with no mirror line logs nothing', () => {
    const result = applyMirror(started(), { ...FIXTURE, mirror: undefined }, {}, 'compaction', 1)
    expect(result.isLogged).toBe(false)
  })
})

describe('Game.mirror', () => {
  test('a ticker logs the line, throttles, and logs again after ten minutes', async () => {
    const world = makeWorld()
    const session = makeSession(world, 'a')
    const game = new Game(session.ports, WITH_MIRROR)
    await game.start()
    game.dispatch({ type: 'nameFounder', name: 'Ada' })
    expect(game.mirror('rateLimit')).toBe(true)
    expect(game.mirror('rateLimit')).toBe(false)
    expect(game.mirror('compaction')).toBe(true)
    world.now += MIRROR_INTERVAL_MS
    expect(game.mirror('rateLimit')).toBe(true)
    const texts = game.snapshot().state?.log.map((l) => l.text) ?? []
    expect(texts.filter((t) => t === 'supplier out of stock').length).toBe(2)
    await game.stop()
  })

  test('a dormant game and a viewer log nothing', async () => {
    const world = makeWorld()
    const game = new Game(makeSession(world, 'a').ports, WITH_MIRROR)
    expect(game.mirror('rateLimit')).toBe(false)
    await game.start()
    const viewer = new Game(makeSession(world, 'b').ports, WITH_MIRROR)
    await viewer.start()
    await flush()
    expect(viewer.snapshot().role).toBe('viewer')
    expect(viewer.mirror('rateLimit')).toBe(false)
    await game.stop()
  })
})
