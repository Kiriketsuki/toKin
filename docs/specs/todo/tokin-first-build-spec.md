# Feature: toKin first build (the garage economy)

> Supersedes the economy in `tokin-build-2-spec.md`. The browser host, the
> shared `ui/` pane and the Pages and CI workflows from that spec are built
> and stay. The decisions behind this spec are D1 to D28 in
> `tokin-economy-decisions.md`, and the numbers are curves v1 in
> `curves-v1/`.

## Overview

**User Story**: As a player, I want to start as a student in a garage who
types tokens by hand, then build neural nets, take gigs for money, grow a CPU
machine, pipe tokens into research and publish papers, so that I reach a first
Distill and start a stronger second run, in Claude Code or in a browser tab.

**Problem**: The Build 1 economy put cash in the headline, the opening
dragged, and the Build 2 redesign (the token split and the Serve and Train
split) was set aside on 2026-10-11. The step-by-step economy (D1 to D28) and
its curves exist only as documents and a simulator, not as a game.

**Out of Scope** (shelved until a base run is playable, D25 and D26):
Inspiration events, grants, the Distill tree and the Logits shop, press-skill
research nodes, model sizes above Small and the Bigger nets nodes, data
gathering and the Synthetic data node, GPU programming and the GPU era, the
Transformer converter, client ladders, story and story beats, prompt tokens in
the mod, the design system update, save sync between the hosts, and big-number
types beyond plain doubles.

---

## Success Condition

> This feature is complete when a player can play the first build in Claude
> Code (`/tokin`) or in the browser at the Pages URL from the first press to a
> first Distill and into run 2, with one ViewModel drawing both hosts, and the
> balance bot, playing the real core, meets the curves v1 pacing on 10 seeds.

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | Hand queuing (D12, D17): is a run count per job group the right control? Proposal: each net's copies, each converter kind and the training run show "running n of m" with - and +. Paused jobs ask for no MIPS | Claude | [ ] |
| 2 | Header: tokens with tok/s, money once earned, MIPS used of total, Citations once earned, Logits once earned. No year while story is out of scope. Enough? | Claude | [ ] |
| 3 | The research queue: the player orders the nodes, and research converters fill the first node in the queue. Proposal: a new game queues nodes in content order, and the player can move a node to the top | Claude | [ ] |

---

## Design

### Resources

```
press ──> TOKEN POOL <── net copies (jobs)
            │
            ├── typing levels, net design and code, copies, dedup
            ├── gigs ──> MONEY ──> hardware, RAM, overclock ──> MIPS
            └── converters (jobs) ──> prose, code, research tokens ──> sinks
                                         research ──> research tree
                                         prose ──> papers ──> CITATIONS
first AI paper + 5 min ──> Distill ──> LOGITS (+5% production each)
```

| Resource | Made by | Spent on |
|:--|:--|:--|
| Tokens (pool, headline) | Presses, net copies | Typing levels, net design and code, copies, dedup, gigs, converters, typed costs paid raw |
| Money | Gigs | Hardware, RAM, overclock |
| Compute (MIPS) | The basic computer and hardware | Nothing. Jobs ask for it: training runs, copies, converters |
| Prose, code and research tokens | Converters | Sinks only: research nodes, papers, typed net costs, typed gig shares. Never a pool (D8) |
| Citations | Published papers, over time | Nothing. They open gig tiers 4 to 6 |
| Logits | Distill | Nothing. Each Logit earned adds 5% to all production (D25) |

### The systems

Every formula and number below comes from `curves-v1/README.md` and
`curves-v1/params.json`. The content pack holds the parameters, so a value
changes in one place.

1. **Hands (D2, D3, D19, D22).** A press gives 2^L tokens at typing level L.
   Level L costs 10 x 3^(L-1) tokens. The ladder caps at L8 on the basic
   computer. A press counts unless it is a key auto-repeat or the 41st press
   in a second. In the browser every key press counts, except keys typed into
   a text field. The mod uses its button.
