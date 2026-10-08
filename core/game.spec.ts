import { describe, expect, test } from 'bun:test'
import { advanceWorld, flush, makeSession, makeWorld } from './fakeports'
import type { Session, World } from './fakeports'
import { FIXTURE } from './fixtures'
import { AUTOSAVE_MS, DORMANT_NOTICE, Game, VIEWER_NOTICE } from './game'
import { LOCK_FRESH_MS } from './lock'
import { catchUp } from './offline'
import { STORAGE_KEYS } from './ports'
import { BACKUP_KEY, loadSave, toSave } from './save'
import { play, repeat, started, tick, withState } from './testkit'
import type { GameState } from './types'

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })

// A founder with one rack and one Earn agent: a steady income to compare.
function earner(): GameState {
  const base = withState(started(), { machines: racks(1) })
  return play(base, [{ type: 'createAgent', model: 'kin-0.1', job: 'earn' }])
}

function launch(world: World, id: string): { game: Game; session: Session } {
  const session = makeSession(world, id)
  return { game: new Game(session.ports, FIXTURE), session }
}

function seed(world: World, state: GameState, savedAt: number): void {
  world.store.set(STORAGE_KEYS.save, toSave(state, savedAt))
}

const stored = (world: World): GameState => {
  const r = loadSave(world.store.get(STORAGE_KEYS.save))
  if (r.kind !== 'ok') throw new Error('no save')
  return r.state
}

describe('save round trip', () => {
  test('a new game names a founder, saves, and a second game loads it', async () => {
    const world = makeWorld()
    const a = launch(world, 'a')
    await a.game.start()
    expect(a.game.snapshot().role).toBe('ticker')
    expect(a.game.dispatch({ type: 'nameFounder', name: 'Ada' }).ok).toBe(true)
    repeat({ type: 'work' }, 3).forEach(a.game.dispatch)
    await a.game.stop()
    expect(a.game.snapshot().role).toBe('dormant')

    const b = launch(world, 'b')
    await b.game.start()
    const state = b.game.snapshot().state
    expect(state?.founder).toBe('Ada')
    expect(state?.stats.workPresses).toBe(3)
    expect(state?.cash).toBeCloseTo(1.5, 10)
    await b.game.stop()
  })

  test('a dormant game refuses every action', () => {
    const { game } = launch(makeWorld(), 'a')
    expect(game.dispatch({ type: 'work' })).toEqual({ ok: false, reason: DORMANT_NOTICE })
    expect(game.view()).toBeNull()
  })

  test('the view comes from the live state', async () => {
    const world = makeWorld()
    const { game } = launch(world, 'a')
    await game.start()
    expect(game.view()?.needsFounder).toBe(true)
    game.dispatch({ type: 'nameFounder', name: 'Ada' })
    expect(game.view()?.needsFounder).toBe(false)
    await game.stop()
  })

  test('an unreadable save is backed up, and a new game starts', async () => {
    const world = makeWorld()
    world.store.set(STORAGE_KEYS.save, { version: 1, cash: 'bad' })
    const { game, session } = launch(world, 'a')
    await game.start()
    expect(world.store.get(BACKUP_KEY)).toEqual({ version: 1, cash: 'bad' })
    expect(session.toasts[0]).toContain('could not be read')
    expect(game.snapshot().state?.founder).toBeNull()
    await game.stop()
  })
})

describe('ticking and autosave', () => {
  test('a tick every second advances the state', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const { game } = launch(world, 'a')
    await game.start()
    await advanceWorld(world, 10_000)
    expect(game.snapshot().state?.clock).toBeCloseTo(10, 6)
    expect(game.snapshot().state?.runTokens).toBeCloseTo(20, 6)
    await game.stop()
  })

  test('the game saves every 30 seconds and on stop', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const { game } = launch(world, 'a')
    await game.start()
    const first = stored(world).lastSavedAt
    await advanceWorld(world, AUTOSAVE_MS - 1000)
    expect(stored(world).lastSavedAt).toBe(first)
    await advanceWorld(world, 1000)
    expect(stored(world).lastSavedAt).toBe(world.now)
    await advanceWorld(world, 5000)
    await game.stop()
    expect(stored(world).lastSavedAt).toBe(world.now)
    expect(stored(world).clock).toBeCloseTo(35, 6)
  })

  test('a stopped game runs no timer', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const { game } = launch(world, 'a')
    await game.start()
    await game.stop()
    expect(world.timers).toHaveLength(0)
  })

  test('a new story beat reaches the notifier as a toast', async () => {
    const world = makeWorld()
    const { game, session } = launch(world, 'a')
    await game.start()
    game.dispatch({ type: 'nameFounder', name: 'Ada' })
    repeat({ type: 'work' }, 10).forEach(game.dispatch)
    expect(session.toasts).toContain('the numbers add up. they always do, eventually.')
    expect(session.lines.length).toBeGreaterThan(0)
    await game.stop()
  })
})

