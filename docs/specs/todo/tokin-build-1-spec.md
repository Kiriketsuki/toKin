# Feature: toKin Build 1 (Era 1 and Distill)

## Overview

**User Story**: As a player inside Claude Code, I want to grow a 1950s garage AI company from hand-worked contracts to a stable of trained kin models, and distill them to start again stronger, so that I get a satirical, earnest incremental game that runs next to my real work.

**Problem**: toKin has an approved design and research, but nothing playable. Build 1 proves the core loop (compute, agents, jobs, models) and the first prestige layer (Distill) are fun before later eras are built on them.

**Out of Scope**: Eras 2 and later, funding rounds and equity, government contracts, chip design, fabs, power caps, externality meters and greenwashing, the AGI ending, Simulate and Axioms, the real-usage token trickle, a GitHub remote and marketplace publishing, and big-number types beyond plain doubles.

---

## Success Condition

> This feature is complete when a player can open `/tokin` in Claude Code, go from hand-worked payroll to a trained kin-0.3 agent, research Distillation, distill for Logits, and reach the same point at least twice as fast on run 2, with the save surviving a restart and the balance bot meeting the pacing targets.

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | Does a pane receive raw key presses (`Client.onKey`) for shortcuts such as `w`, or are Buttons with focus and Enter the only input? T6 checks this against `claude-code.d.ts` and falls back to Buttons only | Claude | [ ] |
| 2 | Which GitHub account and repo name hosts toKin, once it is ready to share | User | [ ] |
| 3 | Subtitle choice (From Pawn to Gold, Scaling Laws, and so on). Not needed for Build 1 | User | [ ] |

---

## Scope

### Must-Have
- **Hand work**: pressing the Work control adds 5 tokens of work to the payroll contract and pays at the payroll rate. Works with zero machines.
- **Machines**: four machines (Relay Rack, Thermionic Tensor Valve bank, Drum Memory Cabinet, Core Lattice). Each costs `base × r^owned`. Research unlocks the last three.
- **Compute and waste**: total compute is the sum of machine FLOP/s. Compute that no agent or training run uses shows as wasted each tick.
- **Agents**: the player creates an agent when free compute covers a model footprint. Each agent has a generated name, one model, and one job (Earn, Research, Train). Reassigning is free.
- **Earn**: an Earn agent pays `tok/s × contract rate × quality` on the best contract its context allows (after Contract Broker), or on the contract the player picks (before it).
- **Research**: a Research agent makes `tok/s × quality² × 0.01` RP/s. Twelve research items, each with a cost, an effect, and an unlock condition.
- **Training**: a training run reserves a chosen amount of compute until it delivers the model's training cost in kFLOP·s. When it ends, the next kin model unlocks.
- **Models**: kin-0.1 to kin-0.4 with footprint, tok/s, quality, and context per the content tables.
- **Distill**: after the Distillation research, the player can distill. The payout is `floor(k × sqrt(lifetime_tokens / T0))` Logits. The reset follows the reset rules. A confirmation step in the pane shows the payout before the reset.
- **Logits shop**: six items (Warm Start, Soft Targets, Long Memory, Curriculum, Hand-me-down, Old Notes). Each unspent Logit gives +2% tok/s.
- **Story**: 15 to 25 terse, lowercase, second-person beats. Each fires once on an economy threshold. Each shows in the pane log and as a toast.
- **Save and offline**: a versioned save in `$.store`, autosaved every 30 s and on session end. Offline catch-up on load, capped at 2 h (8 h after Night Shift), followed by a summary line.
- **Opt-in per session**: the game stays dormant in a session (no clock, no lock, no store writes) until the player runs `/tokin` there. Closing the pane hides the game but keeps it running. `/tokin stop` or session end stops it and releases the lock.
- **Single ticker**: only one Claude Code session ticks the game. The first session to run `/tokin` holds the lock. Other sessions that run `/tokin` show the state read-only.
- **Pane**: `/tokin` opens a dedicated pane with header (cash, compute used and wasted, tok/s, RP, Logits, year), agents table, contracts, machines, research, training, and log.

### Should-Have
- **Mirror events**: a real rate limit shows "the punch-card supplier is out of stock. come back later." A real compaction shows a small distillation joke. Neither changes the economy.
- **Hidden-until-near reveal**: a machine or research item appears when the player holds half its cost, as in A Dark Room.
- **Time to afford**: each locked purchase shows the seconds until the player can afford it.

