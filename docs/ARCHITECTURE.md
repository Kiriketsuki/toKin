# toKin Architecture

toKin ships first as a Claude Code mod. A standalone game follows it. This
document sets the layers, the contracts and the formulas that let the same
core run in both hosts. Every later task follows it. The spec is
`docs/specs/todo/tokin-build-1-spec.md`.

## Layers

```
            content/            plain JSON data: machines, models, contracts,
               |                research, shop, story, names, balance, text
               v
            core/               pure TypeScript game engine
   types.ts, view-types.ts      the contract: GameState, Action, content
               |                types, ViewModel
   ports.ts                     the host contract: HostPorts, Dispatch
   step, apply, view            pure functions over GameState
   game.ts                      the runtime driver over HostPorts
               |
     +---------+----------+----------------------+
     |                    |                      |
  hooks/               sim/                  (later) standalone host
  Claude Code mod      headless balance bot  web, desktop or terminal
```

| Layer | Folder | May import | Must not |
|:--|:--|:--|:--|
| Content | `content/` | `core/types.ts` (types only) | import a package, `claude-code`, Node or Bun. Hold a function |
| Core | `core/` | other `core/` files, `content/` types | import `claude-code`, a package, Node or Bun. Use `$`, `Date.now`, `new Date`, `Math.random`, `console`, timers |
| Claude Code host | `hooks/` | `claude-code`, `core/`, `content/`, `types/` | hold game rules |
| Balance host | `sim/` | `core/`, `content/`, Bun and Node | import `claude-code` |
| Tooling | `scripts/` | anything Bun runs | ship in the mod |

Three checks enforce the boundary:

1. `scripts/check-boundary.ts` (run by `core/boundary.spec.ts` and `bun run check:boundary`) scans `core/`, `content/` and `sim/` for the forbidden imports and globals in the table.
2. `tsconfig.core.json` types `core/` and `content/` with `lib: es2023` and `types: []`. No host global exists there, so a host call fails to compile.
3. The hooks module imports the core with relative paths. The Claude Code loader follows an import out of `hooks/` into `core/`. `hooks/register.test.tsx` proves it: the pane draws `PORTS_VERSION` from `core/ports.ts`.

### Import boundary result (T1)

The flat layout works. `hooks/register.tsx` imports `../core/ports`, and
both `claude plugin validate` and `claude plugin test` load it. So `core/`
and `content/` stay at the repo root, beside `hooks/`. They do not move
under `hooks/`.

## Contracts

### Game state

`core/types.ts` defines `GameState`. It is flat, plain JSON and versioned by
`STATE_VERSION`. All compute numbers are kFLOP/s and all training work is
kFLOP·s. Times are seconds. Only `lastSavedAt` is epoch milliseconds, and the
host writes it when it saves.

`types/index.d.ts` is the `$.state` contract of the mod. The engine requires
that file to be self-contained, so it keeps a mirror of `GameState` named
`TokinGame`. `hooks/contract-check.ts` fails the typecheck when the mirror
and the core type differ. A change to `GameState` changes three places:
`core/types.ts`, `types/index.d.ts`, and a migration in `core/save.ts` once a
save has shipped.

`$.state` keys under the plugin `tokin`:

| Key | Type | Meaning |
|:--|:--|:--|
| `game` | `TokinGame \| null` | The live game state. Null until `/tokin` loads the save |
| `role` | `'dormant' \| 'ticker' \| 'viewer'` | Dormant until `/tokin` runs in the session |
| `pane` | `TokinPane` | Pane-local values: the Distill confirmation and a notice |

### Actions

`Action` is a tagged union on `type`: `nameFounder`, `work`, `buyMachine`,
`createAgent`, `assignAgent`, `removeAgent`, `startTraining`, `research`,
`pickContract`, `distill`, `buyShop`.

- `check(state, content, action): Verdict` answers whether the action can run now. A refusal carries player-facing text from `content.text`.
- `apply(state, content, action): GameState` runs it. On a refusal, `apply` returns the same object, so "nothing changes" is a reference check.
- A host dispatches through `Dispatch` from `core/ports.ts`. It shows the refusal reason as a notice or a toast.

`ActionOption.id` values in the view model are stable keys a host can use as
button keys: `work`, `buy:<machine>`, `create:<model>:<job>`,
`assign:<agent>:<job>`, `remove:<agent>`, `train:<model>`,
`research:<item>`, `pick:<contract>`, `distill`, `shop:<item>`.

### Content

Content types in `core/types.ts` hold data only. Effects, triggers and cost
curves are tagged unions, so a port in another language reads the same
JSON. `bun run export:content` writes `build/content/era1.json` and refuses a
pack that JSON cannot carry. `content/era1.ts` exports `ERA1: ContentPack`.

