// The runtime driver. A Game owns the live state of one save and moves it
// forward through HostPorts only. It loads and migrates the save, simulates
// the time spent away, ticks every second, saves every 30 seconds and on
// stop, and keeps the single-ticker lock. A host reads snapshots, draws the
// view and dispatches Actions. The core never names a host API here.
//
// Roles:
//   dormant  start has not run, or stop has run. No timer and no lock.
//   ticker   this instance holds the lock and advances the save.
//   viewer   another instance holds the lock. This one only draws. It steps
//            its copy forward from the last save, so the numbers move, and it
//            refuses every action.

import { attempt } from './actions'
import { applyMirror } from './mirror'
import type { MirrorClock } from './mirror'
import { advance, catchUp, SLEEP_NOTICE_SECONDS } from './offline'
import type { Cancel, HostPorts } from './ports'
import { STORAGE_KEYS } from './ports'
import { BACKUP_KEY, loadSave, toSave } from './save'
import { initialState } from './state'
import { newBeats } from './story'
import type { Action, ContentPack, GameState, LogLine, MirrorKey, Verdict, ViewModel } from './types'
import { buildView } from './view'
import { claimLock, HEARTBEAT_MS, isHeldByOther, readLock, releaseLock, renewLock } from './lock'

export type GameRole = 'dormant' | 'ticker' | 'viewer'

export const TICK_MS = 1000
export const AUTOSAVE_MS = 30_000
// A viewer re-reads the save and the lock at this interval.
export const VIEWER_POLL_MS = 2000

export const VIEWER_NOTICE = 'running in another session'
export const DORMANT_NOTICE = 'the game is not running in this session'

export interface Snapshot {
  readonly state: GameState | null
  readonly role: GameRole
}

export type Listener = (snapshot: Snapshot) => void

// Actions that save at once, because losing them costs the player real progress.
const SAVE_NOW: readonly Action['type'][] = ['nameFounder', 'distill']

// The log lines that state `after` added to state `before`. Both logs share
// line objects, because the core never copies a line it keeps.
export function newLogLines(before: GameState | null, after: GameState): readonly LogLine[] {
  const last = before?.log[before.log.length - 1]
  const at = last === undefined ? -1 : after.log.lastIndexOf(last)
  return after.log.slice(at + 1)
}

export class Game {
  private state: GameState | null = null
  private role: GameRole = 'dormant'
  private cancelTimer: Cancel | null = null
  private lastTickMs = 0
  private lastSaveMs = 0
  private lastHeartbeatMs = 0
  private lastPollMs = 0
  private isBusy = false
  private lastError = ''
  private mirrorClock: MirrorClock = {}
  private readonly listeners = new Set<Listener>()

  constructor(
    private readonly ports: HostPorts,
    private readonly content: ContentPack,
  ) {}

  // The input side. It answers at once. A viewer or a dormant game refuses.
  readonly dispatch = (action: Action): Verdict => {
    if (this.role !== 'ticker' || this.state === null) {
      return { ok: false, reason: this.role === 'viewer' ? VIEWER_NOTICE : DORMANT_NOTICE }
    }
    const result = attempt(this.state, this.content, action)
    if (!result.verdict.ok) return result.verdict
    this.commit(result.state)
    if (SAVE_NOW.includes(action.type)) void this.guard(() => this.save())
    return result.verdict
  }

  // The host reports a real event, such as a rate limit. The game logs one
  // mirror line, at most once per interval for each kind. Only the ticker
  // writes the log. The answer says whether a line was logged.
  readonly mirror = (key: MirrorKey): boolean => {
    if (this.role !== 'ticker' || this.state === null) return false
    const result = applyMirror(this.state, this.content, this.mirrorClock, key, this.ports.clock.now())
    this.mirrorClock = result.clock
    if (result.isLogged) this.commit(result.state, true)
    return result.isLogged
  }

  snapshot(): Snapshot {
    return { state: this.state, role: this.role }
  }