### Nice-to-Have
- A settings row: number notation (short or scientific), toasts on or off.
- Save export and import as a text string.

---

## Technical Plan

**Affected Components** (new repo `~/dev/Personal/toKin`, a Claude Code plugin):
- `.claude-plugin/plugin.json`, `hooks/hooks.json`, `types/index.d.ts`
- `hooks/register.tsx`: wiring only
- `hooks/ui/*.tsx`: pane views
- `engine/`: `state.ts`, `rng.ts`, `economy.ts`, `step.ts`, `actions.ts`, `distill.ts`, `story.ts`, `save.ts`, `format.ts`
- `content/era1.ts`: all tables as data
- `sim/balance.ts`: headless greedy bot
- `tests/*.test.ts`

**Data Model** (`GameState`, versioned, plain JSON):
- `version`, `seed`, `rngState`, `year`, `cash`, `rp`, `lifetimeTokens`, `runTokens`
- `machines: Record<MachineId, number>`
- `models: ModelId[]` (unlocked)
- `agents: { id, name, model, job, lifetimeTokens }[]`
- `training: { model, reservedFlops, progress } | null`
- `research: ResearchId[]`
- `contractPick: ContractId`
- `logits`, `shop: Record<ShopId, number>`
- `story: StoryId[]` (fired), `log: { t, text }[]` (last 100)
- `lastSavedAt`, `stats: { distills, bestRunSeconds }`

**Engine contract**: `step(state, dtSeconds) -> state` and `apply(state, action) -> state` are pure and immutable. Live ticks and offline catch-up both call `step`. All formulas live in `economy.ts`.

**Plugin contract**:
- `session.start`: registers `/tokin` only. No clock, no lock, no store reads or writes.
- `command.run` `tokin`: on first use in the session, loads the save, runs catch-up, takes the ticker lock if free, and starts `$.clock.every(1000)` when it holds the lock. Then opens the pane: `$.ui.open({ id: 'tokin', title: 'toKin', focus: true })`. `/tokin stop` saves, stops the clock, and releases the lock.
- `ui.render` `{ component: 'Pane', requestId: 'tokin' }`: draws the views from the state atom.
- `ui.press`: dispatches actions to `apply`.
- `turn.step`: detects mirror events only.
- `session.end`: saves and releases the lock.
- Store keys: `tokin.save`, `tokin.lock` (`{ sessionId, heartbeat }`; fresh means under 5 s old).

**Content tables** (agreed in the interview; numbers are starting points that the balance bot tunes):

| Machine | Base cost | r | Gives | Unlock |
|:--|:--|:--|:--|:--|
| Relay Rack | $25 | 1.13 | +1 kFLOP/s | Start |
| Thermionic Tensor Valve bank | $400 | 1.14 | +12 kFLOP/s | Valve Logic |
| Drum Memory Cabinet | $6,000 | 1.15 | +100 kFLOP/s, +10% context for all models (max 5) | Rotating Storage |
| Core Lattice | $90,000 | 1.15 | +1,500 kFLOP/s | Magnetic Cores |

| Model | Footprint (kFLOP/s) | tok/s | Quality | Context | Training cost (kFLOP·s) |
|:--|:--|:--|:--|:--|:--|
| kin-0.1 | 1 | 2 | 1.0 | 64 | Free with the first Relay Rack |
| kin-0.2 | 4 | 6 | 1.6 | 256 | 2,000 |
| kin-0.3 | 20 | 20 | 2.8 | 1,024 | 60,000 |
| kin-0.4 | 120 | 72 | 5.0 | 4,096 | 2,400,000 |

| Contract | Min context | Pay per token |
|:--|:--|:--|
| Payroll tabulation (hand work: 5 tokens per press) | 32 | $0.10 |
| Ballistics tables | 128 | $0.15 |
| Census punching | 512 | $0.22 |
| Actuarial tables | 2,048 | $0.35 |

| Research | Cost (RP) | Effect |
|:--|:--|:--|
| Valve Logic | 10 | Unlocks the Tensor Valve bank |
| Batching | 25 | +25% tok/s for all models |
| Training Harness | 30 | Unlocks the Train job |
| Punch-card Context | 40 | +50% context for all models |
| Contract Broker | 60 | Earn agents pick the best contract they qualify for |
| Rotating Storage | 120 | Unlocks the Drum Memory Cabinet |
| Vacuum Tube Binning | 200 | Machines cost 15% less |
| Night Shift | 300 | Offline cap from 2 h to 8 h |
| Attention Prototype | 800 | x1.5 quality for kin-0.3 and above |
| Magnetic Cores | 1,500 | Unlocks the Core Lattice |
| Gradient Checkpointing | 2,500 | Training needs 30% less compute time |
| Distillation | 5,000, needs kin-0.3 | Unlocks Distill |

