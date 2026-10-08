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