  view(): ViewModel | null {
    return this.state === null ? null : buildView(this.state, this.content, this.ports.clock.now())
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Loads the save, takes the lock when it is free, and starts the timer.
  async start(): Promise<void> {
    if (this.role !== 'dormant') return
    const loaded = await this.load()
    const now = this.ports.clock.now()
    this.lastTickMs = this.lastSaveMs = this.lastHeartbeatMs = this.lastPollMs = now
    if (await claimLock(this.ports)) await this.becomeTicker(loaded)
    else this.becomeViewer(loaded, now)
    this.cancelTimer = this.ports.clock.every(TICK_MS, () => void this.guard(() => this.tick()))
  }

  // Saves, frees the lock and stops the timer. A second call does nothing.
  async stop(): Promise<void> {
    this.cancelTimer?.()
    this.cancelTimer = null
    if (this.role === 'dormant') return
    if (this.role === 'ticker') {
      await this.guard(async () => {
        await this.save()
        await releaseLock(this.ports)
      })
    }
    this.role = 'dormant'
    this.publish()
  }

  // ---- loading ----

  // Reads the save. A save that cannot be read is backed up and replaced by
  // a new game, and the host hears about it.
  private async load(): Promise<GameState> {
    const stored = await this.ports.storage.get(STORAGE_KEYS.save)
    const result = loadSave(stored)
    if (result.kind === 'ok') return result.state
    if (result.kind === 'bad' && stored !== undefined) {
      await this.ports.storage.set(BACKUP_KEY, stored)
      this.ports.notifier.toast(`toKin: the save could not be read (${result.reason}). A copy is kept.`)
    }
    return initialState(this.ports.newSeed(), this.content)
  }

  private async becomeTicker(loaded: GameState): Promise<void> {
    const now = this.ports.clock.now()
    const away = loaded.lastSavedAt > 0 ? (now - loaded.lastSavedAt) / 1000 : 0
    this.role = 'ticker'
    this.lastTickMs = this.lastHeartbeatMs = now
    this.commit(catchUp(loaded, this.content, away), true)
    await this.save()
  }

  // A viewer shows the save as it stands now: the saved state plus the time
  // since that save, run without any log line.
  private becomeViewer(saved: GameState, now: number): void {
    this.role = 'viewer'
    const gap = saved.lastSavedAt > 0 ? (now - saved.lastSavedAt) / 1000 : 0
    this.commit(advance(saved, this.content, Math.max(0, gap)), true)
  }

  // ---- the tick ----

  private async guard(work: () => Promise<void>): Promise<void> {
    try {
      await work()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== this.lastError) this.ports.notifier.toast(`toKin: ${message}`)
      this.lastError = message
    }
  }

  private async tick(): Promise<void> {
    if (this.isBusy || this.role === 'dormant' || this.state === null) return
    this.isBusy = true
    try {
      const now = this.ports.clock.now()
      this.runTime(now)
      if (this.role === 'ticker') await this.keepLock(now)
      else await this.pollSave(now)
      this.publish()
    } finally {
      this.isBusy = false
    }
  }

  // Moves the state by the time since the last tick. A long gap (the machine
  // slept) goes through catch-up, so it logs the return lines and obeys the cap.
  private runTime(now: number): void {
    const elapsed = (now - this.lastTickMs) / 1000
    this.lastTickMs = now
    if (this.state === null || !(elapsed > 0)) return
    const isSleep = elapsed >= SLEEP_NOTICE_SECONDS
    const next = isSleep ? catchUp(this.state, this.content, elapsed) : advance(this.state, this.content, elapsed)
    this.commit(next, isSleep)
  }

  private async keepLock(now: number): Promise<void> {
    if (now - this.lastHeartbeatMs >= HEARTBEAT_MS) {
      this.lastHeartbeatMs = now
      if (!(await renewLock(this.ports))) {
        this.role = 'viewer'
        return
      }
    }
    if (now - this.lastSaveMs >= AUTOSAVE_MS) await this.save()
  }

  // A viewer polls the lock. When it is free, the viewer takes over from the
  // save. Otherwise it adopts a newer save from the ticker.
  private async pollSave(now: number): Promise<void> {
    if (now - this.lastPollMs < VIEWER_POLL_MS) return
    this.lastPollMs = now
    const lock = await readLock(this.ports)
    const saved = loadSave(await this.ports.storage.get(STORAGE_KEYS.save))
    const fresh = saved.kind === 'ok' ? saved.state : null
    if (!isHeldByOther(lock, this.ports.instanceId, now) && (await claimLock(this.ports))) {
      await this.becomeTicker(fresh ?? { ...(this.state as GameState), lastSavedAt: now })
    } else if (fresh !== null && fresh.lastSavedAt > (this.state?.lastSavedAt ?? 0)) {
      this.becomeViewer(fresh, now)
    }
  }

  // ---- state changes ----

  private async save(): Promise<void> {
    if (this.state === null) return
    const now = this.ports.clock.now()
    this.state = { ...this.state, lastSavedAt: now }
    this.lastSaveMs = now
    await this.ports.storage.set(STORAGE_KEYS.save, toSave(this.state, now))
  }

  // Takes a new state, tells the notifier about new log lines and shows each
  // new story beat as a toast. A quiet commit skips the toasts.
  private commit(next: GameState, isQuiet = false): void {
    const before = this.state
    this.state = next
    if (before === next) return
    const lines = newLogLines(before, next)
    lines.forEach((line) => this.ports.notifier.log(line))
    if (!isQuiet && before !== null) {
      const beats = newBeats(before, next).length
      if (beats > 0) lines.slice(-beats).forEach((line) => this.ports.notifier.toast(line.text))
    }
    this.publish()
  }

  private publish(): void {
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

export function createGame(ports: HostPorts, content: ContentPack): Game {
  return new Game(ports, content)
}