2. **Nets (D4, D18).** Five fixed-size tiers: Perceptron, multi-layer net,
   convolution net, recurrent net, attention net. Each net goes through design
   (tokens), code (tokens), training (a job with fixed work and demand) and
   then runs. Design and code are lump spends. Code from the multi-layer net
   on, and design from the convolution net on, are typed costs (see
   Pipelines). A net loads only if its RAM footprint fits. The Perceptron
   unlocks at the ladder cap. Each later net unlocks with its architecture
   node.
3. **Copies and dedup (D5).** Training gives the first copy. Copy n costs
   4,000 x 12^i x r_i^(n-2) tokens for tier i, with r from 1.12 down to a
   1.07 floor. Each copy is a job. When fewer than 90% of a net's copies are
   unique (seed space 16 at first), "copies start to repeat" fires and new
   copies lose their overlap. Dedup costs 3 times the next copy (half that
   with Data cleaning), doubles the seed space and gives that net x1.3 output
   for the run.
4. **Compute and jobs (D11 to D17).** The basic computer gives 1 MIPS. Jobs
   ask for MIPS. When demand passes capacity, the machine does C x (C / D) of
   work, shared along the priority list with a weight of 1.5 per position.
   With one group per position, every job runs at (C / D)^2 (D16). The
   default list is training, then converters, then copies by tier, newest
   first. The player can reorder it, pause jobs by hand (Open Question 1), or
   research the Scheduler, which queues every job that does not fit. A job
   never runs at zero.
5. **Hardware (D15).** Six tiers from the maths co-processor ($60, +0.5
   MIPS) to mainframe time. Price x11.7 and MIPS x6 per tier, x1.15 per unit
   owned, 25% sell-back. The basic computer cannot be sold. RAM starts at
   4 KB and doubles per upgrade at x3 the price from $100. Overclock adds 10%
   MIPS per level, up to 5, and can crash: every job pauses for 30 s and the
   training run loses up to a quarter of its progress, capped at 60 s of work.
6. **Gigs (D6).** Six tiers, from newspaper classifieds (8,000 tokens, $12,
   60 s deadline) to the mill payroll program. Each tier asks x8 the tokens
   and pays x6 the money. The board opens at the ladder cap or when the first
   net runs. Tier 1 has no gate. Tier k from 2 opens when token income covers
   twice the tokens per deadline. Tiers 4 to 6 also need Citations. Gates
   stay open for the run. Offers arrive at an interval per tier and wait 10
   minutes. A gig the pool covers delivers at once. Up to 3 accepted gigs
   can wait to be filled from the pool. A missed deadline pays nothing and
   refunds half the tokens delivered. From tier 3 a quarter of the tokens
   must arrive typed (prose, or code for the payroll program).
7. **Pipelines (D8).** Converters unlock at 1M tokens made in the run. Three
   kinds: prose, code and research. A converter is a job at 0.5 MIPS that
   takes 1,000 raw tokens a second and makes 100 prose, 100 code or 40
   research tokens. Converter n of a kind costs 100,000 x 1.15^(owned)
   tokens. Each converter kind fills its sinks in queue order: research fills
   the research queue, prose fills the paper being written, then typed net
   design and typed gig shares, and code fills typed net code and the payroll
   gig. A converter with no sink fills a 60 s buffer, then stalls and frees
   its MIPS. Converters together draw at most 60% of raw income. Any typed
   cost except research nodes and papers can be paid in raw tokens at 2x.
8. **Research (D9, D14).** A node at depth d costs 16,000 x 2.5^(d-1)
   research tokens and no compute. First-build nodes:

   | Depth | Node | Effect | AI result |
   |:--|:--|:--|:--|
   | 1 | Multi-layer net | Unlocks the multi-layer net, +25% edge to it | Yes |
   | 1 | Write it up | Opens papers | No |
   | 2 | Backprop | All net output x2, +10% edge | Yes |
   | 2 | Data cleaning | Dedup costs half, +10% edge | Yes |
   | 3 | Convolution | Unlocks the convolution net, +25% edge to it | Yes |
   | 3 | Vectorised maths | MIPS per copy x0.7, +10% edge | Yes |
   | 3 | Scheduler | Queues every job that does not fit (D17) | No |
   | 4 | Dropout | All net output x1.5, +10% edge | Yes |
   | 4 | Recurrence | Unlocks the recurrent net, +25% edge to it | Yes |
   | 5 | Attention | Unlocks the attention net, +25% edge to it | Yes |

