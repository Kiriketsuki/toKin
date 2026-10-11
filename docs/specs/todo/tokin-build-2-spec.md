# Feature: toKin Build 2 (Token Economy and Browser Host)

> **Economy superseded (2026-10-11).** The economy in this spec (the token split, the compute split, buyers and the Era 1 tables) is being redesigned step by step. `tokin-economy-decisions.md` is the current record. The browser host and the shared pane are unchanged.

## Overview

**User Story**: As a player, I want to found an AI lab by hand-coding tokens, build a Perceptron, and grow it through the perceptron era, in Claude Code or in a browser tab, so that I get the same token-first incremental in both places.

**Problem**: In the Build 1 playtest, cash took the headline instead of tokens, the opening dragged, and the pane was crowded. The game also ran only inside Claude Code, so nobody without it could play.

**Out of Scope**: Era 2 and later (the roadmap goes in the vault design note only), the art pass (Build 1 vault tasks T11 to T14), save sync between the two hosts, a repo split, a GitHub org, a plugin marketplace listing, and big-number types beyond plain doubles.

GitHub: <https://github.com/Kiriketsuki/toKin> (public). Issue: #1. Branch: `feature/1-build-2-token-economy`.

---

## Success Condition

> This feature is complete when a player can play toKin in Claude Code (`/tokin`) or in a browser at the GitHub Pages URL and finish the same run in both: hand-code tokens to a first Perceptron in under 90 seconds, train up to MADALINE, research Distillation, and distill for Logits, with one ViewModel drawing both hosts and the balance bot meeting its pacing targets, the anti-grind target included.

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | Does `prompt.submit` tell typed prompts apart from slash commands and SDK prompts through `origin.kind`? Check it in T8 | Claude | [ ] |
| 2 | What hourly cap on prompt tokens keeps them a trickle? The balance bot sets it in T10 | Claude | [ ] |
| 3 | Does a browser save in `localStorage` survive a Pages redeploy at the same origin? Check it in T9 | Claude | [ ] |
| 4 | Which era names and dates go in the vault roadmap (A to S to UGI)? Claude drafts them in T12, the user reviews | User | [ ] |

Build 1 Open Question 2 (GitHub host) is resolved: `Kiriketsuki/toKin`, public.

---

## Design

The design came from a brainstorm on 2026-10-09. It supersedes the Build 1 economy.

### Currencies: one token pool

```
Write by hand ──┐
prompt tokens ──┼──> TOKEN POOL ──split──> Keep  (stays in the pool)
agents (tok/s) ─┘                  ├────> Sell  -> cash -> hardware
                                   └────> Study -> RP   -> research
pool ──lump spend──> Train <model> (data) + reserved compute time
lifetime tokens ──> Distill payout (Logits)
```

| Currency | Made by | Spent on |
|:--|:--|:--|
| Tokens (headline) | Write by hand, prompt tokens (mod only), agents | Training (a lump data cost). The split shares feed Sell and Study |
| Cash | Sell share x best buyer rate x quality | Hardware |
| RP | Study share x quality² x research rate | Research |
| Compute (FLOP/s) | Hardware | Agent footprints and training runs. Nobody spends it. Unused compute shows as wasted |
| Logits | Distill | The Logits shop. Each unspent Logit adds to tok/s |

Per second, with inflow `I` from all sources and a split where `keep + sell + study = 1`:

```
pool  += keep  * I                      (minus lump training costs)
cash  += sell  * I * bestBuyerRate * Q
RP    += study * I * Q^2 * researchRate
Q      = tok/s-weighted mean quality of the inflow
```

- The split applies to every source, hand presses and prompts included.
- A press or a prompt routes its tokens through the split at once, at quality 1.
- Agent tokens carry the quality of their model.
- The split starts at Keep 100%. Sell and Study unlock when the first Perceptron is trained.
- Contracts become a ladder of buyers. Each model unlocks one buyer. Sell always pays the best unlocked rate. The player picks no contract.
- Context is gone: no `minContext`, no context stat, no `contextPerUnit` perk, no Long Memory.

### Opening and anti-grind