The core never names a content id. It reads behaviour from effects. The one
exception is `balance.handWorkContract`, which the content itself names.

Canonical ids for Era 1 (kebab-case):

| Table | Ids |
|:--|:--|
| Machines | `relay-rack`, `valve-bank`, `drum-cabinet`, `core-lattice` |
| Models | `kin-0.1`, `kin-0.2`, `kin-0.3`, `kin-0.4` |
| Contracts | `payroll`, `ballistics`, `census`, `actuarial` |
| Research | `valve-logic`, `batching`, `training-harness`, `punch-card-context`, `contract-broker`, `rotating-storage`, `tube-binning`, `night-shift`, `attention-prototype`, `magnetic-cores`, `gradient-checkpointing`, `distillation` |
| Shop | `warm-start`, `soft-targets`, `long-memory`, `curriculum`, `hand-me-down`, `old-notes` |

Text keys and their placeholders (`content.text`):

| Key | Placeholders | Example |
|:--|:--|:--|
| `offlineReturn` | none | `you slept. it did not.` |
| `offlineSummary` | `{seconds}`, `{cash}`, `{tokens}` | a summary line after catch-up |
| `founderNamed` | `{name}`, `{year}` | the first log line |
| `needsFounder` | none | refusal before the founder has a name |
| `notEnoughCash` | `{need}` | |
| `notEnoughRp` | `{need}` | |
| `notEnoughLogits` | `{need}` | |
| `notEnoughCompute` | `{need}` | `not enough free compute: needs {need} kFLOP/s` |
| `locked` | `{name}` | |
| `unknownId` | `{id}` | |
| `contextTooShort` | `{need}` | |
| `trainingBusy` | none | |
| `alreadyDone` | `{name}` | |
| `maxLevel` | `{name}` | |
| `distillLocked` | none | |
| `distilled` | `{logits}` | |

### Ports

`core/ports.ts` defines what a host gives the core:

- `StoragePort`: async `get` and `set` of JSON values by key. Keys are in `STORAGE_KEYS`: `tokin.save` and `tokin.lock`.
- `ClockPort`: `now()` in epoch milliseconds, and `every(ms, fn)` that answers a `Cancel`.
- `NotifierPort`: `toast(text)`, and `log(line)` for each new log line.
- `instanceId`: names this running host for the ticker lock.
- `newSeed()`: the seed of a new save.
- `Dispatch`: the input side. The host maps input to an `Action`.

### View model

`core/view-types.ts` defines `ViewModel`. A pure function of state and
content builds it (`core/view.ts`). Every number a host draws comes from it:
the header, agent rows, contract rows, machine rows with cost and time to
afford, model rows, research rows, the training row, shop rows, log lines,
the available actions with refusal reasons, and the Distill preview. A host
formats numbers with `core/format.ts`, and holds no rule of its own.

## Formulas

Symbols: `R` is the set of researched items, `L(x)` the level of shop item
`x`, `N` the unspent Logits, `B` the content `balance` table. A product over
effects is 1 when no effect of that kind applies.

### Machines and compute

```
cost(m, owned)  = round2(m.baseCost * m.ratio ^ owned * prod(machineCostMult in R))
total compute   = sum over m of owned(m) * m.flops
```

`round2` rounds to the cent, so a second Relay Rack costs exactly $28.25.
Vacuum Tube Binning is `machineCostMult 0.85`.

```
used   = sum of agent footprints + training.reservedFlops
free   = total - used
wasted = free + sum of footprints of idle agents
```

An agent is idle when it is on Earn with no contract its context allows, or
on Train with no run active. `createAgent` and `startTraining` draw on
`free`.

### Model stats for an agent

```
tokMult      = prod(tokMult in R)
             * (1 + 0.10 * L(soft-targets))
             * (1 + B.unspentLogitBonus * N)
tokPerSec    = model.tokPerSec * tokMult
quality      = model.quality * prod(qualityMult in R where model.tier >= minTier)
contextMult  = prod(contextMult in R)
             * (1 + 0.10 * min(owned(drum-cabinet), 5))
             * (1 + 0.25 * L(long-memory))
context      = model.context * contextMult
```

The Drum term comes from the machine perk `contextPerUnit`, and the shop
terms from `tokMultPerLevel` and `contextMultPerLevel`. Batching is
`tokMult 1.25`. Punch-card Context is `contextMult 1.5`. Attention Prototype
is `qualityMult 1.5, minTier 3`. Five unspent Logits give `1 + 0.02 * 5`,
so every tok/s value is 10% higher.

### Hand work

