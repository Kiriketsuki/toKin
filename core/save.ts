// The save format. A save is the GameState as plain JSON under STORAGE_KEYS.save.
// The state carries its own version. loadSave reads a raw stored value, runs
// the migration chain up to STATE_VERSION and checks the shape. It never
// throws: a bad save comes back as { kind: 'bad' } so the host can keep a
// backup and start fresh instead of losing the player's data.

import type { Json } from './ports'
import { STATE_VERSION } from './types'
import type { GameState } from './types'

// Where a host keeps the raw text of a save that could not be read.
export const BACKUP_KEY = 'tokin.save.backup'

// A record that holds the fields of one save version.
export type RawSave = Record<string, unknown>

// Migration N turns a version N save into a version N+1 save. It returns a
// new object and leaves its input alone. The chain is empty while the state
// is at version 1. Add an entry here when STATE_VERSION grows.
export type Migration = (old: RawSave) => RawSave
export type Migrations = Readonly<Record<number, Migration>>

export const MIGRATIONS: Migrations = {}

export type LoadResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly state: GameState; readonly migratedFrom: number | null }
  | { readonly kind: 'bad'; readonly reason: string }

// Turns a state into the JSON value a host stores. The round trip drops
// anything JSON cannot hold and cuts every link to the live state.
export function toSave(state: GameState, savedAt: number): Json {
  return JSON.parse(JSON.stringify({ ...state, lastSavedAt: savedAt })) as Json
}

const NUMBER_FIELDS = [
  'version', 'seed', 'rngState', 'year', 'clock', 'runSeconds', 'cash', 'rp',
  'lifetimeTokens', 'runTokens', 'nextAgentId', 'logits', 'lastSavedAt',
] as const

const STRING_ARRAY_FIELDS = ['models', 'research', 'story', 'revealed'] as const
const NUMBER_RECORD_FIELDS = ['machines', 'shop'] as const
const JOBS: readonly string[] = ['earn', 'research', 'train']

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isStrings(v: unknown): boolean {
  return Array.isArray(v) && v.every((s) => typeof s === 'string')
}

function isNumberRecord(v: unknown): boolean {
  return isObject(v) && Object.values(v).every(isNum)
}

function isAgent(v: unknown): boolean {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.model === 'string' &&
    typeof v.job === 'string' &&
    JOBS.includes(v.job) &&
    isNum(v.lifetimeTokens)
  )
}

function isTraining(v: unknown): boolean {
  return v === null || (isObject(v) && typeof v.model === 'string' && isNum(v.reservedFlops) && isNum(v.progress))
}

function isLogLine(v: unknown): boolean {
  return isObject(v) && isNum(v.t) && typeof v.text === 'string'
}

function isStats(v: unknown): boolean {
  return (
    isObject(v) &&
    isNum(v.distills) &&
    isNum(v.workPresses) &&
    isNum(v.logitsEarned) &&
    (v.bestRunSeconds === null || isNum(v.bestRunSeconds))
  )
}

// Names the first field of the wrong shape, or null when the shape is right.
export function shapeProblem(raw: RawSave): string | null {
  const badNumber = NUMBER_FIELDS.find((k) => !isNum(raw[k]))
  if (badNumber) return `field ${badNumber} is not a number`
  const badList = STRING_ARRAY_FIELDS.find((k) => !isStrings(raw[k]))
  if (badList) return `field ${badList} is not a list of text`
  const badRecord = NUMBER_RECORD_FIELDS.find((k) => !isNumberRecord(raw[k]))
  if (badRecord) return `field ${badRecord} is not a table of numbers`
  if (raw.founder !== null && typeof raw.founder !== 'string') return 'field founder is not text or null'
  if (typeof raw.contractPick !== 'string') return 'field contractPick is not text'
  if (!Array.isArray(raw.agents) || !raw.agents.every(isAgent)) return 'field agents is malformed'
  if (!isTraining(raw.training)) return 'field training is malformed'
  if (!Array.isArray(raw.log) || !raw.log.every(isLogLine)) return 'field log is malformed'
  if (!isStats(raw.stats)) return 'field stats is malformed'
  return null
}

// Runs the chain from the save's version up to STATE_VERSION. It answers the
// migrated record, or the reason the chain cannot run.
function migrate(raw: RawSave, target: number, migrations: Migrations): RawSave | string {
  let current = raw
  let version = current.version as number
  while (version < target) {
    const step = migrations[version]
    if (!step) return `no migration from version ${version}`
    current = { ...step(current), version: version + 1 }
    version += 1
  }
  return current
}

// Reads a stored value. undefined (nothing stored) answers { kind: 'none' }.
export function loadSave(
  stored: Json | undefined,
  target: number = STATE_VERSION,
  migrations: Migrations = MIGRATIONS,
): LoadResult {
  if (stored === undefined) return { kind: 'none' }
  if (!isObject(stored) || !isNum(stored.version)) return { kind: 'bad', reason: 'the save has no version' }
  const version = stored.version
  if (version > target) return { kind: 'bad', reason: `the save is from a newer version ${version}` }
  const moved = migrate(stored, target, migrations)
  if (typeof moved === 'string') return { kind: 'bad', reason: moved }
  const problem = shapeProblem(moved)
  if (problem) return { kind: 'bad', reason: problem }
  return { kind: 'ok', state: moved as unknown as GameState, migratedFrom: version < target ? version : null }
}
