// Era 1 story beats. Each beat fires once, on an economy threshold and never
// on a timer. Content order is check order. The placeholder {agent} stands
// for the name of the first agent the player created.

import type { StoryBeatDef } from '../core/types'

export const ERA1_STORY: readonly StoryBeatDef[] = [
  {
    id: 'cold-room',
    text: 'the room is cold. the payroll ledger is due friday.',
    trigger: { kind: 'stat', stat: 'cash', gte: 0 },
  },
  {
    id: 'numbers-add-up',
    text: 'the numbers add up. they always do, eventually.',
    trigger: { kind: 'stat', stat: 'workPresses', gte: 10 },
  },
  {
    id: 'bank-manager',
    text: 'the bank manager calls you sir. he has not read the ledger.',
    trigger: { kind: 'stat', stat: 'cash', gte: 50 },
  },
  {
    id: 'relay-rack',
    text: 'a relay rack, secondhand. it clicks like rain on tin.',
    trigger: { kind: 'machine', machine: 'relay-rack', gte: 1 },
  },
  {
    id: 'first-agent',
    text: '{agent} takes the next ledger. it does not ask for lunch.',
    trigger: { kind: 'agents', gte: 1 },
  },
  {
    id: 'halloran-payroll',
    text: "it finished mrs. halloran's payroll. that was your job on tuesdays.",
    trigger: {
      kind: 'all',
      of: [
        { kind: 'agents', gte: 1 },
        { kind: 'stat', stat: 'lifetimeTokens', gte: 300 },
      ],
    },
  },
  {
    id: 'electronic-brain',
    text: 'a man in a hat calls it an electronic brain. the paper prints it twice.',
    trigger: { kind: 'stat', stat: 'tokPerSec', gte: 10 },
  },
  {
    id: 'valves-glow',
    text: 'the valves glow orange. the garage is warm for the first time in years.',
    trigger: { kind: 'machine', machine: 'valve-bank', gte: 1 },
    year: 1953,
  },
  {
    id: 'cooling-bucket',
    text: 'the cooling bucket needs refilling twice a day now.',
    trigger: { kind: 'machine', machine: 'valve-bank', gte: 3 },
  },
  {
    id: 'second-one',
    text: 'the second one is better. you are not sure how.',
    trigger: { kind: 'model', model: 'kin-0.2' },
    year: 1954,
  },
  {
    id: 'reads-your-notes',
    text: 'it reads your notes and writes better ones. you keep the better ones.',
    trigger: { kind: 'agents', job: 'research', gte: 1 },
  },
  {
    id: 'training-harness',
    text: 'the harness hums. you hold your breath out of habit.',
    trigger: { kind: 'research', research: 'training-harness' },
  },
  {
    id: 'picks-the-paying-ones',
    text: 'it reads the contracts first. it picks the ones that pay. you did not teach it that.',
    trigger: { kind: 'research', research: 'contract-broker' },
  },
  {
    id: 'drum-all-night',
    text: 'the drum spins all night. so does the electric meter.',
    trigger: { kind: 'machine', machine: 'drum-cabinet', gte: 1 },
    year: 1956,
  },
  {
    id: 'tube-drawer',
    text: 'you bin the tubes by hand. the bad ones go in a drawer. the drawer is filling.',
    trigger: { kind: 'research', research: 'tube-binning' },
  },
  {
    id: 'light-stays-on',
    text: 'the garage light never goes off. the neighbours stop asking.',
    trigger: { kind: 'research', research: 'night-shift' },
  },
  {
    id: 'unanswerable-question',
    text: 'you ask it a question you cannot answer. it tries.',
    trigger: { kind: 'model', model: 'kin-0.3' },
    year: 1957,
  },
  {
    id: 'counts-the-town',
    text: 'it counts the town in an afternoon. the town does not know.',
    trigger: {
      kind: 'all',
      of: [
        { kind: 'research', research: 'contract-broker' },
        { kind: 'model', model: 'kin-0.3' },
      ],
    },
  },
  {
    id: 'looks-at-everything',
    text: 'it looks at everything at once. you feel looked at.',
    trigger: { kind: 'research', research: 'attention-prototype' },
  },
  {
    id: 'street-lights-dim',
    text: 'the street lights dim when the lattice starts. the neighbours have opinions.',
    trigger: { kind: 'machine', machine: 'core-lattice', gte: 1 },
    year: 1959,
  },
  {
    id: 'magnets-remember',
    text: 'ten thousand tiny magnets, each one remembering. the water bill remembers too.',
    trigger: { kind: 'research', research: 'magnetic-cores' },
  },
  {
    id: 'fourth-one',
    text: 'the fourth one asks what the others are for. you say: for you.',
    trigger: { kind: 'model', model: 'kin-0.4' },
    year: 1961,
  },
  {
    id: 'word-distillation',
    text: 'you read the word distillation twice. it means keeping the part that matters.',
    trigger: { kind: 'research', research: 'distillation' },
  },
  {
    id: 'forgot-almost-everything',
    text: 'it forgot almost everything. it kept what mattered.',
    trigger: { kind: 'stat', stat: 'distills', gte: 1 },
  },
]