| Shop item | Effect | Cost (Logits) |
|:--|:--|:--|
| Warm Start | Start with 1 / 2 / 3 Relay Racks | 1 / 3 / 9 |
| Soft Targets | +10% tok per kFLOP per level, no limit | 2 x 1.6^level |
| Long Memory | +25% context per level, max 4 | 3 x 2^level |
| Curriculum | Training 20% faster per level, max 5 | 4 x 2^level |
| Hand-me-down | Keep kin-0.2, then kin-0.3, after Distill | 5 / 20 |
| Old Notes | Keep Training Harness and Contract Broker | 3 |
| (passive) | Each unspent Logit gives +2% tok/s | - |

**Voice**: the player names the founder at the start. Log lines are terse, lowercase, second person, satire with an earnest core. Agents get generated mid-century names from a seeded pool. Shogi promotion (と金) is flavour only.

**Dependencies**: Claude Code with plugin hooks (build 2.1.294 types). Development loads the repo with `CLAUDE_CODE_PLUGIN_DIRS` or `claude --plugin-dir`. Node or Bun runs `sim/balance.ts`. No runtime packages.

**Risks**:
| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| A pane gets no raw keys, so the shortcut `w` fails | Medium | Use Buttons with focus and Enter. Check `Client.onKey` in T6 |
| Two sessions tick one save and double progress | Medium | Heartbeat lock in `$.store`, plus a test with two simulated sessions |
| Exponential tuning misses the pacing targets | High | Balance bot in T8 runs before content is final, with seeded and repeatable runs |
| The pane redraws every second and flickers or costs CPU | Low | Redraw only on state change, and throttle log updates |
| The save grows past the 4 MiB store limit | Low | Cap the log at 100 lines. Keep the state flat |
| A save schema change breaks old saves | Medium | Versioned save with a migration chain and a test per version |

---

## Acceptance Scenarios

```gherkin
Feature: toKin Build 1
  As a player inside Claude Code
  I want to grow a garage AI company and distill it
  So that I get a playable incremental with one prestige layer

  Background:
    Given the toKin plugin is loaded
    And the player has run /tokin and named the founder

  Rule: Hand work and machines start the economy

    Scenario: Working a contract by hand
      Given the player owns no machines
      When the player presses Work 10 times
      Then the player holds $5.00
      And the log shows "the numbers add up. they always do, eventually."

    Scenario: Buying a machine raises the next price
      Given the player holds $60 and owns no Relay Rack
      When the player buys a Relay Rack
      Then total compute is 1 kFLOP/s
      And the next Relay Rack costs $28.25

    Scenario: Buying without enough cash
      Given the player holds $10
      When the player tries to buy a Relay Rack
      Then nothing changes
      And the button shows the time to afford it

  Rule: Agents turn compute into work, and unused compute is wasted

    Scenario: Creating an agent
      Given the player owns 1 Relay Rack and has kin-0.1
      When the player creates an agent on Earn
      Then an agent with a generated name runs kin-0.1
      And wasted compute is 0 kFLOP/s

    Scenario: Not enough free compute
      Given all compute is in use
      When the player tries to create a kin-0.2 agent
      Then the action fails with "not enough free compute: needs 4 kFLOP/s"

    Scenario: Context gates contracts
      Given Contract Broker is researched
      And an Earn agent runs kin-0.1 with context 64
      Then the agent works Payroll tabulation, not Ballistics tables

  Rule: Training reserves compute until the model arrives

    Scenario: Training kin-0.2
      Given Training Harness is researched and 10 kFLOP/s is free
      When the player starts training kin-0.2 with 10 kFLOP/s
      Then free compute drops by 10 kFLOP/s
      And after 200 seconds kin-0.2 is unlocked and the compute is free again

  Rule: Distill resets the run and pays Logits

    Scenario: Distilling
      Given Distillation is researched and lifetime tokens are high enough for 4 Logits
      When the player confirms Distill
      Then the player holds 4 Logits
      And cash, machines, agents, research, and models above kin-0.1 reset
      And fired story beats and stats remain

    Scenario: Distill before it is unlocked
      Given Distillation is not researched
      Then the Distill control does not show

    Scenario: Unspent Logits boost production
      Given the player holds 5 unspent Logits
      Then all tok/s values are 10% higher than with 0 Logits

  Rule: Progress survives time away

    Scenario Outline: Offline catch-up
      Given the player saved and closed Claude Code
      When the player reopens /tokin after <away>
      Then the game simulates <simulated> of progress
      And the log shows "you slept. it did not."

      Examples:
        | away | simulated | note                  |
        | 30m  | 30m       | under the cap         |
        | 5h   | 2h        | base cap              |
        | 5h   | 5h        | Night Shift researched |

  Rule: Only sessions that opt in run the game, and only one ticks

    Scenario: A session that never runs /tokin stays dormant
      Given a new Claude Code session with the plugin loaded
      When the player works without running /tokin
      Then the plugin starts no clock, takes no lock, and writes nothing to the store

    Scenario: Stopping the game in a session
      Given session A runs the game and holds the ticker lock
      When the player runs /tokin stop in session A
      Then session A saves, stops its clock, and releases the lock

    Scenario: A second session opens toKin
      Given session A holds the ticker lock
      When session B runs /tokin
      Then session B shows the state read-only with "running in another session"
      And only session A advances the game
```

