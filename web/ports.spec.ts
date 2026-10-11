import { describe, expect, test } from 'bun:test'

import { STORAGE_KEYS } from '../core/ports'
import { createWebPorts, memoryStorage, newSeed, newTabId, webClock, webStorage } from './ports'

// A Storage over a Map, enough for the ports.
function fakeStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, String(value)),
  }
}

describe('web storage', () => {
  test('a value round-trips as JSON', async () => {
    const store = fakeStorage()
    const storage = webStorage(store)
    await storage.set(STORAGE_KEYS.lock, { sessionId: 'tab-a', heartbeat: 5 })
    expect(store.getItem(STORAGE_KEYS.lock)).toBe('{"sessionId":"tab-a","heartbeat":5}')
    expect(await storage.get(STORAGE_KEYS.lock)).toEqual({ sessionId: 'tab-a', heartbeat: 5 })
  })

  test('a missing key reads as undefined', async () => {
    expect(await webStorage(fakeStorage()).get(STORAGE_KEYS.save)).toBeUndefined()
  })

  test('a value that is not JSON comes back as its raw string', async () => {
    const store = fakeStorage()
    store.setItem(STORAGE_KEYS.save, '{not json')
    expect(await webStorage(store).get(STORAGE_KEYS.save)).toBe('{not json')
  })

  test('memory storage keeps values for the page only', async () => {
    const storage = memoryStorage()
    await storage.set('k', [1, 2])
    expect(await storage.get('k')).toEqual([1, 2])
  })
})

describe('the clock and the ids', () => {
  test('every ticks until it is cancelled', async () => {
    const clock = webClock()
    let ticks = 0
    const cancel = clock.every(10, () => (ticks += 1))
    await Bun.sleep(120)
    cancel()
    const atCancel = ticks
    expect(atCancel).toBeGreaterThan(0)
    await Bun.sleep(60)
    expect(ticks).toBe(atCancel)
  })

  test('two tabs get different ids, and seeds are positive 31-bit integers', () => {
    expect(newTabId()).not.toBe(newTabId())
    for (let i = 0; i < 20; i += 1) {
      const seed = newSeed()
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0x7fffffff)
    }
  })

  test('the ports send toasts to the page and keep the log in the pane', () => {
    const toasts: string[] = []
    const ports = createWebPorts({ storage: memoryStorage(), toast: (text) => toasts.push(text) })
    ports.notifier.toast('hello')
    ports.notifier.log({ t: 0, text: 'ignored' })
    expect(toasts).toEqual(['hello'])
    expect(ports.instanceId).toMatch(/^tab-/)
  })
})