describe('offline catch-up', () => {
  test('catch-up equals the same time of live ticks within 1 percent', async () => {
    const away = 600
    const live = tick(earner(), away)
    const world = makeWorld()
    seed(world, earner(), world.now - away * 1000)
    const { game } = launch(world, 'a')
    await game.start()
    const caught = game.snapshot().state as GameState
    expect(Math.abs(caught.cash - live.cash) / live.cash).toBeLessThan(0.01)
    expect(Math.abs(caught.runTokens - live.runTokens) / live.runTokens).toBeLessThan(0.01)
    await game.stop()
  })

  test('a return after a long absence logs the two lines', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now - 600_000)
    const { game } = launch(world, 'a')
    await game.start()
    const log = game.snapshot().state?.log.map((l) => l.text) ?? []
    expect(log).toContain('you slept. it did not.')
    expect(log.some((t) => t.startsWith('away 600s:'))).toBe(true)
    await game.stop()
  })

  test('a short absence logs nothing but still advances', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now - 20_000)
    const { game } = launch(world, 'a')
    await game.start()
    const state = game.snapshot().state as GameState
    expect(state.log.some((l) => l.text === 'you slept. it did not.')).toBe(false)
    expect(state.clock).toBeCloseTo(20, 6)
    await game.stop()
  })

  test('the offline cap is 2 hours, and 8 hours after Night Shift', () => {
    const day = 24 * 3600
    const plain = catchUp(earner(), FIXTURE, day)
    expect(plain.clock).toBeCloseTo(7200, 3)
    expect(plain.log.some((l) => l.text.startsWith('away 7200s:'))).toBe(true)
    const night = catchUp(withState(earner(), { research: ['night-shift'] }), FIXTURE, day)
    expect(night.clock).toBeCloseTo(28800, 3)
  })

  test('catch-up does nothing before the founder has a name', () => {
    const fresh = withState(started(), { founder: null })
    expect(catchUp(fresh, FIXTURE, 5000)).toBe(fresh)
  })

  test('a long gap between ticks goes through catch-up', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const { game } = launch(world, 'a')
    await game.start()
    world.now += 3_600_000
    await advanceWorld(world, 1000)
    const log = game.snapshot().state?.log.map((l) => l.text) ?? []
    expect(log).toContain('you slept. it did not.')
    await game.stop()
  })
})

describe('the single ticker lock', () => {
  test('the second session runs read-only', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    const b = launch(world, 'b')
    await a.game.start()
    await b.game.start()
    expect(a.game.snapshot().role).toBe('ticker')
    expect(b.game.snapshot().role).toBe('viewer')
    expect(b.game.dispatch({ type: 'work' })).toEqual({ ok: false, reason: VIEWER_NOTICE })
    expect(a.game.dispatch({ type: 'work' }).ok).toBe(true)
    await a.game.stop()
    await b.game.stop()
  })

  test('the viewer draws the save the ticker writes', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    const b = launch(world, 'b')
    await a.game.start()
    await b.game.start()
    a.game.dispatch({ type: 'work' })
    await advanceWorld(world, AUTOSAVE_MS + 4000)
    const ticker = a.game.snapshot().state as GameState
    const viewer = b.game.snapshot().state as GameState
    expect(viewer.stats.workPresses).toBe(1)
    expect(Math.abs(viewer.runTokens - ticker.runTokens)).toBeLessThan(20)
    await a.game.stop()
    await b.game.stop()
  })

  test('the viewer takes over after the ticker stops', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    const b = launch(world, 'b')
    await a.game.start()
    await b.game.start()
    await a.game.stop()
    await advanceWorld(world, 3000)
    expect(b.game.snapshot().role).toBe('ticker')
    expect(b.game.dispatch({ type: 'work' }).ok).toBe(true)
    await b.game.stop()
  })

  test('a crashed ticker frees the lock after five seconds', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    const b = launch(world, 'b')
    await a.game.start()
    await b.game.start()
    // The crash: a's timer dies and no release is written.
    world.timers = world.timers.filter((t) => t.id !== 1)
    await advanceWorld(world, 3000)
    expect(b.game.snapshot().role).toBe('viewer')
    await advanceWorld(world, LOCK_FRESH_MS)
    expect(b.game.snapshot().role).toBe('ticker')
    await b.game.stop()
  })

  test('a ticker that loses the lock becomes a viewer', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    await a.game.start()
    world.store.set(STORAGE_KEYS.lock, { sessionId: 'thief', heartbeat: world.now + 1000 })
    await advanceWorld(world, 4000)
    expect(a.game.snapshot().role).toBe('viewer')
    expect(a.game.dispatch({ type: 'work' }).ok).toBe(false)
    await a.game.stop()
  })

  test('two sessions that start at once end with one ticker', async () => {
    const world = makeWorld()
    seed(world, earner(), world.now)
    const a = launch(world, 'a')
    const b = launch(world, 'b')
    await Promise.all([a.game.start(), b.game.start()])
    await flush()
    const roles = [a.game.snapshot().role, b.game.snapshot().role].sort()
    expect(roles).toEqual(['ticker', 'viewer'])
    await a.game.stop()
    await b.game.stop()
  })
})

describe('log mirroring', () => {
  test('a viewer that adopts a newer save hears each log line once', async () => {
    const world = makeWorld()
    const a = launch(world, 'a')
    await a.game.start()
    a.game.dispatch({ type: 'nameFounder', name: 'Ada' })
    repeat({ type: 'work' }, 5).forEach(a.game.dispatch)
    const b = launch(world, 'b')
    await b.game.start()
    expect(b.game.snapshot().role).toBe('viewer')
    await advanceWorld(world, 95_000)
    const known = b.game.snapshot().state?.log.length ?? 0
    expect(b.session.lines.length).toBeLessThanOrEqual(known)
  })
})
