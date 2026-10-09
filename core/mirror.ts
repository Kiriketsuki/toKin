// Mirror events. A host reports a real event from its own world, such as a
// rate limit or a context compaction, and the game answers with one log line.
// A mirror event has no economy effect. The throttle keeps a burst of events
// from filling the log. The core reads no clock here: the caller passes the
// time from its clock port.

import { withLog } from './state'
import type { ContentPack, GameState, MirrorKey } from './types'

// A mirror line of one kind appears at most once in this many milliseconds.
export const MIRROR_INTERVAL_MS = 10 * 60 * 1000

// When each kind of mirror line last appeared, in host epoch milliseconds.
export type MirrorClock = Readonly<Partial<Record<MirrorKey, number>>>

// True when a line of this kind may appear now.
export function isMirrorDue(clock: MirrorClock, key: MirrorKey, nowMs: number): boolean {
  const last = clock[key]
  return last === undefined || nowMs - last >= MIRROR_INTERVAL_MS
}

export interface MirrorResult {
  readonly state: GameState
  readonly clock: MirrorClock
  readonly isLogged: boolean
}

// Adds the mirror line for `key` to the log when the throttle allows it.
// Content without a mirror line for the key logs nothing. The economy fields
// of the state stay the same object.
export function applyMirror(
  state: GameState,
  content: ContentPack,
  clock: MirrorClock,
  key: MirrorKey,
  nowMs: number,
): MirrorResult {
  const text = content.mirror?.[key]
  if (text === undefined || !isMirrorDue(clock, key, nowMs)) {
    return { state, clock, isLogged: false }
  }
  return { state: withLog(state, content, text), clock: { ...clock, [key]: nowMs }, isLogged: true }
}