```
cash        += B.handWorkTokens * payPerToken(B.handWorkContract)   // 5 * 0.10
tokens      += B.handWorkTokens
workPresses += 1
```

Hand work needs no machine. No multiplier applies to it.

### Earn

```
contract = broker ? the best-paying contract with minContext <= context
                  : contractPick, when minContext <= context, else idle
cash/s   = tokPerSec * contract.payPerToken * quality
```

`broker` is true when an `autoContract` effect is in `R`.

### Research

```
RP/s = tokPerSec * quality^2 * B.researchRate      // researchRate 0.01
```

An item is available when every condition in `requires` holds. Researching
it spends its cost in RP.

### Tokens

Earn and Research agents add `tokPerSec * dt` to `runTokens`,
`lifetimeTokens` and the agent's own `lifetimeTokens`. Train and idle
agents make no tokens. Hand work adds to the run and lifetime totals.

### Training

The `unlockJob train` effect (Training Harness) unlocks both the Train job and
`startTraining`. One run goes at a time. A model is trainable when its
`acquire` is `train`, it is not unlocked, and the model one tier below is
unlocked.

```
cost  = model.acquire.cost * prod(trainingCostMult in R)       // Gradient Checkpointing 0.7
rate  = (training.reservedFlops + sum of footprints of Train agents)
        * (1 + 0.20 * L(curriculum))
progress += rate * dt
```

When `progress >= cost`, the model unlocks, `training` becomes null and the
reserved compute is free again. A Train agent adds its own footprint to the
active run, so the Train job turns an agent's compute into training work.
With no Train agent, 10 kFLOP/s on kin-0.2 (2,000 kFLOP·s) takes 200 s.

### Distill

```
payout = max(0, floor(B.distillK * sqrt(lifetimeTokens / B.distillT0)) - stats.logitsEarned)
```

`lifetimeTokens` counts across all runs, so the payout subtracts the Logits
that earlier Distills paid. A quick second Distill does not pay twice for
the same tokens. Distill needs the `unlockDistill` effect in `R` and a payout
of at least 1.

Distill resets: cash to `B.startCash`, RP, run tokens, run seconds,
machines, agents, training, research, models above the start models, the
contract pick, and `revealed`.

Distill keeps: Logits (plus the payout), shop levels, fired story beats,
stats, lifetime tokens, the founder, the year, the clock, the RNG state, the
agent id counter and the log.

After the reset, the shop applies: Warm Start sets the start machines, Old
Notes keeps its research list, Hand-me-down keeps its model list. The
`distillation` research item itself stays researched, as the design note
says. `stats.distills`, `stats.logitsEarned` and `stats.bestRunSeconds`
update.

### Logits shop

```
cost(table, level)     = values[level]                  // max level = values.length
cost(geometric, level) = ceil(base * ratio ^ level)
```

Each unspent Logit adds `B.unspentLogitBonus` (0.02) to the tok/s multiplier.
Soft Targets, Long Memory and Curriculum act at once. Warm Start tops the
start machine up to its level at once, and again at each Distill.
Hand-me-down and Old Notes act at the next Distill.

### Time to afford

```
secondsToAfford = 0                          when the player can afford it
                = (cost - held) / rate       when rate > 0
                = null                       otherwise
```

`held` and `rate` are cash and cash/s for machines, RP and RP/s for research.

### Reveal

A machine that starts unlocked always shows. Another machine shows once it
is unlocked and the player holds `B.revealFraction` (0.5) of its cost. A
research item shows once its requirements hold and the player holds half its
RP cost. A revealed id stays in `revealed` until Distill.

### Story

After each `step` and each `apply`, the core checks the story beats in
content order. A beat whose trigger holds and that has not fired is added
to `story`, its text goes to the log, and `year` moves forward to
`beat.year` when the beat sets one. A host shows each new beat as a toast.

### Time and offline catch-up

- A live host calls `step(state, content, 1)` once a second.
- `cap = max(offlineCap seconds in R, B.offlineCapSeconds)`. That is 2 h, or 8 h after Night Shift.
- Catch-up simulates `min(away, cap)` seconds through `step`, in chunks of at most `B.catchUpChunkSeconds`. Then it logs `offlineReturn` and `offlineSummary`.
- Catch-up and live ticks must agree within 1% for the same time.

### Log

New lines append at the end. The log keeps the last `B.logLimit` (100)
lines. `t` is `state.clock`.

### Random numbers

`core/rng.ts` is a mulberry32 generator over `state.rngState`. Each draw
answers the value and the next state. Agent names draw a first and a last
name from `content.names`. The same seed and the same actions replay the
same game.

## File ownership

The spec lists engine files under `engine/`. They live under `core/`.

