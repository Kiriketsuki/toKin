// A fake host for specs: shared in-memory storage, one manual clock and a
// notifier that records what it hears. Two sessions can share one World, which
// is how the lock specs model two Claude Code sessions on one save.

import type { Cancel, HostPorts, Json } from './ports'
import type { LogLine } from './types'

interface Timer {
  readonly id: number
  readonly ms: number
  readonly fn: () => void
  next: number
}

export interface World {
  readonly store: Map<string, Json>
  now: number
  timers: Timer[]
  nextTimerId: number
}

export interface Session {
  readonly ports: HostPorts
  readonly toasts: string[]
  readonly lines: LogLine[]
}

export function makeWorld(now = 1_000_000): World {
  return { store: new Map(), now, timers: [], nextTimerId: 1 }
}

// Lets pending promise work run. Storage calls settle in microtasks only.
export async function flush(): Promise<void> {
  for (let i = 0; i < 60; i += 1) await Promise.resolve()
}

export function makeSession(world: World, instanceId: string, seed = 7): Session {
  const toasts: string[] = []
  const lines: LogLine[] = []
  const ports: HostPorts = {
    storage: {
      get: async (key) => {
        const value = world.store.get(key)
        return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Json)
      },
      set: async (key, value) => {
        world.store.set(key, JSON.parse(JSON.stringify(value)) as Json)
      },
    },
    clock: {
      now: () => world.now,
      every: (ms, fn): Cancel => {
        const timer: Timer = { id: world.nextTimerId++, ms, fn, next: world.now + ms }
        world.timers = [...world.timers, timer]
        return () => {
          world.timers = world.timers.filter((t) => t.id !== timer.id)
        }
      },
    },
    notifier: { toast: (text) => void toasts.push(text), log: (line) => void lines.push(line) },
    instanceId,
    newSeed: () => seed,
  }
  return { ports, toasts, lines }
}

// Moves the clock on and fires each due timer in order. The wait after each
// timer lets its async work finish before the next one fires.
export async function advanceWorld(world: World, ms: number): Promise<void> {
  const target = world.now + ms
  for (;;) {
    const due = world.timers.filter((t) => t.next <= target).sort((a, b) => a.next - b.next || a.id - b.id)[0]
    if (!due) break
    world.now = Math.max(world.now, due.next)
    due.next += due.ms
    due.fn()
    await flush()
  }
  world.now = target
}