- A run starts with 0 tokens, $0, and 1 Relay Rack. The rack's compute shows as wasted.
- Goal 1 is the Perceptron: a lump of hand-written tokens plus a short training run on the rack.
- With Write by hand alone (the browser case), the Perceptron arrives in under 90 s.
- The anti-grind point comes soon after the first agent runs. From then on, one press of Write by hand is worth less than 1 s of passive inflow. T10 fixes the exact point in `docs/balance.md`.
- Prompt tokens in the mod shorten the opening but never decide it.

### Era 1 content

| Model | Year | Buyer it unlocks |
|:--|:--|:--|
| Perceptron | 1958 | Navy letter reading |
| Pandemonium | 1959 | Post Office addresses |
| ADALINE | 1960 | Bank cheques |
| MADALINE | 1962 | Telephone echo cancelling |

- Each model has a footprint, tok/s, quality and a token training cost. Each is trained in order.
- Machines keep the four Build 1 machines: Relay Rack, Thermionic Tensor Valve bank, Drum Memory Cabinet, Core Lattice. The Drum Memory Cabinet loses its context perk.
- Research keeps about 12 items. Punch-card Context, Contract Broker and Training Harness go. New items:
  - a Scheduler, which deploys the best model onto free compute without a press
  - the Delta Rule, a quality boost
- Distillation still unlocks Distill, gated on ADALINE (tier 3).
- The shop drops Long Memory and adds a token item, such as a token stock at the start of each run. Hand-me-down keeps models by the new ids. T3 writes the final research and shop lists.

### Story

- **Alternate history.** The player's founder runs the lab that builds the Perceptron, Pandemonium, ADALINE and MADALINE.
- The models and the shape of the events are real. No real person appears in the log.
- **Arc of Era 1 (about 1957 to 1969):**
  1. The lab opens.
  2. A Navy letter arrives.
  3. A newspaper hypes a machine that will "walk, talk and be conscious".
  4. The demons of Pandemonium shout their features.
  5. ADALINE arrives, then MADALINE works the phone lines.
  6. A rival lab publishes a critique.
  7. The winter comes.
- **The winter frames Distill.** The late beats build toward the critique and the cold. Distill reads as surviving the winter: keep what matters, start over stronger. The winter adds no mechanic. Distill stays the player's choice.
- The voice stays terse, lowercase and second person: satire with an earnest core. Beats fire on economy thresholds, never on timers. About 20 beats.

### Distill

- The payout formula is unchanged: `max(0, floor(distillK * sqrt(lifetimeTokens / distillT0)) - logitsEarned)`.
- **Resets:** the pool, cash, RP, run tokens, run seconds, machines, agents, training, research, the models above Perceptron, and `revealed`.
- **Keeps:** Logits (plus the payout), shop levels, the split setting, fired story beats, stats, lifetime tokens, the founder, the year, the clock, the RNG state, the agent id counter and the log.
- The shop then applies its keep effects (Warm Start, Old Notes, Hand-me-down) as in Build 1.

### Pane and tabs

- **Fixed header:** tokens in the pool with inflow per second, compute used of total, and the year. Cash, RP and Logits join the header once each unlocks.
- **Tabs:** Lab, Hardware, Models, Research, Distill, Log.
  - **Lab** holds Write by hand, the pipeline visualizer and the split controls.
  - **Models** holds Train and Deploy.
  - Each tab stays hidden until it unlocks. A fresh game shows Lab and Log only.
  - A tab shows a dot when it holds something new: the first time an item becomes affordable, or an unread log line. The dot clears when the player opens the tab.
- **Pipeline visualizer:** sources, then the pool, then Keep, Sell and Study, with live rates. The core builds it as data in the ViewModel. Each host draws it.
- **Input:** Buttons with Tab and Enter in the mod. The browser adds mouse clicks on the same Buttons.

### Hosts

- One core and one content pack serve two hosts. `core/` and `content/` stay identical across hosts. This is a hard rule.
- The pane code moves from `hooks/ui/` to a host-free `ui/` folder with its own `Kit` type.
  - The mod passes Claude Code elements as its Kit.
  - The browser passes a Preact Kit: Box as a flex `div`, Text as a `span`, Button and Input.
- `web/` may replace a `ui/` section with a richer browser widget later. Such a widget draws only from the ViewModel and dispatches only Actions.
- The layout stays flat: `web/` sits beside `hooks/`. A repo split comes later.

---

## Scope

