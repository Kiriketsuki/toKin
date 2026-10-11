// The browser ports. Storage is localStorage, the clock is Date.now with a
// timer that keeps time in a background tab, and toasts go to the page.
// Each open tab is one instance, so the core ticker lock lets only one tab
// advance the save.

import type { Cancel, ClockPort, HostPorts, Json, StoragePort } from '../core/ports'

// localStorage holds strings, so values go in as JSON. A value that does not
// parse comes back as its raw string. The core then reports the save as bad
// and keeps a copy, where a throw here would stop the game from starting.
export function webStorage(store: Storage): StoragePort {
  return {
    get: async (key) => {
      const raw = store.getItem(key)
      if (raw === null) return undefined
      try {
        return JSON.parse(raw) as Json
      } catch {
        return raw
      }
    },
    set: async (key, value) => {
      store.setItem(key, JSON.stringify(value))
    },
  }
}

// Storage for a page that cannot reach localStorage, such as a locked-down
// private window. The game runs, but nothing survives a reload.
export function memoryStorage(): StoragePort {
  const values = new Map<string, Json>()
  return {
    get: async (key) => values.get(key),
    set: async (key, value) => void values.set(key, value),
  }
}

// Answers localStorage, or null when the page may not use it.
export function findLocalStorage(): Storage | null {
  try {
    const store = globalThis.localStorage
    const probe = 'tokin.probe'
    store.setItem(probe, probe)
    store.removeItem(probe)
    return store
  } catch {
    return null
  }
}

// A browser throttles page timers in a background tab, down to once a minute
// in Chrome. Then the lock goes stale and each tick reads as a sleep. Worker
// timers keep their pace, so the tick comes from a small worker when the
// page can start one.
const TICKER_SOURCE = 'let t;onmessage=(e)=>{clearInterval(t);t=setInterval(()=>postMessage(0),e.data)}'

function workerEvery(ms: number, fn: () => void): Cancel | null {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null
  let url = ''
  try {
    url = URL.createObjectURL(new Blob([TICKER_SOURCE], { type: 'text/javascript' }))
    const worker = new Worker(url)
    worker.onmessage = () => fn()
    worker.postMessage(ms)
    return () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }
  } catch {
    if (url !== '') URL.revokeObjectURL(url)
    return null
  }
}

export function webClock(): ClockPort {
  return {
    now: () => Date.now(),
    every: (ms, fn) => {
      const cancel = workerEvery(ms, fn)
      if (cancel !== null) return cancel
      const id = setInterval(fn, ms)
      return () => clearInterval(id)
    },
  }
}

export function newTabId(): string {
  return `tab-${crypto.randomUUID()}`
}

export function newSeed(): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1))
  return (value ?? 1) & 0x7fffffff
}

export interface WebPortsInput {
  readonly storage: StoragePort
  readonly toast: (text: string) => void
}

export function createWebPorts(input: WebPortsInput): HostPorts {
  return {
    storage: input.storage,
    clock: webClock(),
    // The pane shows the game log, so the host does not mirror it elsewhere.
    notifier: { toast: input.toast, log: () => undefined },
    instanceId: newTabId(),
    newSeed,
  }
}
