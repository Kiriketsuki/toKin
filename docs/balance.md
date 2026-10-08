# Balance: Era 1 pacing

Run the bot with `bun run sim`. It plays Era 1 headless over 10 seeds with `core/` and `content/era1.ts`. It exits 1 when a target fails on any seed.

## Targets

| Target | Rule |
|---|---|
| First agent | before 180 s |
| kin-0.2 | before 600 s |
| Distillation researched | 1800 to 2700 s |
| Run 2 | reaches the same point at least 2x faster |

The same point is "kin-0.3 trained and Distillation held". Run 1 reaches it when it researches Distillation. Run 2 reaches it when it trains kin-0.3, because Distill keeps the Distillation research item.

## The bot

- It presses Work by hand until it runs 10 agents.
- It buys the unlocked machine with the most compute per dollar when it can pay.
- It fills free compute with the best model that fits and replaces an agent when a better model yields more per kFLOP/s.
- It keeps 40% of agent compute on Research (also 40% before kin-0.2).
- It researches in a fixed order and waits for the first item whose gates hold: Valve Logic, Training Harness, Batching, Punch-card Context, Contract Broker, Gradient Checkpointing, Rotating Storage, Vacuum Tube Binning, Attention Prototype, Distillation, Magnetic Cores, Night Shift.
- It trains the next model when free compute covers a run of 200 s (kin-0.2) or 1500 s (kin-0.3). It holds back new agents while machines already cover that run.
- It distills when Distillation is held and the payout reaches 8 Logits.
- After Distill it buys shop levels in a fixed order: Warm Start, Old Notes, Warm Start, Hand-me-down, Curriculum, Soft Targets, Warm Start, Hand-me-down, Long Memory.
- Each seed changes the press speed by up to 25% either way. The seed also drives the agent names. All other bot choices are the same on every seed, so the 10 runs sit close together.

## Result

| seed | agent | kin-0.2 | kin-0.3 | distillation | distill | logits paid | r2 agent | r2 kin-0.2 | r2 ready | speedup | pass |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28 | 552 | 1868 | 1926 | 1926 | 40 | 2 | 394 | 838 | 2.3 | yes |
| 2 | 26 | 546 | 1862 | 1920 | 1920 | 40 | 2 | 392 | 836 | 2.3 | yes |
| 3 | 26 | 544 | 1860 | 1918 | 1918 | 40 | 2 | 392 | 836 | 2.3 | yes |
| 4 | 20 | 528 | 1844 | 1902 | 1902 | 40 | 2 | 388 | 836 | 2.3 | yes |
| 5 | 20 | 528 | 1844 | 1902 | 1902 | 40 | 2 | 388 | 836 | 2.3 | yes |
| 6 | 24 | 540 | 1856 | 1914 | 1914 | 40 | 2 | 390 | 836 | 2.3 | yes |
| 7 | 28 | 550 | 1866 | 1924 | 1924 | 40 | 2 | 394 | 838 | 2.3 | yes |
| 8 | 20 | 526 | 1842 | 1900 | 1900 | 40 | 2 | 386 | 834 | 2.3 | yes |
| 9 | 28 | 552 | 1868 | 1926 | 1926 | 40 | 2 | 394 | 838 | 2.3 | yes |
| 10 | 20 | 530 | 1846 | 1904 | 1904 | 40 | 2 | 388 | 836 | 2.3 | yes |

Times are seconds of run time. "r2" columns belong to run 2. "logits paid" is the first Distill payout.

## Changed numbers and why

All changes are in `content/era1.ts`. Machine costs, ratios, compute, quality, context, contract pay, research costs, shop costs and the Gherkin samples are unchanged.

| Number | Spec start | Now | Why |
|---|---|---|---|
| tok/s of every model | 2 / 6 / 20 / 72 | 8 / 24 / 80 / 288 | At the start values the first Relay Rack paid back in 125 s and kin-0.2 arrived after 1250 s. A 4x multiplier brings the early economy to the target. |
| kin-0.2 training cost | 2000 | 1200 | Cuts the 200 s run for 10 kFLOP/s to 120 s and keeps kin-0.2 under 600 s. |
| kin-0.3 training cost | 60000 | 170000 | With 4x tok/s the economy outgrows 60000 and kin-0.3 lands before 1100 s. The higher cost puts Distillation near 1900 s. It also lets Hand-me-down and Old Notes save more time in run 2. |
| `researchRate` | 0.01 | 0.0015 | At 0.01 research was never the limit and Distillation came the second kin-0.3 arrived. At 0.0015 early research is slow but still unlocks training in time. |
| `distillT0` | 50000 | 2000 | With `distillK` 1 the first Distill pays about 40 Logits. Run 2 needs that many to buy Hand-me-down and a few levels of Warm Start, Curriculum and Soft Targets. At 4 to 12 Logits the speedup fell to 1.1x to 1.5x. |
| `distillK` | 1 | 1 | Unchanged. |

## Findings

- Distillation costs 5000 RP, but the bot holds a large RP stock by the time kin-0.3 arrives. So Distillation lands about 60 s after kin-0.3. Raising its cost moves it little. The kin-0.3 cost is the real control for the Distillation time.
- The 2x speedup needs about 40 Logits at the first Distill. Hand-me-down level 1 (kin-0.2 kept) and Old Notes (Training Harness and Contract Broker kept) do most of the work.
- Results are sensitive to the kin-0.3 cost. At 210000 the speedup drops to 1.3x on most seeds. Retune the bot and these numbers together.
- Run 2 keeps the Distillation item, so its "Distillation researched" time is zero. The run 2 point is therefore the kin-0.3 time.
- The bot grows to thousands of agents late in a run, so one seed takes about 8 s to simulate.