---

## Task Breakdown

| ID   | Task | Priority | Dependencies | Status  |
|:-----|:-----|:---------|:-------------|:--------|
| T1   | Scaffold the plugin repo: manifest, hooks.json, types contract, tsconfig, README, .gitignore | High | None | done |
| T2   | Engine core: state, seeded RNG, economy formulas, `step`, `apply` for work, buy, agents, jobs, contracts | High | T1 | done |
| T2.1 | Engine unit tests: costs, production, waste, context gating, determinism | High | T2 | done |
| T3   | Content: `content/era1.ts` with machines, models, contracts, research, shop, story beats, agent name pool | High | T2 | done |
| T4   | Training and research systems in the engine, with tests | High | T2, T3 | done |
| VM   | View model: `buildView` in core with rows, affordability and action refusal reasons | High | T4 | done |
| T5   | Distill, Logits shop, unspent bonus, reset rules, with tests | High | T4 | done |
| T6   | Pane UI: header, agents, contracts, machines, research, training, log, Distill confirm. Check pane key input (Open Question 1) | High | T2 | done |
| T7   | Plugin wiring: `/tokin`, clock tick, autosave, save versioning, offline catch-up, ticker lock, session end | High | T5, T6 | done |
| T7.1 | Wiring tests with `claude plugin test`: save round-trip, catch-up equals live ticks, lock | High | T7 | done |
| T8   | Balance bot `sim/balance.ts` and tuning of the content numbers to the targets | High | T5 | done |
| T9   | Should-haves: mirror events, half-cost reveal, time to afford | Med | T7 | done |
| T10  | Manual playtest in a live session, fixes, README play instructions | Med | T8, T9 | pending |

---

## Exit Criteria

- [ ] All Must-Have scenarios pass under `claude plugin test`
- [ ] `claude plugin validate` reports no errors, and `tsc -p` passes
- [ ] The balance bot meets the targets on 10 seeds: first agent before minute 3, kin-0.2 before minute 10, Distill unlocked at 30 to 45 min, run 2 at least 2x faster
- [ ] Offline catch-up equals the same time of live ticks within 1%
- [ ] A save from each schema version loads after migration
- [ ] A manual playtest from a fresh save to the first Distill completes with no errors in the transcript's plugin lines

---

## References

- Design: `~/dev/obKidian/100-Projects/110-Active/119-Personal/toKin - Design.md`
- Project note: `~/dev/obKidian/100-Projects/110-Active/119-Personal/toKin - Project.md`
- Research: `~/dev/obKidian/400-Resources-Digital-Garden/410-Technology/Game-Design/Incremental Game Mechanics.md`
- Research: `~/dev/obKidian/400-Resources-Digital-Garden/410-Technology/Game-Design/Roguelike Mechanics.md`
- Mod structure reference: `~/dev/obKidian/000-System/Agents/Claude/dev-mods/7cd26bbc-3d67-4f42-a3cd-95680f2cbcba/chrysaki-statusline/`
- Plugin API: the plugin-authoring skill's `types/claude-code.d.ts` and `examples/pane.tsx`

---

*Authored by: Clault KiperO 5.5*
