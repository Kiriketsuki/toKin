// The research effect interpreter. Each effect kind has one fold in the
// EFFECT_FOLDS table. A fold takes the totals so far and one effect, and
// returns new totals. Content adds an effect by using a kind from the table,
// so a new research item needs no engine change. A new kind needs one more
// table entry, and the compiler requires it because the table is exhaustive.

import type { Job, MachineId, ResearchEffect } from './types'

export interface QualityBoost {
  readonly value: number
  readonly minTier: number
}

// What a set of research effects adds up to. Multipliers start at 1.
export interface EffectTotals {
  readonly tokMult: number
  readonly contextMult: number
  readonly machineCostMult: number
  readonly trainingCostMult: number
  readonly qualityBoosts: readonly QualityBoost[]
  readonly hasBroker: boolean
  readonly canDistill: boolean
  // Zero means no research raised the cap.
  readonly offlineCapSeconds: number
  readonly unlockedMachines: ReadonlySet<MachineId>
  readonly unlockedJobs: ReadonlySet<Job>
}

export const NO_EFFECTS: EffectTotals = {
  tokMult: 1,
  contextMult: 1,
  machineCostMult: 1,
  trainingCostMult: 1,
  qualityBoosts: [],
  hasBroker: false,
  canDistill: false,
  offlineCapSeconds: 0,
  unlockedMachines: new Set<MachineId>(),
  unlockedJobs: new Set<Job>(),
}

type EffectKind = ResearchEffect['kind']
type Fold<K extends EffectKind> = (totals: EffectTotals, effect: Extract<ResearchEffect, { kind: K }>) => EffectTotals

type FoldTable = { readonly [K in EffectKind]: Fold<K> }

function withItem<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
  return new Set([...set, item])
}

export const EFFECT_FOLDS: FoldTable = {
  tokMult: (t, e) => ({ ...t, tokMult: t.tokMult * e.value }),
  contextMult: (t, e) => ({ ...t, contextMult: t.contextMult * e.value }),
  machineCostMult: (t, e) => ({ ...t, machineCostMult: t.machineCostMult * e.value }),
  trainingCostMult: (t, e) => ({ ...t, trainingCostMult: t.trainingCostMult * e.value }),
  qualityMult: (t, e) => ({ ...t, qualityBoosts: [...t.qualityBoosts, { value: e.value, minTier: e.minTier }] }),
  autoContract: (t) => ({ ...t, hasBroker: true }),
  unlockDistill: (t) => ({ ...t, canDistill: true }),
  offlineCap: (t, e) => ({ ...t, offlineCapSeconds: Math.max(t.offlineCapSeconds, e.seconds) }),
  unlockMachine: (t, e) => ({ ...t, unlockedMachines: withItem(t.unlockedMachines, e.machine) }),
  unlockJob: (t, e) => ({ ...t, unlockedJobs: withItem(t.unlockedJobs, e.job) }),
}

// Applies one effect. The cast is safe because the table key matches the
// effect kind, which the FoldTable type checks for every entry.
export function foldEffect(totals: EffectTotals, effect: ResearchEffect): EffectTotals {
  const fold = EFFECT_FOLDS[effect.kind] as Fold<typeof effect.kind>
  return fold(totals, effect)
}

export function foldEffects(effects: readonly ResearchEffect[]): EffectTotals {
  return effects.reduce(foldEffect, NO_EFFECTS)
}