### Must-Have
- **Token pool and split**: Keep, Sell and Study shares move in 10% steps and apply to all inflow. Done when cash/s and RP/s match the formulas for any split.
- **Write by hand**: each press adds 5 tokens through the split, with no machine needed. Done when 10 presses at Keep 100% add 50 tokens to the pool.
- **Prompt tokens (mod)**: each typed prompt adds `floor(chars / 4)` tokens while `/tokin` runs in that session, under an hourly cap on the game clock. Nothing accrues offline. Done when a 400-character prompt adds 100 tokens, and a prompt over the cap adds 0.
- **Training as a lump spend**: training costs pool tokens plus reserved compute until the work completes. Done when a hand-only bot trains the Perceptron in under 90 s.
- **Deploy and undeploy**: an agent occupies its model's footprint and has no job. Done when deploy is refused without enough free compute.
- **Buyer ladder**: Sell pays the best unlocked buyer rate. Done when training ADALINE moves Sell to the bank cheque rate.
- **Era 1 content**: four models, four buyers, four machines, about 12 research items including Scheduler and Delta Rule, and the new shop list. No context field anywhere. Done when the content spec and `export:content` pass.
- **Story and Distill**: about 20 alternate-history beats, with the winter framing Distill. Distill follows the reset rules above. Done when the Distill scenarios pass.
- **Tabbed mod pane**: the fixed header and the six tabs, with reveal and badges. Done when the pane tests pass under `claude plugin test`.
- **Pipeline visualizer**: built in the core as ViewModel data and drawn in Lab by both hosts. Done when both hosts show the same rates for one state.
- **Browser host in `web/`**: `HostPorts` over `localStorage`, timers and toasts. The same ViewModel and tabs, offline catch-up, and a lock so only one tab ticks. Done when a Playwright test plays to the first Perceptron.
- **Pages deploy**: an Actions workflow publishes the browser build on every push to `main`. Done when the game loads at `https://kiriketsuki.github.io/toKin/`.
- **Save**: `STATE_VERSION` 2. A Build 1 save goes to an archive key, and a fresh run starts that keeps the founder name and logs a line about the old ledger. Done when the save tests pass.
- **Balance bot**: new targets for the hand-only Perceptron, the anti-grind point, the first Distill, and run 2. Done when `bun run sim` passes on 10 seeds.

### Should-Have
- CI on pull requests: `bun test`, both typechecks, the boundary check and `bun run sim`.
- The A to S to UGI era roadmap in the vault design note: perceptron, symbolic and expert systems, backprop MLP, CNN, RNN and LSTM, transformer, LLM, agents, AGI, ASI, UGI.
- Carried over from Build 1: mirror events in the mod, the half-cost reveal, and time to afford.

### Nice-to-Have
- Save export and import as a text string in both hosts. This gives a manual way to move a save between the mod and the browser.
- A number-notation setting (short or scientific).

---

## Technical Plan

**Affected Components**:
- `core/types.ts`, `core/view-types.ts`: the pool, the split, buyers, agents without jobs, the prompt-cap ledger, tab views with badges, `PipelineView`. Context fields go. `STATE_VERSION` 2.
- `core/economy.ts`: pool inflow, the split, Q, the best buyer rate, the training token cost.
- `core/actions.ts`, `core/agents.ts`, `core/training.ts`, `core/research.ts`, `core/distill.ts`, `core/shop.ts`: the new action set.
- `core/ports.ts`: an optional `prompts` port, `PORTS_VERSION` 2, and an archive key in `STORAGE_KEYS`.
- `core/save.ts`: archives a version 1 save and starts fresh, keeping the founder.
- `core/view.ts`, `core/view-rows.ts`: tabs, reveal, badges, the pipeline, the new rows.
- `content/era1.ts`, `content/era1-research.ts`, `content/era1-story.ts`, `content/era1-names.ts`, `content/era1.json`: a full rewrite.
- `ui/` (moved from `hooks/ui/`): the `Kit` type, the tabbed layout, Lab with the pipeline, and the other tab bodies.
- `hooks/register.tsx`, `hooks/adapter.ts`, `hooks/controller.ts`: Claude Code elements as the Kit, a `prompt.submit` hook that dispatches `ingestPrompt`, and the save path.
- `types/index.d.ts`, `hooks/contract-check.ts`: the `TokinGame` mirror of `GameState` v2.
- `web/`: `index.html`, `main.tsx`, `kit.tsx` (Preact Kit), `ports.ts` (browser ports and tab lock), `style.css`, and a `bun build` script.
- `sim/balance.ts`, `sim/bot.ts`, `sim/runner.ts`: the bot rewrite and the new targets.
- `scripts/check-boundary.ts`: `ui/` and `web/` must not import `claude-code`. The `core/` and `content/` rules stay.
- `.github/workflows/ci.yml`, `.github/workflows/pages.yml`.
- `docs/ARCHITECTURE.md`, `docs/balance.md`, `README.md`.

