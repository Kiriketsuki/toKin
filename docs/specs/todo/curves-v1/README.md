# toKin curves v1 (placeholders)

The first full set of curves and prices for the economy in
`../tokin-economy-decisions.md`. A multi-agent survey of common idle games
produced it on 2026-10-12. A simulation checked it, and a fact check checked its
claims about each game. Every number is a placeholder. Tune the numbers in the
Curve Lab, and the balance bot sets the final values later.

- Curve Lab (private): <https://claude.ai/artifact/QJbjCvsQcRgX3QRY4uxpXH>.
  It has a slider for every parameter. It runs `sim.cjs` live for four player
  profiles, and it saves named presets. A preset marked "chosen" is the one to
  put into the game.
- Economy map (private): <https://claude.ai/artifact/SNgE31wHp2wBCDaEsbDfzL>.

## Files

| File | Holds |
|:--|:--|
| `params.json` | The 155 parameters: key, label, group, value, slider range, unit and note |
| `recommendation.json` | The 23 curves with formulas and rationale, pacing targets, events, prestige, notes and the changelog from the draft |
| `survey.json` | The four game surveys with sources, the fact checks, the gaps found and the simulation report |
| `brainstorm.json` | The GPU era and data gathering option sets, with progressions and open questions |
| `sim.cjs` | The pacing simulator: 1 s ticks, seeded random streams, greedy bots. Its header lists the command-line flags |
| `lab/` | The Curve Lab source. `python3 lab/build.py` rebuilds the page from the template, `params.json`, the formulas and `lab/sim-core.js` |

## Sources

- Cookie Clicker: building price x1.15 per owned, the tier formula, click
  scaling, the golden cookie timer and effects. Read from the game's source.
- AdVenture Capitalist: business tiers, cycle times, milestone doublings and
  the angel investor formula.
- Antimatter Dimensions, Clicker Heroes and Realm Grinder: tiered generators,
  active and idle builds, reset layers.
- Universal Paperclips, Kittens Game and A Dark Room: conversion chains, caps,
  events, and management without punishing absence.
- Anthony Pecorella, "The Math of Idle Games" parts I to III, and his GDC
  Europe 2016 talk: growth rates, bulk buying, prestige shapes and reset
  timing.

The fact check confirmed 57 claims, corrected 11 and could not confirm 5. The
corrections are in `survey.json` and in the changelog.

## Pacing

Times from the first press, from the simulation with the recommended values
and seed 1. Active presses 6 times a second and queues jobs. Idle casual
presses 2 times a second until a net runs, then checks in for 60 s every 10
minutes. The Curve Lab shows the same table live.

| Milestone | Active | Idle casual |
|:--|--:|--:|
| First typing level | 0:01 | 0:04 |
| Typing ladder cap (L8, 256 tokens a press) | 1:24 | 4:07 |
| First net trained | 2:48 | 6:49 |
| First hardware | 2:46 | 10:01 |
| First "copies repeat" event | 2:49 | 20:01 |
| Converters unlock | 7:07 | 30:20 |
| Multi-layer net researched | 13:39 | 50:00 |
| First AI paper | 26:07 | 60:00 |
| Distill unlocks | 31:07 | 65:00 |
| Suggested first Distill (2.25x run tokens) | 35:54 | 76:37 |
| Run 2 first paper (Logit bonus only) | 11:35 | 40:00 |

The active player reaches Distill about 2.1 times sooner than the casual idle
player. With only the Logit bonus carried over (D25), run 2 reaches its first
paper 2.25 times sooner for an active player, 2.16 times for the pane and 1.5
times for the casual idle player. Idle runs stay slow because every converter,
node and paper waits for a check-in. That idle gap is a known issue to tune.

## The curves in short

- **Typing ladder.** Level L gives 2^L tokens a press and costs
  10 x 3^(L-1) tokens. Each level takes 1.5 times the presses of the last. The
  ladder caps at L8 on the basic computer (D19).
- **Presses.** A press counts unless it is a key auto-repeat or faster than 40
  a second. Presses never stop paying.
- **Nets.** Tier i (Perceptron, multi-layer, convolution, recurrence,
  attention) costs x12 per tier to design and code, trains x8 longer at x3 the
  demand, and writes x6 the tokens at x3 the MIPS. The Perceptron costs 25,000
  plus 35,000 tokens, trains for 45 s at 1 MIPS and writes 90 tokens a second
  per copy at 0.25 MIPS.
- **Model size.** Fixed sizes: Small, Medium, Large. Each size gives x2.5
  output at x2 MIPS and x4 training work. Sizes above Small need data tokens.