| Task | Files |
|:--|:--|
| T1 | `.claude-plugin/plugin.json`, `hooks/hooks.json`, `types/index.d.ts`, `hooks/contract-check.ts`, `core/ports.ts`, `core/types.ts`, `core/view-types.ts`, `core/boundary.spec.ts`, `scripts/*`, `package.json`, `tsconfig*.json`, `bunfig.toml`, `README.md`, `docs/ARCHITECTURE.md` |
| T2 | `core/state.ts` (initial state), `core/rng.ts`, `core/economy.ts`, `core/conditions.ts`, `core/story.ts`, `core/step.ts`, `core/actions.ts`, `core/format.ts`, and their `*.spec.ts` |
| T3 | `content/era1.ts`, `content/era1.spec.ts` |
| T4 | `core/training.ts`, `core/research.ts`, `core/view.ts`, and their specs. T4 adds its formulas to `core/economy.ts` |
| T5 | `core/distill.ts`, `core/shop.ts`, and their specs. T5 adds its formulas to `core/economy.ts` |
| T6 | `hooks/ui/*.tsx` and `hooks/ui/*.test.tsx` |
| T7 | `core/game.ts`, `core/save.ts`, `hooks/register.tsx`, `hooks/adapter.ts`, and their tests |
| T8 | `sim/balance.ts`, `sim/*.spec.ts`, and tuning of the numbers in `content/era1.ts` |

`core/types.ts`, `core/view-types.ts`, `core/ports.ts` and
`types/index.d.ts` are shared contracts. A task that must change one keeps
the change small, updates the mirror in `types/index.d.ts`, and says so in
its report.

## Conventions

- **Immutability.** `step` and `apply` return new objects and never mutate their input. On a refusal or a no-op, they return the input object itself.
- **Signatures.** Every core function that needs content takes it as an argument: `step(state, content, dt)`, `apply(state, content, action)`, `check(state, content, action)`, `view(state, content)`. The core holds no module-level content.
- **Formulas.** Arithmetic lives in `core/economy.ts`, so a big-number type can replace plain doubles later.
- **Names.** Files are short lowercase words. Booleans start with `is`, `has` or `can`. Content ids are kebab-case.
- **Size.** Files stay under 400 lines where possible, 800 at most. Functions stay under 50 lines.
- **Comments.** Plain STE English: no em-dash, no semicolon in prose, no contraction, active voice.
- **No emojis** anywhere.
- **Tests.** Core, content, sim and script specs are `*.spec.ts` beside the code. `bun test` runs them. Hooks tests are `hooks/**/*.test.ts` or `*.test.tsx`. `claude plugin test .` runs them. `bunfig.toml` keeps `bun test` away from the hooks tests: newer Bun skips them through `pathIgnorePatterns`, and on Bun 1.3.10 a preload marks them as skipped.
- **Commands.** A hook registers a command by a literal name (`name: 'tokin'`). Then `claude plugin validate` reports the `command.run` hook as one that answers its own command, not as a gate.

## Tooling

| Command | What it does |
|:--|:--|
| `bun install` | installs `typescript` and `@types/bun` |
| `bun run types:sync` | copies the Claude Code API declarations into `.claude-plugin/types/` on a fresh clone. The engine writes the same file each time it loads the mod |
| `bun test` | runs the specs |
| `bun run typecheck` | `tsc -p .` for everything, then `tsc -p tsconfig.core.json` for the core alone with no host types |
| `bun run check:boundary` | runs the boundary check |
| `bun run test:plugin` | `claude plugin test .` |
| `bun run sim` | runs the balance bot |
| `bun run export:content` | writes the content pack as JSON |
| `claude plugin validate .` | checks the manifest, the contract and the hooks module |

## A standalone host

A future standalone build (web, desktop or terminal) reuses `core/` and
`content/` unchanged:

1. Implement `HostPorts`. Storage maps to `localStorage`, IndexedDB or a file. The clock maps to `Date.now` and `setInterval`. The notifier maps to the host's toast and log. `instanceId` names the window or process. `newSeed` uses the host's random source.
2. Load the content. A TypeScript host imports `content/era1.ts`. Another language loads `build/content/era1.json` from `bun run export:content`.
3. Start the runtime from `core/game.ts` with the ports and the content. It loads the save, runs catch-up, takes the ticker lock and ticks.
4. Draw the `ViewModel` with the host's own widgets. Map each control to its `ActionOption.action` and dispatch it.
5. A single-instance host still takes the lock. The lock costs nothing there, and it protects a save that two windows share.

Only `hooks/` knows about Claude Code. The mirror events (rate limit,
compaction) are host flavour in `hooks/`, and they never change the economy.
