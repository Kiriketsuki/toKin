// The Era 1 content pack: a 1950s garage, four machines, four kin models.
// Plain JSON-serialisable data typed by core/types.ts. It holds no function.
// The balance bot in sim/ tuned the numbers. docs/balance.md lists what changed and why.

import type { ContentPack, ContractDef, MachineDef, ModelDef, ShopDef } from '../core/types'
import { ERA1_NAMES } from './era1-names'
import { ERA1_RESEARCH } from './era1-research'
import { ERA1_STORY } from './era1-story'

const MACHINES: readonly MachineDef[] = [
  {
    id: 'relay-rack',
    name: 'Relay Rack',
    flavour: 'secondhand, from a telephone exchange. it still smells of cigarettes.',
    baseCost: 25,
    ratio: 1.13,
    flops: 1,
    startsUnlocked: true,
    perks: [],
  },
  {
    id: 'valve-bank',
    name: 'Thermionic Tensor Valve bank',
    flavour: 'warm to the touch. then warm to stand near. then a fire risk.',
    baseCost: 400,
    ratio: 1.14,
    flops: 12,
    startsUnlocked: false,
    perks: [],
  },
  {
    id: 'drum-cabinet',
    name: 'Drum Memory Cabinet',
    flavour: 'a spinning cylinder that remembers. it never stops spinning.',
    baseCost: 6000,
    ratio: 1.15,
    flops: 100,
    startsUnlocked: false,
    perks: [{ kind: 'contextPerUnit', value: 0.1, maxUnits: 5 }],
  },
  {
    id: 'core-lattice',
    name: 'Core Lattice',
    flavour: 'a woven mesh of magnets. the whole street feels it switch on.',
    baseCost: 90000,
    ratio: 1.15,
    flops: 1500,
    startsUnlocked: false,
    perks: [],
  },
]

const MODELS: readonly ModelDef[] = [
  { id: 'kin-0.1', name: 'kin-0.1', tier: 1, footprint: 1, tokPerSec: 8, quality: 1.0, context: 64, acquire: { kind: 'start' } },
  { id: 'kin-0.2', name: 'kin-0.2', tier: 2, footprint: 4, tokPerSec: 24, quality: 1.6, context: 256, acquire: { kind: 'train', cost: 1200 } },
  { id: 'kin-0.3', name: 'kin-0.3', tier: 3, footprint: 20, tokPerSec: 80, quality: 2.8, context: 1024, acquire: { kind: 'train', cost: 170000 } },
  { id: 'kin-0.4', name: 'kin-0.4', tier: 4, footprint: 120, tokPerSec: 288, quality: 5.0, context: 4096, acquire: { kind: 'train', cost: 2400000 } },
]

const CONTRACTS: readonly ContractDef[] = [
  { id: 'payroll', name: 'Payroll tabulation', minContext: 32, payPerToken: 0.1 },
  { id: 'ballistics', name: 'Ballistics tables', minContext: 128, payPerToken: 0.15 },
  { id: 'census', name: 'Census punching', minContext: 512, payPerToken: 0.22 },
  { id: 'actuarial', name: 'Actuarial tables', minContext: 2048, payPerToken: 0.35 },
]

// A table cost sets its own limit, so maxLevel matches the table length.
// A keepModels level lists every model kept at that level, not only the new one.
const SHOP: readonly ShopDef[] = [
  {
    id: 'warm-start',
    name: 'Warm Start',
    description: 'Start each run with 1, 2 or 3 Relay Racks.',
    maxLevel: 3,
    cost: { kind: 'table', values: [1, 3, 9] },
    effect: { kind: 'startMachines', machine: 'relay-rack', perLevel: [1, 2, 3] },
  },
  {
    id: 'soft-targets',
    name: 'Soft Targets',
    description: '+10% tok/s per level. No limit.',
    maxLevel: null,
    cost: { kind: 'geometric', base: 2, ratio: 1.6 },
    effect: { kind: 'tokMultPerLevel', value: 0.1 },
  },
  {
    id: 'long-memory',
    name: 'Long Memory',
    description: '+25% context per level. Max 4.',
    maxLevel: 4,
    cost: { kind: 'geometric', base: 3, ratio: 2 },
    effect: { kind: 'contextMultPerLevel', value: 0.25 },
  },
  {
    id: 'curriculum',
    name: 'Curriculum',
    description: 'Training runs 20% faster per level. Max 5.',
    maxLevel: 5,
    cost: { kind: 'geometric', base: 4, ratio: 2 },
    effect: { kind: 'trainSpeedPerLevel', value: 0.2 },
  },
  {
    id: 'hand-me-down',
    name: 'Hand-me-down',
    description: 'Keep kin-0.2, then kin-0.3, after Distill.',
    maxLevel: 2,
    cost: { kind: 'table', values: [5, 20] },
    effect: { kind: 'keepModels', perLevel: [['kin-0.2'], ['kin-0.2', 'kin-0.3']] },
  },
  {
    id: 'old-notes',
    name: 'Old Notes',
    description: 'Keep Training Harness and Contract Broker after Distill.',
    maxLevel: 1,
    cost: { kind: 'table', values: [3] },
    effect: { kind: 'keepResearch', research: ['training-harness', 'contract-broker'] },
  },
]

export const ERA1: ContentPack = {
  id: 'era1',
  name: 'Era 1: The Garage',
  computeUnit: 'kFLOP/s',
  balance: {
    startYear: 1952,
    startCash: 0,
    handWorkTokens: 5,
    handWorkContract: 'payroll',
    researchRate: 0.0015,
    unspentLogitBonus: 0.02,
    distillK: 1,
    distillT0: 2000,
    offlineCapSeconds: 7200,
    catchUpChunkSeconds: 60,
    logLimit: 100,
    revealFraction: 0.5,
  },
  text: {
    offlineReturn: 'you slept. it did not.',
    offlineSummary: '{seconds} seconds passed. it made {tokens} tokens and earned {cash}.',
    founderNamed: '{name}. {year}. the garage door sticks.',
    needsFounder: 'name the founder first.',
    notEnoughCash: 'not enough cash: needs {need}',
    notEnoughRp: 'not enough research: needs {need} rp',
    notEnoughLogits: 'not enough logits: needs {need}',
    notEnoughCompute: 'not enough free compute: needs {need} kFLOP/s',
    locked: '{name} is not available yet.',
    unknownId: 'nothing here is called {id}.',
    contextTooShort: 'its context is too short: needs {need}',
    trainingBusy: 'a training run is already going.',
    alreadyDone: '{name} is already done.',
    maxLevel: '{name} cannot go higher.',
    distillLocked: 'you do not know how to distill yet.',
    distilled: '{logits} logits kept. everything else is gone.',
  },
  mirror: {
    rateLimit: 'the punch-card supplier is out of stock. come back later.',
    compaction: 'the ledger was boiled down. the sums survived. the margin notes did not.',
  },
  machines: MACHINES,
  models: MODELS,
  contracts: CONTRACTS,
  research: ERA1_RESEARCH,
  shop: SHOP,
  story: ERA1_STORY,
  names: ERA1_NAMES,
}