**Data Model Changes** (`GameState` v2):
- Add `tokens` (the pool) and `split: { keep, sell, study }` in tenths.
- Add `promptLedger: { windowStart, used }` for the hourly cap.
- Add `seenTabs` for the badges, holding what each tab last showed as new.
- `agents` become `{ id, name, model, lifetimeTokens }`: the job goes.
- `models` now uses the ids `perceptron`, `pandemonium`, `adaline`, `madaline`.
- `contractPick` goes.
- `cash`, `rp`, `machines`, `training`, `research`, `logits`, `shop`, `story`, `log`, `stats`, `lifetimeTokens` and `runTokens` stay.
- Content: `ModelDef` loses `context` and gains a token training cost. `ContractDef` becomes `BuyerDef { id, name, payPerToken, unlockedBy: ModelId }`. `MachineDef` perks lose `contextPerUnit`.

**API Contracts** (the `Action` union and ports):
- `write`, which replaces `work`.
- `ingestPrompt { chars }`, which is new. The core turns `chars` into tokens and enforces the cap.
- `setSplit { keep, sell, study }`, which replaces `pickContract`.
- `train { model }`, which replaces `startTraining` and spends the token cost.
- `deploy { model }`, which replaces `createAgent`.
- `undeploy { agent }`, which replaces `removeAgent`.
- `assignAgent` goes.
- `nameFounder`, `buyMachine`, `research`, `distill` and `buyShop` keep their shapes.
- `ActionOption.id` keys: `write`, `split:<share>:<up|down>`, `buy:<machine>`, `train:<model>`, `deploy:<model>`, `undeploy:<agent>`, `research:<item>`, `distill`, `shop:<item>`, `tab:<tab>`.
- `HostPorts.prompts?`: optional. The mod sets it. The browser and the sim leave it unset.

**Dependencies**: `preact` 10 (only `web/` imports it), `@playwright/test` (dev), GitHub Actions and Pages on the public repo. Claude Code plugin hooks, as in Build 1.

**Risks**:
| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| Claude Code element props (`bold`, `color`, `flexDirection`) differ from the DOM | Medium | The `Kit` type names only the props the pane uses. The Preact Kit maps each one. A test draws the pane with both Kits |
| Two browser tabs tick one save | Medium | Reuse the core heartbeat lock over `localStorage`. A Playwright test with two pages |
| `prompt.submit` counts slash commands or SDK prompts | Medium | Filter on `origin.kind` (Open Question 1). A test for each origin |
| The rewrite breaks many Build 1 specs at once | High | Change the contracts first (T1), then the core module by module, so each step keeps the tests green |
| Retuning misses the 90 s opening or the anti-grind target | High | The balance bot runs before the content numbers are final, with a hand-only mode for the opening |
| The Pages workflow fails on the first push | Low | The repo is public, so Actions minutes are free. Add a manual dispatch trigger for retries |

---

## Acceptance Scenarios

Numbers marked (content) come from the tuned pack. A test reads them from `content/era1.ts`. All other numbers follow from the rules.

