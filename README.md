# toKin

toKin is an incremental game about the first AI company. You found it in a
1950s garage. You work contracts by hand, buy machines, put agents on kin
models to earn, research and train, and then distill the company into Logits
to start again stronger.

toKin runs in two places: as a Claude Code mod in a pane beside your work,
and as a page in a browser tab. Both run the same engine, the same content
and the same pane. See `docs/ARCHITECTURE.md`.

## Play it in Claude Code

Load the mod from this folder for one session:

```sh
claude --plugin-dir /home/kiriketsuki/dev/Personal/toKin
```

Then run `/tokin` to open the game pane.

## Play it in a browser

Once the Pages workflow has run on `main`, the game is at
<https://kiriketsuki.github.io/toKin/>. To play from a clone:

```sh
bun install
bun run web:dev             # Bun's dev server, at the URL it prints
```

The save lives in the browser's `localStorage`, apart from the mod's save.
Only one tab ticks the game. Another tab shows the game read-only and
takes over when the first one closes.

## Develop

Bun runs the tests and the scripts.

```sh
bun install
bun run types:sync          # once on a fresh clone: Claude Code API types for tsc
bun test                    # core, content, sim and script specs
bun run test:plugin         # hooks tests, through claude plugin test
bun run typecheck           # tsc for the whole repo, the core alone, and the browser host
bun run check:boundary      # core, content and ui stay free of Claude Code
claude plugin validate .    # manifest, state contract and hooks module
bun run web:build           # the browser build, into build/web
bun run test:web            # Playwright, against the browser build
```

CI (`.github/workflows/ci.yml`) runs the core and browser typechecks, the
boundary check, `bun test`, the balance bot and the Playwright tests. The
whole-repo typecheck and `claude plugin test` need Claude Code, so they stay
local. The Pages workflow publishes `build/web` on every push to `main`. It
needs one setting: under Pages in the repository settings, set the source to
GitHub Actions.

| Folder | Holds |
|:--|:--|
| `core/` | the pure game engine and its contracts |
| `content/` | the game tables as plain data |
| `ui/` | the shared pane, drawn with each host's element kit |
| `hooks/` | the Claude Code host adapter |
| `web/` | the browser host: Preact kit, browser ports, page and Playwright tests |
| `sim/` | the headless balance bot |
| `scripts/` | the boundary check, the content export, the type sync and the static server for the browser build |
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
The browser uses the same buttons: click, or Tab and Enter.

Raw key presses (Open Question 1): the plugin API delivers raw keys only to a
`Client` element through `onKey`. A `Client` needs a separate surface module, and the
vscode and mobile surfaces do not have it. So Build 1 uses Buttons with focus and
Enter on every surface, and single-key shortcuts such as `w` are not available.

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

## Playtest handoff (T10)

The automated checks cover the engine, the host wiring, and the balance. The
live playtest is still yours:

1. Start a session with `claude --plugin-dir /home/kiriketsuki/dev/Personal/toKin`.
2. Run `/tokin`, name the founder, and play from a fresh save to the first Distill.
3. Check the transcript for dim plugin lines that report a skipped hook or a refused render.
4. Restart the session, run `/tokin` again, and check that the save and the offline catch-up line appear.
5. Open a second session, run `/tokin` there, and check that it shows the read-only line.

## Architecture and porting

The game is a pure engine with thin hosts. Read `docs/ARCHITECTURE.md` for the
full contract. The summary follows.

- `core/` holds the engine. `step(state, content, dt)` and `apply(state, content, action)` return new objects and never mutate their input. The core reads no wall clock and draws no random number outside the seeded generator in the state.
- `content/` holds the Era 1 tables as plain data. `content/era1.json` is an export of the same tables.
- The core reaches the outside world only through `core/ports.ts`: storage, a clock, a notifier, an instance id and a seed source. Input arrives as an `Action` through `Game.dispatch`. Output is the view model from `buildView`.
- `ui/` holds the pane. `drawPane` draws the view model with a `Kit` of four elements (Box, Text, Button, Input) that each host supplies.
- `hooks/` is the only code that imports `claude-code`. It builds the ports from the plugin store and clock, forwards presses as actions, and draws the pane with the Claude Code elements. It also turns two Claude Code events into `Game.mirror(key)` calls.
- `web/` is the browser host. It builds the ports from `localStorage`, a worker timer and page toasts, and draws the pane with Preact.
- `sim/` is a second host. It plays Era 1 headless and checks the balance targets.
- `bun run check:boundary` fails when `core/` or `content/` imports a host API.

To ship another standalone game (`web/` is a worked example):

1. Write a host that implements `HostPorts` for your platform. `core/fakeports.ts` is a worked example.
2. Create `new Game(ports, ERA1)` and call `start()`.
3. Render `game.view()` on every `game.subscribe` callback, with `drawPane` and your own Kit or with your own widgets.
4. Turn input into `Action` values and pass them to `game.dispatch`. Show the refusal text when `ok` is false.
5. Map your own platform events to `game.mirror('rateLimit' | 'compaction')`, or skip them.
6. Reuse the save format as is. The save is the `GameState` JSON, and `core/save.ts` migrates old versions.