- **Copies.** Copy n costs 4,000 x 1.12^(n-2), with a gentler ratio for newer
  nets (floor 1.07).
- **Repeats and dedup.** Each net has a seed space of 16. The repeat event
  fires when fewer than 90% of copies are unique, at copies 5, 8, 15, 29 and so
  on. Dedup costs 3 times the next copy, doubles the seed space and gives that
  net x1.3 output.
- **Compute.** The basic computer has 1 MIPS. Oversubscribed jobs run at
  (capacity / demand)^2 (D16). Priorities only decide who slows down most, at
  a weight of 1.5 per list position (D17).
- **Gigs.** Six tiers, from newspaper classifieds to a mill payroll program.
  Each tier asks x8 the tokens and pays x6 the money. Offer intervals cap money
  per second. Tier 1 has no income gate, every gate stays open once reached,
  and at most 3 accepted gigs wait at once.
- **Hardware.** Six tiers, from a maths co-processor ($60, +0.5 MIPS) to
  mainframe time. Price x11.7 and MIPS x6 per tier, x1.15 per unit owned, 25%
  sell-back. RAM doubles per buy at x3 the price and caps the largest net.
  Overclock adds 10% MIPS per level with a crash chance that grows with the
  square of the level.
- **Pipelines.** Converters unlock at 1M tokens made in the run. A converter
  takes 1,000 raw tokens a second at 0.5 MIPS: 10 raw per prose or code token,
  25 per research token. Converters together draw at most 60% of raw income.
  Specialised tokens fill sinks (a node, a paper, a typed cost) and never a
  pool. Any typed cost except research and papers can be paid in raw tokens at
  2x.
- **Research.** A node at depth d costs 16,000 x 2.5^(d-1) research tokens.
- **Publishing.** Paper k costs 50,000 x 2.5^(k-1) prose tokens and needs an
  unpublished AI result. Citations decay toward half their starting rate with a
  20 minute half-life. Grants pay money at Citation thresholds.
- **Publishing costs (D20).** Each paper schedules one "market catches up"
  (gig pay -4%, floor 70%) and one "rival adopts your method" (the edge loses
  25% of what remains, floor 50%). Both use the golden cookie timer: quiet for
  2 minutes, certain by 6.
- **Distill (D23).** It unlocks 5 minutes after the first AI paper and pays
  floor(15 x sqrt(lifetime tokens / 1.8e7)) Logits, minus Logits already
  earned. Each Logit earned adds 5% to all production.
- **Offline.** Full idle rate for up to 8 hours, with no presses, events or
  crashes.

## The first build (D25)

The numbers above stand. These parts of the survey are shelved until after the
first build, and the Curve Lab tags their sliders as shelved:

- Inspiration events.
- Grants.
- The Distill tree (Muscle memory, Warm start). Distill keeps one placeholder
  benefit: +5% production per Logit earned. It is tuned after the first base
  run.
- Press-skill research nodes.
- Model sizes above Small and the Bigger nets nodes, because they need data.
- The Synthetic data node and bad-data events.
- GPU programming and everything after it, and the Transformer converter.

Decided mechanics keep what they need: the gig board's offers and deadlines
(D6), hardware tiers, RAM and overclock (D15), and Data cleaning research,
which makes dedup cheaper (D5).

Without grants, a player who never takes a gig still reaches Distill but cannot
buy the RAM for the multi-layer net. That is not a soft-lock, because gig tier 1
is always open.

## Readings

The survey interpreted these decisions, and the numbers encode them. They stand
with the numbers (D25).

- D3: no press-skill research nodes for now (`press.netShare` 0).
- D19: the ladder cap does not rise with new hardware
  (`ladder.capPerHardwareTier` 0).
- D22: presses faster than 40 a second do not count (`press.maxCounted`).
- D5: overlap is hand-waved until the repeat event (`dedup.handWave` 1).
- D8: net design from convolution on, and gigs from tier 3 on, ask for typed
  tokens.
- D23: only AI results can be published, so every paper is a paper on AI.
- D9: model sizes above Small need data tokens. Moot in the first build.

## Soft-lock audit

The simulation probed each way a player could get stuck:

- Presses always pay, and nothing touches press income.
- Gig tier 1 opens with no income gate, at the ladder cap or with the first
  running net. Tier gates stay open once reached.
- The basic computer cannot be sold, and every job runs above zero speed.
- Converters cannot drain the pool, and typed costs always accept raw tokens.
- Every penalty has a floor.
- Distill needs at least 1 Logit, and lifetime tokens only grow.