```gherkin
Feature: toKin Build 2
  As a player in Claude Code or a browser
  I want to hand-code tokens into an AI lab and grow it through the perceptron era
  So that I get the same token-first incremental in both places

  Background:
    Given toKin is running in either host
    And the player has named the founder

  Rule: Tokens enter one pool and the split routes them

    Scenario: Writing by hand
      Given the split is Keep 100%
      When the player presses Write by hand 10 times
      Then the pool holds 50 tokens
      And lifetime tokens are 50

    Scenario: The split converts inflow
      Given inflow is 10 tok/s at quality 1.0 and the best buyer pays $0.10 per token
      And the split is Keep 50%, Sell 50%, Study 0%
      When 10 seconds pass
      Then the pool gains 50 tokens and cash rises by $5.00

    Scenario: The split before the first Perceptron
      Given no Perceptron is trained
      When the player tries to raise Sell
      Then nothing changes
      And the refusal says the split is locked

  Rule: Real prompts add a capped trickle in the mod

    Scenario: A typed prompt adds tokens
      Given /tokin runs in this session and the split is Keep 100%
      When the player submits a 400-character prompt
      Then the pool gains 100 tokens

    Scenario: The hourly cap
      Given the prompt tokens this hour have reached the cap
      When the player submits another prompt
      Then no tokens enter

    Scenario: Prompts outside an opted-in session
      Given /tokin has not run in this session
      When the player submits a prompt
      Then the game state does not change

  Rule: Training spends tokens and borrows compute

    Scenario: The first Perceptron by hand alone
      Given a fresh run with 1 Relay Rack
      When the balance bot plays with Write by hand only
      Then the Perceptron is trained before 90 seconds

    Scenario: Training without enough tokens
      Given the pool holds less than the Perceptron token cost (content)
      When the player tries to train the Perceptron
      Then nothing changes
      And the refusal names the token cost

  Rule: Agents occupy compute and feed the pool

    Scenario: Deploying an agent
      Given the Perceptron is trained and free compute covers its footprint (content)
      When the player deploys a Perceptron
      Then an agent with a generated name runs it
      And inflow rises by the Perceptron tok/s (content)

    Scenario: Not enough free compute
      Given all compute is in use
      When the player tries to deploy a Perceptron
      Then the refusal is "not enough free compute: needs {footprint} kFLOP/s"

    Scenario: Clicking stops paying
      Given the balance bot has passed the anti-grind point (content)
      Then one press of Write by hand adds less than 1 second of passive inflow

  Rule: Sell pays the best buyer

    Scenario: A new model unlocks a better buyer
      Given Sell pays the Navy letter rate
      When ADALINE is trained
      Then Sell pays the bank cheque rate

  Rule: Distill survives the winter

    Scenario: Distilling
      Given Distillation is researched and the payout is 4 Logits
      When the player confirms Distill
      Then the player holds 4 Logits
      And the pool, cash, RP, machines, agents, research, and models above Perceptron reset
      And the split, story beats, stats, and lifetime tokens remain

    Scenario: Distill before it is unlocked
      Given Distillation is not researched
      Then the Distill tab does not show

  Rule: Tabs reveal as the game grows

    Scenario: A fresh game shows only Lab
      Given a fresh run
      Then only the Lab and Log tabs show

    Scenario: A badge marks something new
      Given the Hardware tab is unlocked and the player is on Lab
      When a machine becomes affordable for the first time
      Then the Hardware tab shows a dot until the player opens it

  Rule: Both hosts draw the same game

    Scenario: The same state, the same view
      Given one saved state
      When the mod and the browser each build the view
      Then both views are equal
      And both hosts show the same pipeline rates

    Scenario: A second browser tab
      Given tab A ticks the game
      When the player opens toKin in tab B
      Then tab B is read-only with "running in another tab"

  Rule: Old saves start fresh

    Scenario: Loading a Build 1 save
      Given the store holds a version 1 save with founder "Ada"
      When the game loads
      Then the version 1 save is archived under its own key
      And a new run starts with founder "Ada"
      And the log notes the old ledger
```

The Build 1 scenarios for offline catch-up, the dormant session, `/tokin stop` and the second session carry over unchanged to the mod. The browser runs offline catch-up through the same core path.

### Changes to Build 1 scenarios

| Build 1 scenario | Build 2 change |
|:--|:--|
| Working a contract by hand | Replaced by Writing by hand. Presses make tokens, not cash |
| Buying a machine raises the next price | Kept. The player now starts with 1 Relay Rack |
| Creating an agent | Replaced by Deploying an agent. No job |
| Not enough free compute | Kept, with Perceptron in place of kin-0.2 |
| Context gates contracts | Removed. Context is gone |
| Training kin-0.2 | Replaced by the training scenarios. Training also spends tokens |
| Distilling | Kept, with the pool reset and the split kept |
| Unspent Logits boost production | Kept unchanged |

