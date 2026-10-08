# toKin

toKin is an incremental game about the first AI company. You found it in a
1950s garage. You work contracts by hand, buy machines, put agents on kin
models to earn, research and train, and then distill the company into Logits
to start again stronger.

Build 1 ships as a Claude Code mod that runs in a pane beside your work. The
game engine is plain TypeScript with no Claude Code dependency, so a
standalone build can reuse it later. See `docs/ARCHITECTURE.md`.

## Play it in Claude Code

Load the mod from this folder for one session:

```sh
claude --plugin-dir /home/kiriketsuki/dev/Personal/toKin
```

Then run `/tokin` to open the game pane.

## Develop

Bun runs the tests and the scripts.

```sh
bun install
bun run types:sync          # once on a fresh clone: Claude Code API types for tsc
bun test                    # core, content, sim and script specs
bun run test:plugin         # hooks tests, through claude plugin test
bun run typecheck           # tsc for the whole repo, then for the core alone
bun run check:boundary      # core and content stay free of Claude Code
claude plugin validate .    # manifest, state contract and hooks module
```

| Folder | Holds |
|:--|:--|
| `core/` | the pure game engine and its contracts |
| `content/` | the game tables as plain data |
| `hooks/` | the Claude Code host adapter and the pane |
| `sim/` | the headless balance bot |
| `scripts/` | the boundary check, the content export and the type sync |
| `types/` | the `$.state` contract of the mod |

## How to play

The pane has these sections, top to bottom.

| Section | What it does |
|:--|:--|
| Header | Cash, tokens per second, compute used, free and wasted, research points, Logits |
| Work | Press to do one contract by hand. It pays at once |
| Machines | Buy compute. A machine appears when you hold half its cost. Each row shows the time to afford it |
| Agents | Hire an agent on a kin model. Assign it to Earn, Research or Train. Remove it to free its compute |
| Contracts | Pick the contract that Earn agents work. An agent needs enough context for the contract |
| Research | Spend research points on upgrades. Locked items say what they need |
| Training | Train the next kin model. A run reserves your free compute until it finishes |
| Logit shop | Spend Logits on levels that survive a Distill |
| Distill | Reset the run and bank Logits. It needs Distillation and a payout of at least 1 |
| Log | The story, plus mirror lines from your Claude Code session |

On the first run the pane asks for a founder name. Type it and press Enter.

### Keys

Every control is a button in the pane. Click it, or move focus and press Enter.
There are no global hotkeys, because the pane shares the terminal with Claude Code.

| Control | Effect |
|:--|:--|
| Work | One hand-worked contract |
| Buy buttons | Buy one machine at the shown cost |
| Create and assign buttons | Hire an agent, change its job, or remove it |
| Distill, then Confirm Distill | Distill needs two presses, so a slip does not wipe a run |
| Cancel | Closes the Distill confirm step |

The game keeps running while the pane is closed. It saves every 30 seconds and
on session end. When you return after an absence, it catches up to a cap of
two hours. Only one Claude Code session advances a save at a time. A second
session shows a read-only copy and takes over when the first one ends.

### Mirror events

Two real events in your Claude Code session echo into the game log. They have
no effect on the economy, and each kind shows at most once per 10 minutes.

| Event | Log line |
|:--|:--|
| A rate limit or an overloaded error from the API | the punch-card supplier is out of stock. come back later. |
| A compaction of your conversation | the ledger was boiled down. the sums survived. the margin notes did not. |

## Architecture and porting

The game is a pure engine with thin hosts. Read `docs/ARCHITECTURE.md` for the
full contract. The summary follows.

- `core/` holds the engine. `step(state, content, dt)` and `apply(state, content, action)` return new objects and never mutate their input. The core reads no wall clock and draws no random number outside the seeded generator in the state.
- `content/` holds the Era 1 tables as plain data. `content/era1.json` is an export of the same tables.
- The core reaches the outside world only through `core/ports.ts`: storage, a clock, a notifier, an instance id and a seed source. Input arrives as an `Action` through `Game.dispatch`. Output is the view model from `buildView`.
- `hooks/` is the only code that imports `claude-code`. It builds the ports from the plugin store and clock, forwards presses as actions, and draws the view model. It also turns two Claude Code events into `Game.mirror(key)` calls.
- `sim/` is a second host. It plays Era 1 headless and checks the balance targets.
- `bun run check:boundary` fails when `core/` or `content/` imports a host API.

To ship a standalone game:

1. Write a host that implements `HostPorts` for your platform. `core/fakeports.ts` is a worked example.
2. Create `new Game(ports, ERA1)` and call `start()`.
3. Render `game.view()` on every `game.subscribe` callback.
4. Turn input into `Action` values and pass them to `game.dispatch`. Show the refusal text when `ok` is false.
5. Map your own platform events to `game.mirror('rateLimit' | 'compaction')`, or skip them.
6. Reuse the save format as is. The save is the `GameState` JSON, and `core/save.ts` migrates old versions.
