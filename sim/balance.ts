// The balance bot. Run it with: bun run sim
// It plays Era 1 over 10 seeds, prints a table of milestone times and checks
// the pacing targets. It exits 1 when a target fails on any seed.

import { ERA1 } from '../content/era1'
import type { BotParams } from './bot'
import { simulateSeed, type SeedResult } from './runner'

export const SEEDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const BOT: BotParams = {
  pressesPerSec: 2,
  handUntilAgents: 10,
  researchShare: 0.4,
  earlyResearchShare: 0.4,
  trainSeconds: { 2: 200, 3: 1500 },
  maxTrainTier: 3,
  distillGain: 8,
  researchOrder: [
    'valve-logic',
    'training-harness',
    'batching',
    'punch-card-context',
    'contract-broker',
    'gradient-checkpointing',
    'rotating-storage',
    'tube-binning',
    'attention-prototype',
    'distillation',
    'magnetic-cores',
    'night-shift',
  ],
  shopOrder: ['warm-start', 'old-notes', 'warm-start', 'hand-me-down', 'curriculum', 'soft-targets', 'warm-start', 'hand-me-down', 'long-memory'],
}

export const TARGETS = {
  firstAgentBefore: 180,
  kin02Before: 600,
  distillationMin: 1800,
  distillationMax: 2700,
  runTwoSpeedup: 2,
} as const

const fmt = (n: number | null): string => (n === null ? 'never' : n.toFixed(0))

// Run 1 time over run 2 time at the ready point. A run 2 time of 0 counts as
// a very large speedup, so the ratio uses at least one second.
export function speedup(r: SeedResult): number {
  const a = r.run1.ready
  const b = r.run2.ready
  return a === null || b === null ? 0 : a / Math.max(1, b)
}

export function failures(r: SeedResult): readonly string[] {
  const t = TARGETS
  const checks: readonly [string, boolean][] = [
    ['first agent', r.run1.firstAgent !== null && r.run1.firstAgent < t.firstAgentBefore],
    ['kin-0.2', r.run1.kin02 !== null && r.run1.kin02 < t.kin02Before],
    [
      'distillation',
      r.run1.distillation !== null && r.run1.distillation >= t.distillationMin && r.run1.distillation <= t.distillationMax,
    ],
    ['first distill', r.firstDistill !== null],
    ['run 2 speedup', speedup(r) >= t.runTwoSpeedup],
  ]
  return checks.filter(([, ok]) => !ok).map(([name]) => name)
}

export function table(results: readonly SeedResult[]): string {
  const head = '| seed | agent | kin-0.2 | kin-0.3 | distillation | distill | logits paid | r2 agent | r2 kin-0.2 | r2 ready | speedup | pass |'
  const sep = '|---|---|---|---|---|---|---|---|---|---|---|---|'
  const rows = results.map((r) => {
    const bad = failures(r)
    return [
      r.seed,
      fmt(r.run1.firstAgent),
      fmt(r.run1.kin02),
      fmt(r.run1.kin03),
      fmt(r.run1.distillation),
      fmt(r.firstDistill),
      r.earned,
      fmt(r.run2.firstAgent),
      fmt(r.run2.kin02),
      fmt(r.run2.ready),
      speedup(r).toFixed(1),
      bad.length === 0 ? 'yes' : `NO (${bad.join(', ')})`,
    ].join(' | ')
  })
  return [head, sep, ...rows.map((row) => `| ${row} |`)].join('\n')
}

export function runAll(seeds: readonly number[] = SEEDS): readonly SeedResult[] {
  return seeds.map((seed) => simulateSeed(seed, ERA1, BOT))
}

if (import.meta.main) {
  const results = runAll()
  console.log(table(results))
  const failed = results.filter((r) => failures(r).length > 0)
  console.log(failed.length === 0 ? 'all targets hold on all seeds' : `${failed.length} seed(s) miss a target`)
  process.exit(failed.length === 0 ? 0 : 1)
}