9. **Papers and Citations (D10, D20).** Paper k costs 50,000 x 2.5^(k-1)
   prose tokens and needs one unpublished AI result. A paper on a depth d
   result earns 0.05 x 2^(d-1) Citations a second, decaying toward half that
   with a 20 minute half-life. Each paper schedules one "market catches up"
   (gig pay -4%, floor 70%) and one "a rival adopts your method" (that
   result's edge loses 25% of what remains, floor 50%). Each fires once at a
   time drawn from the golden cookie hazard: quiet for 2 minutes, certain by
   6. Each event type draws from its own seeded stream in the save.
10. **Distill (D23, D25).** Distill unlocks 300 s after the first AI paper and
    pays floor(15 x sqrt(lifetime tokens / 1.8e7)) Logits, minus Logits
    already earned. It needs a payout of at least 1. Each Logit earned adds
    5% to press tokens, net output, specialised tokens and gig pay.
11. **Offline.** Away time runs at the full idle rate for up to 8 hours. No
    presses, overclock, crashes or events. Gig deadlines pause and no offers
    arrive. Publishing events wait for the player's return. The priority list
    and the Scheduler apply as live.

### Distill resets

- **Resets:** the pool, money, run tokens, run seconds, typing level, nets and
  copies, seed spaces and dedup bonuses, jobs and the priority list,
  hardware, RAM, overclock, gigs and gates, converters, buffers, research,
  papers, Citations, the market multiplier, edges and pending events.
- **Keeps:** Logits earned, lifetime tokens, the founder, stats, the clock,
  the RNG state and streams, and the log.

### Never soft-lock

- Presses always pay, and nothing touches press income.
- Gig tier 1 opens with no income gate, and gates stay open once reached.
- The basic computer cannot be sold, and every job runs above zero speed.
- Converters cannot drain the pool, and typed costs other than research and
  papers always accept raw tokens.
- Every penalty has a floor.
- Distill needs at least 1 Logit, and lifetime tokens only grow.

### Pane and tabs (D27)

- **Header:** see Open Question 2.
- **Tabs,** in reveal order: Desk, Nets, Machine, Gigs, Pipelines, Research,
  Papers, Log.

  | Tab | Holds | Shows from |
  |:--|:--|:--|
  | Desk | The press button and the typing ladder | The start |
  | Nets | Design, code, training, copies and dedup | The ladder cap |
  | Machine | Jobs, priorities, hardware, RAM and overclock | The first job runs |
  | Gigs | The gig board: offers, deadlines and pay | The board opens |
  | Pipelines | Converters and their sinks | Converters unlock |
  | Research | The research queue and tree | The first research converter |
  | Papers | Papers, Citations and Distill | Write it up is researched |
  | Log | Events and milestones | The start |

- A fresh game shows Desk and Log. A tab shows a dot when it holds something
  new: the first time an item there becomes affordable, a new event, or an
  unread log line. The dot clears when the player opens the tab.
- The voice stays terse, lowercase and second person.

### Hosts

- One core and one content pack serve both hosts, as in Build 2. `core/` and
  `content/` stay identical across hosts.
- `ui/` draws the eight tabs with the host's Kit. `web/` adds key presses
  (D22). The mod keeps its button.
- Ticks stay at 1 s, the same step as `curves-v1/sim.cjs`.

### Saves (D28)

- `STATE_VERSION` 2. A version 1 save moves to the archive key. A fresh run
  starts with the version 1 founder and logs one line about the old ledger.

---

## Scope

### Must-Have
- **Hands:** press, the typing ladder and its cap, the press-rate rules. Done when 10 presses at L0 buy L1 and the ladder stops at L8.
- **Nets and copies:** the four stages, the RAM gate, copy prices, the repeat event and dedup. Done when the Perceptron trains in 45 s alone on the basic computer and the repeat event fires at copies 5, 8 and 15 with dedup paid.
- **Compute and hardware:** demand, the squared slowdown, the priority weights, pausing by hand, the Scheduler queue, hardware, RAM, overclock and crashes. Done when the D16 table holds for 1.25x, 2x and 3x demand.
- **Gigs:** the board, offers, gates, accepting, delivery, deadlines and refunds, the market multiplier. Done when tier 1 opens at the ladder cap with no income.
- **Pipelines:** three converter kinds, sinks in queue order, the buffer and stall, the 60% budget and the raw fallback at 2x. Done when converters never take more than 60% of raw income.
- **Research and papers:** the ten first-build nodes, technique multipliers and edges, papers, Citations, the two publishing events on seeded streams. Done when a paper schedules exactly one event of each kind.
- **Distill:** the unlock delay, the payout, the resets and keeps above, +5% per Logit. Done when the Distill scenarios pass.
- **Offline catch-up:** the rules above. Done when catch-up equals live ticks within 1% for the idle rules.
- **Content pack:** the first-build parameters from `curves-v1/params.json` and the name tables, as plain JSON, with `export:content`. Done when the content spec passes.
- **View model and pane:** the header, the eight tabs with reveal and dots, the rows of each tab, the log. Done when the pane tests pass in both Kits.
- **Mod:** the new actions, the save path with the archive. Done when `claude plugin test` passes.
- **Browser:** key presses count, the new tabs. Done when a Playwright test plays to the first trained net.
- **Save:** version 2 and the version 1 archive. Done when the save tests pass.
- **Balance bot:** the bot drives the real core with the `curves-v1/sim.cjs` profiles. Done when `bun run sim` meets the targets in the Exit Criteria on 10 seeds.

### Should-Have
- A script that imports a Curve Lab preset (the one marked chosen) into the content pack.
- Buy x10 and buy max for copies, with the closed forms in the copy-cost curve.
- A parity check: the real core and `curves-v1/sim.cjs` reach the same milestones within 10% for the active profile.

### Nice-to-Have
- Save export and import as a text string in both hosts.
- A number-notation setting (short or scientific).

---

## Technical Plan

**Affected Components**:
- `core/types.ts`, `core/view-types.ts`: `GameState` v2, the new `Action` union, the content types (curve parameters and name tables) and the tab views.
- New core modules, each with a spec: `hands.ts`, `nets.ts`, `compute.ts` (jobs, slowdown, priorities, queue), `hardware.ts`, `gigs.ts`, `pipelines.ts`, `research.ts`, `papers.ts`, `events.ts` (the hazard timer and streams), `distill.ts`.
- `core/step.ts`: phases for presses already applied, jobs, production, converters and sinks, training, gigs, events and reveal.
- `core/economy.ts`: rewritten as the rate summary the view and the bot read.
- `core/offline.ts`, `core/save.ts`, `core/ports.ts`: offline rules, the version 1 archive, `STORAGE_KEYS.archive`.
- Removed with their specs: `agents.ts`, `training.ts` (folded into `nets.ts`), `shop.ts`, `story.ts`, `conditions.ts` and `effects.ts` where nothing uses them, and the contract and RP code.
- `content/`: `garage.ts` (parameters and names), `garage.json`, a content spec. The `era1*` files go.
- `core/view.ts`, `core/view-rows.ts`, `core/reveal.ts`: the header, tabs, reveal, dots and rows.
- `ui/`: the tab bar and the eight tab bodies.
- `hooks/`: the new actions and the archive path. `types/index.d.ts` and `hooks/contract-check.ts` mirror `GameState` v2.
- `web/`: key presses (D22).
- `sim/`: the bot rewrite with the `curves-v1/sim.cjs` profiles and targets.
- `docs/ARCHITECTURE.md`, `docs/balance.md`, `README.md`.

**Data Model Changes** (`GameState` v2):
- Keep: `version`, `seed`, `rngState`, `founder`, `clock`, `runSeconds`, `lifetimeTokens`, `runTokens`, `log`, `lastSavedAt`, `stats` (with `presses` in place of `workPresses`).
- Add: `tokens`, `money`, `typingLevel`, `nets` (per tier: stage, design and code paid, training progress, copies, running copies, seed space, dedup count, edge), `jobs` (the priority list and pauses), `hardware`, `ram`, `overclock`, `crash` (until when), `gigs` (board, accepted, gates, market multiplier), `converters` (per kind: owned, running, buffer), `researchQueue`, `research`, `papers` (result, time, rate), `citations`, `events` (pending fire times and streams), `logitsEarned`, `firstPaperAt`, `seenTabs`, `ladderCapAt`.
- Drop: `cash`, `rp`, `machines`, `models`, `agents`, `nextAgentId`, `training`, `contractPick`, `logits` (spendable), `shop`, `story`, `revealed` and `year`. Story brings the year back later.
- Content: `GarageContent { params, nets[], gigs[], hardware[], research[], text, names }`. Names and flavour live in the tables. Every number lives in `params`.

**API Contracts** (the `Action` union):
- `nameFounder { name }`, `press`, `buyTypingLevel`.
- `designNet { tier }`, `codeNet { tier }`, `trainNet { tier }`, `buyCopy { tier, count }`, `dedup { tier }`.
- `setRunning { job, count }`, `movePriority { job, to }`.
- `buyHardware { tier }`, `sellHardware { tier }`, `buyRam`, `buyOverclock`, `setOverclock { level }`.
- `acceptGig { offer }`.
- `buyConverter { kind }`, `setConverterRunning { kind, count }`.
- `queueResearch { node, to }`, `writePaper { result }`.
- `distill`, `seeTab { tab }`.
- `ActionOption.id` keys follow the same names, such as `press`, `copy:<tier>`, `gig:<offer>`, `tab:<tab>`.

**Dependencies**: none new. Preact and Playwright stay in `web/`.

**Risks**:
| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| The rewrite breaks every Build 1 spec at once | High | Write the contracts first (T1), then each system with its own spec. Delete old modules and specs in the same task that replaces them, so the suite stays green per task |
| The core drifts from `curves-v1/sim.cjs`, so the tuned pacing no longer holds | High | The bot runs the sim's profiles on the real core (T15), and the parity check compares milestones |
| Eight tabs do not fit the Claude Code pane | Medium | Tabs show only once unlocked, and the tab bar wraps or abbreviates under the column width the layout already measures |
| A 1 s tick is too coarse for 6 presses a second and gig deadlines | Low | Presses are actions, not ticks. Deadlines count in game seconds |
| Browser key presses fire while the player types the founder name | Low | Keys typed into a text field do not count |

---

## Acceptance Scenarios

Numbers marked (content) come from the pack. A test reads them from
`content/garage.ts`. All other numbers follow from the rules.

```gherkin
Feature: toKin first build
  As a player in Claude Code or a browser
  I want to type tokens, build nets, take gigs and publish research
  So that I reach a first Distill and a stronger second run

  Background:
    Given toKin is running in either host
    And the player has named the founder

  Rule: Hands start the game

    Scenario: Pressing at level 0
      When the player presses 10 times
      Then the pool holds 10 tokens

    Scenario: Buying a typing level
      Given the pool holds 10 tokens
      When the player buys typing level 1
      Then the pool holds 0 tokens
      And each press gives 2 tokens

    Scenario: The ladder cap opens the first net
      Given the player owns typing level 7 and the pool holds 21,870 tokens
      When the player buys typing level 8
      Then the next typing level is not for sale
      And the Nets tab shows with the Perceptron available

    Scenario: Auto-repeat does not count
      Given the browser host
      When a held key repeats 20 times
      Then the pool gains tokens for 1 press

  Rule: A net goes from design to output

    Scenario: The first Perceptron
      Given the Perceptron is available and the pool holds 60,000 tokens
      When the player designs, codes and trains it
      And 45 seconds pass with no other job
      Then the Perceptron runs 1 copy
      And the pool gains 90 tokens a second (content)

    Scenario: RAM gates a bigger net
      Given the multi-layer net is researched and RAM is 4 KB
      When the player tries to design the multi-layer net
      Then nothing changes
      And the refusal names 8 KB of RAM (content)

  Rule: Copies repeat, and dedup clears it

    Scenario: The repeat event
      Given the Perceptron runs 4 copies with a seed space of 16
      When the player buys copy 5
      Then the log says copies start to repeat
      And copy 5 adds less than a full copy of output

    Scenario: Dedup
      Given the repeat event has fired for the Perceptron
      When the player pays for dedup
      Then the seed space is 32
      And the Perceptron makes 1.3 times its output (content)

  Rule: Jobs share the MIPS

    Scenario: Oversubscribed jobs slow on a square
      Given capacity is 1 MIPS with no Scheduler
      And one group of jobs asks for 2 MIPS
      Then each job runs at 25% speed

    Scenario: Pausing by hand keeps full speed
      Given capacity is 1 MIPS and 6 Perceptron copies ask for 1.5 MIPS
      When the player sets 4 copies running
      Then the 4 running copies run at full speed

    Scenario: The Scheduler queues what does not fit
      Given the Scheduler is researched
      When jobs ask for more MIPS than capacity
      Then jobs run at full speed in priority order while they fit
      And at most one job runs partly

  Rule: Gigs pay money, and money buys MIPS

    Scenario: Tier 1 needs no income
      Given the ladder cap is reached and no net runs
      Then gig tier 1 offers show on the Gigs tab

    Scenario: A missed deadline
      Given an accepted gig has 4,000 of 8,000 tokens delivered
      When its deadline passes
      Then no money is paid
      And 2,000 tokens return to the pool

    Scenario: Hardware adds MIPS
      Given the player holds $60
      When the player buys a maths co-processor
      Then capacity is 1.5 MIPS (content)
      And the next co-processor costs $69 (content)

  Rule: Pipelines turn raw tokens into typed tokens

    Scenario: Converters unlock in the run
      Given the run has made 1,000,000 tokens
      Then the Pipelines tab shows

    Scenario: The budget keeps the pool alive
      Given converters ask for more raw tokens than 60% of raw income
      Then they all slow so that they take 60% of raw income

    Scenario: A typed cost paid raw
      Given the multi-layer net is designed and no code converter runs
      When the player codes it with raw tokens
      Then it costs 2 times the raw equivalent (content)

  Rule: Research and papers

    Scenario: Research fills the queue
      Given a research converter runs and Multi-layer net is first in the queue
      When 16,000 research tokens arrive
      Then Multi-layer net is researched
      And the converter fills the next node in the queue

    Scenario: A paper needs a result
      Given Write it up is researched and no AI result is unpublished
      Then the player cannot start a paper

    Scenario: Publishing has two costs
      Given the player publishes Backprop
      Then one market event and one rival event are pending
      And each fires between 120 and 360 seconds later

  Rule: Distill starts the next run

    Scenario: Distill unlocks after the first paper
      Given the first AI paper was published 299 seconds ago
      Then Distill is locked
      When 1 more second passes
      Then Distill shows on the Papers tab

    Scenario: Distilling
      Given lifetime tokens are 18,000,000 and no Logits are earned
      When the player confirms Distill
      Then the player has earned 15 Logits
      And the pool, money, nets, hardware, research and papers reset
      And presses give 1.75 times as many tokens

  Rule: Tabs reveal as the game grows

    Scenario: A fresh game
      Given a fresh run
      Then only the Desk and Log tabs show

    Scenario: A dot marks something new
      Given the Machine tab is unlocked and the player is on Desk
      When a maths co-processor becomes affordable for the first time
      Then the Machine tab shows a dot until the player opens it

  Rule: Old saves start fresh

    Scenario: Loading a Build 1 save
      Given the store holds a version 1 save with founder "Ada"
      When the game loads
      Then the version 1 save is archived under its own key
      And a new run starts with founder "Ada"
      And the log notes the old ledger
```

The Build 1 and Build 2 scenarios for offline catch-up, the dormant session,
`/tokin stop`, the second session and the second browser tab carry over
unchanged.

---

## Task Breakdown

| ID   | Task | Priority | Dependencies | Status  |
|:-----|:-----|:---------|:-------------|:--------|
| T1   | Contracts: `GameState` v2, the `Action` union, content types, tab views, `STATE_VERSION` 2 and the version 1 archive, `STORAGE_KEYS.archive` | High | None | todo |
| T2   | Content pack: `content/garage.ts` with the first-build parameters and names, `export:content`, the content spec. Remove `era1*` | High | T1 | todo |
| T3   | Hands: press, the ladder and its cap, the press-rate rules | High | T2 | todo |
| T4   | Nets and copies: stages, RAM gate, copy prices, the repeat event, dedup | High | T3 | todo |
| T5   | Compute: jobs, the squared slowdown, priority weights, pausing, the Scheduler queue, hardware, RAM, overclock and crashes | High | T4 | todo |
| T6   | Gigs: board, offers, gates, accept and deliver, deadlines, refunds, the market multiplier | High | T5 | todo |
| T7   | Pipelines: converters, sinks, buffer and stall, the budget, raw fallback | High | T5 | todo |
| T8   | Research, papers and events: the ten nodes, multipliers and edges, papers, Citations, the hazard timer and streams | High | T7 | todo |
| T9   | Distill and offline: unlock, payout, resets, +5% per Logit, offline rules, the soft-lock checks | High | T6, T8 | todo |
| T10  | View model: header, tabs with reveal and dots, rows, log lines | High | T9 | todo |
| T11  | `ui/`: the tab bar and the eight tab bodies, drawn with both Kits | High | T10 | todo |
| T12  | Mod: the new actions, the save path, `claude plugin test` | High | T11 | todo |
| T13  | Browser: key presses (D22), Playwright e2e to the first trained net | High | T11 | todo |
| T14  | Balance bot: port the `sim.cjs` profiles onto the real core, the targets, the parity check | High | T9 | todo |
| T15  | Docs: `ARCHITECTURE.md`, `balance.md`, README | Med | T12, T13 | todo |
| REVIEW-FIX | Code review across `core/`, `content/`, `ui/`, `hooks/`, `web/` and `sim/`, then fixes | High | T14, T15 | todo |
| T16  | Manual playtest in both hosts to a first Distill. Only the user marks it done | Med | REVIEW-FIX | todo |

After T5, T6 and T7 can run in parallel. After T9, T10 and T14 can run in
parallel. After T11, T12 and T13 can run in parallel.

---

## Exit Criteria

- [ ] All Must-Have scenarios pass: `bun test` for core and content, `claude plugin test` for the mod, Playwright for the browser
- [ ] `bun run typecheck` and `bun run check:boundary` pass, and `claude plugin validate .` reports no errors
- [ ] `bun run sim` meets every target on 10 seeds, from `curves-v1/README.md`: active first net trained before 4:00, active first AI paper between 20 and 35 minutes, idle casual Distill unlock before 90 minutes, and run 2 reaching its first paper at least 2 times sooner for the active and pane profiles
- [ ] No bot profile soft-locks: each reaches Distill, the no-gig probe included
- [ ] Offline catch-up equals the same time of live ticks within 1%
- [ ] A Build 1 save loads into a fresh run with its founder kept
- [ ] The Pages URL loads the game, and CI is green on the merge PR
- [ ] The user's manual playtest in both hosts reaches the first Distill (T16)

---

## References

- Decisions: `docs/specs/todo/tokin-economy-decisions.md`
- Curves v1: `docs/specs/todo/curves-v1/README.md`, `params.json`, `sim.cjs`
- Curve Lab (private): <https://claude.ai/artifact/QJbjCvsQcRgX3QRY4uxpXH>
- Economy Map (private): <https://claude.ai/artifact/SNgE31wHp2wBCDaEsbDfzL>
- Build 2 spec (host and pane): `docs/specs/todo/tokin-build-2-spec.md`
- Architecture: `docs/ARCHITECTURE.md`
