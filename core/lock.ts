// The single-ticker lock. Two sessions can share one save, and only one of
// them may advance it. The holder writes { sessionId, heartbeat } under
// STORAGE_KEYS.lock and renews the heartbeat. A lock whose heartbeat is older
// than LOCK_FRESH_MS counts as free, so a crashed session never blocks the
// game for long. Storage has no compare-and-set, so claim writes and then
// reads the lock back. When two sessions race, the later write wins and the
// other session sees that on the read back.

import type { HostPorts, Json } from './ports'
import { STORAGE_KEYS } from './ports'

export const LOCK_FRESH_MS = 5000
// The holder renews at this interval. It stays well under LOCK_FRESH_MS.
export const HEARTBEAT_MS = 2000

export interface LockRecord {
  readonly sessionId: string
  readonly heartbeat: number
}

export function parseLock(raw: Json | undefined): LockRecord | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const { sessionId, heartbeat } = raw as { sessionId?: Json; heartbeat?: Json }
  if (typeof sessionId !== 'string' || typeof heartbeat !== 'number') return null
  return { sessionId, heartbeat }
}

export function isFresh(lock: LockRecord, now: number): boolean {
  return lock.sessionId !== '' && now - lock.heartbeat < LOCK_FRESH_MS
}

// True when another instance holds a fresh lock.
export function isHeldByOther(lock: LockRecord | null, id: string, now: number): boolean {
  return lock !== null && lock.sessionId !== id && isFresh(lock, now)
}

export async function readLock(ports: HostPorts): Promise<LockRecord | null> {
  return parseLock(await ports.storage.get(STORAGE_KEYS.lock))
}

async function writeLock(ports: HostPorts, sessionId: string, heartbeat: number): Promise<void> {
  await ports.storage.set(STORAGE_KEYS.lock, { sessionId, heartbeat })
}

// Takes the lock when no other instance holds a fresh one. It answers true
// when this instance holds the lock after the write.
export async function claimLock(ports: HostPorts): Promise<boolean> {
  const now = ports.clock.now()
  if (isHeldByOther(await readLock(ports), ports.instanceId, now)) return false
  await writeLock(ports, ports.instanceId, now)
  return (await readLock(ports))?.sessionId === ports.instanceId
}

// Renews the heartbeat. It answers false, and writes nothing, when another
// instance took the lock since the last renewal.
export async function renewLock(ports: HostPorts): Promise<boolean> {
  const now = ports.clock.now()
  if (isHeldByOther(await readLock(ports), ports.instanceId, now)) return false
  await writeLock(ports, ports.instanceId, now)
  return true
}

// Frees the lock at once when this instance holds it. A release writes an
// empty owner, because storage has no delete.
export async function releaseLock(ports: HostPorts): Promise<void> {
  const lock = await readLock(ports)
  if (lock?.sessionId === ports.instanceId) await writeLock(ports, '', 0)
}
