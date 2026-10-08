// The Claude Code host adapter. It turns a Bridge into the HostPorts the core
// asks for, and it publishes the core snapshot so the pane redraws on change.
//
// The plugin validator follows the engine interface `$` only inside the file
// that holds the hooks. So register.tsx builds the Bridge from arrow
// functions that call $, and this file never sees `$` itself. That keeps the
// ports logic here testable without an engine.

import type { Snapshot } from '../core/game'
import type { Cancel, HostPorts, Json } from '../core/ports'
import type { GameState } from '../core/types'
import type { UiState } from './ui/keys'
import { INITIAL_UI } from './ui/keys'

// The engine calls the adapter needs, as plain functions.
export interface Bridge {
  storeGet(key: string): Promise<unknown>
  storeSet(key: string, value: Json): Promise<void>
  clockNow(): Promise<number>
  clockEvery(ms: number, fn: () => void): { cancel: () => void }
  toast(text: string): void
  setGame(state: GameState | null): Promise<unknown>
  setRole(role: Snapshot['role']): Promise<unknown>
  getPane(): Promise<UiState | undefined>
  setPane(ui: UiState): Promise<unknown>
}

// A name for this running session. Two sessions never share one, so the
// ticker lock can tell them apart.
export function newInstanceId(nowMs: number): string {
  return `${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Builds the ports over a Bridge. clock.now must answer at once, but the
// engine clock is async. So the adapter caches the time and refreshes the
// cache before each timer callback runs.
export async function createPorts(bridge: Bridge, instanceId: string): Promise<HostPorts> {
  let cached = await bridge.clockNow()
  const refresh = async (): Promise<void> => {
    cached = await bridge.clockNow()
  }
  return {
    instanceId,
    storage: {
      get: async (key) => (await bridge.storeGet(key)) as Json | undefined,
      set: (key, value) => bridge.storeSet(key, value),
    },
    clock: {
      now: () => cached,
      every: (ms, fn): Cancel => {
        const timer = bridge.clockEvery(ms, () => {
          void refresh().then(fn)
        })
        return () => timer.cancel()
      },
    },
    // The pane shows the game log, so the host does not mirror it elsewhere.
    notifier: { toast: (text) => bridge.toast(text), log: () => undefined },
    newSeed: () => Math.floor(Math.random() * 0x7fffffff),
  }
}

// Writes a snapshot into the engine state. A pane that read these values
// draws again. A failure becomes a toast, so the player hears about it.
export async function publish(bridge: Bridge, snapshot: Snapshot): Promise<void> {
  try {
    await bridge.setGame(snapshot.state)
    await bridge.setRole(snapshot.role)
  } catch (error) {
    bridge.toast(`toKin: could not publish the state (${error instanceof Error ? error.message : String(error)})`)
  }
}

export function paneStore(bridge: Bridge) {
  return {
    read: async (): Promise<UiState> => (await bridge.getPane()) ?? INITIAL_UI,
    write: async (ui: UiState): Promise<void> => void (await bridge.setPane(ui)),
  }
}