---

## Task Breakdown

| ID   | Task | Priority | Dependencies | Status  |
|:-----|:-----|:---------|:-------------|:--------|
| T1   | Contracts: `GameState` v2, view types (tabs, badges, pipeline), `PORTS_VERSION` 2 with the optional prompt port, the Build 1 save archive and fresh start, a host-free `Kit` type, boundary rules for `ui/` and `web/` | High | None | todo |
| T2   | Core economy: pool, split, `write`, `ingestPrompt` with the hourly cap, Q, buyers, `deploy` and `undeploy`, lump training. Remove context, jobs and the contract pick. Specs for each | High | T1 | todo |
| T3   | Era 1 content: four models, four buyers, machines without the context perk, research (Scheduler, Delta Rule), the shop list, `export:content` | High | T2 | todo |
| T4   | Story: about 20 alternate-history beats, the winter frame, Distill text | Med | T3 | todo |
| T5   | Distill and shop under the pool, the Scheduler auto-deploy effect | High | T2, T3 | todo |
| T6   | View model: tabs with reveal, badges, `PipelineView`, new rows | High | T2 | todo |
| T7   | Shared `ui/`: move `hooks/ui`, the tabbed layout, Lab with the pipeline, a test that draws with both Kits | High | T6 | todo |
| T8   | Mod wiring: Claude Code Kit, the `prompt.submit` hook with the origin filter, the save path, `claude plugin test` | High | T5, T7 | todo |
| T9   | Browser host `web/`: Preact Kit, browser ports, tab lock, `bun build`, Playwright e2e | High | T7 | todo |
| T10  | Balance: rewrite the bot, set the new targets, tune the numbers, update `docs/balance.md` | High | T3, T5 | todo |
| T11  | CI and Pages workflows | Med | T9 | todo |
| T12  | Docs: `ARCHITECTURE.md`, README for both hosts, the A to S to UGI roadmap in the vault note | Med | T8, T9 | todo |
| REVIEW-FIX | Code review across `core/`, `ui/`, `hooks/` and `web/`, then fixes | High | T10, T11 | todo |
| T13  | Manual playtest in both hosts. The user's step: only the user marks it done | Med | REVIEW-FIX | todo |

After T2, T3 and T6 can run in parallel. After T7, T8 and T9 can run in parallel.

---

## Exit Criteria

- [ ] All Must-Have scenarios pass: `bun test` for core and content, `claude plugin test` for the mod, Playwright for the browser
- [ ] `bunx tsc --noEmit -p .` and `bunx tsc --noEmit -p tsconfig.core.json` pass, `bun run check:boundary` passes, and `claude plugin validate .` reports no errors
- [ ] `bun run sim` meets every target on 10 seeds: the Perceptron by hand alone before 90 s, the anti-grind point, the first Distill at 30 to 45 min, and run 2 at least 2x faster
- [ ] Offline catch-up equals the same time of live ticks within 1%
- [ ] A Build 1 save loads into a fresh run with its founder kept
- [ ] The Pages URL loads the game, and CI is green on the merge PR
- [ ] The user's manual playtest in both hosts reaches the first Distill (T13)

---

## References

- Build 1 spec: `docs/specs/todo/tokin-build-1-spec.md`
- Architecture: `docs/ARCHITECTURE.md`
- Balance: `docs/balance.md`
- Design: `~/dev/obKidian/100-Projects/110-Active/119-Personal/toKin - Design.md`
- Project note: `~/dev/obKidian/100-Projects/110-Active/119-Personal/toKin - Project.md`
- Design system (Claude Design, private): <https://claude.ai/artifact/YJNB5Xq6cu3pSQEQqUNcsE>
- Incremental research: <https://claude.ai/artifact/PamoiJhN2aLpY2CEZqg5RD>
- Roguelike research: <https://claude.ai/artifact/FTt2ifQ5yQ2V6BCSJVTsrV>
- Plugin API: the plugin-authoring skill's `types/claude-code.d.ts`, `prompt.submit` and `turn.step`
- GitHub issue: <https://github.com/Kiriketsuki/toKin/issues/1>

---

*Authored by: Clault KiperO 5.5*
