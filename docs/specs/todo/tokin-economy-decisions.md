# toKin economy decisions

A running record of the economy brainstorm that started on 2026-10-11. It
replaces the economy in `tokin-build-2-spec.md`: the token split, the compute
split, buyers and the Era 1 tables. Each entry says what we decided. Open
questions and parked ideas are at the end. Numbers are placeholders until the
balance bot tunes them.

Live diagram: <https://claude.ai/artifact/SNgE31wHp2wBCDaEsbDfzL> (private,
updated with this file).

## Ground rules

- We build the economy step by step. The user decides each step. No defaults.
- Story is out of scope for now. The economy comes first.
- Simple first. Leave room for a sprawling tech tree later.
- Active play pays more than idle play. Both are supported playstyles.
- Accuracy is hand-waved where it helps the game.

## Decisions

### D1. Tokens are the main currency

Tokens stand for any output: lines of code, text, ideas. Every token goes into
one shared pool, and the player spends from that pool.

### D2. The game starts with hands only

At the start, the only source of tokens is the player. One press of a button
or a key gives 1 token.

### D3. One manual upgrade track

The first purchase is a better manual method. Tokens per press double each
level: 1, 2, 4, 8 and on. There is one track for now.

The pacing knob is the price ratio between levels. With a ratio of 2 every
level costs the same presses and growth runs away. With 3 each level takes 1.5
times the presses of the last. With 4 each level takes twice the presses. We
tune it later.

### D4. A neural net takes four stages

1. Design: tokens go into thinking up the architecture.
2. Code: tokens go into writing the net.
3. Train: time on the computer. Training is timed, so compute matters later
   for full LLMs.
4. Output: the finished net writes tokens into the pool on its own.

### D5. Nets run as many copies on random seeds

- A trained net runs as many copies. Each copy runs on its own random seed, so
  copies write different tokens. Any overlap is hand-waved.
- Each copy costs tokens, and each costs more than the last.
- Event: copies start to repeat each other. The player spends tokens to dedup.
- Later, seeds give way to real training data: the player scrapes and gathers
  data for LLMs.

### D6. Money is the second currency, and it comes from gigs

- Gigs are small local jobs with flair: copy for the newspaper, reading
  license plates for the local police, and similar.
- Each gig has a deadline.
- Money buys hardware.
- Client management is a later add-on: promotions as the player gets faster,
  and gigs that grow into full-time contracts. It is not specified now.

### D7. The first computer is a basic CPU machine

- There is no GPU. The CPU trains nets and runs the copies.
- Gig money buys more CPU, so more copies run.
- D11 to D15 set how compute works.

### D8. Specialised tokens exist only inside pipelines

- The pool holds raw tokens. Specialised tokens (prose, code, research) exist
  only while they move through a pipeline.
- Converters turn raw tokens into one specialised type. Narrow converters come
  first. The Transformer comes later as the converter for every type.
- Pipelines feed the places that need a type: gigs, net design and code, and
  the research tree.
- The player manages the pipelines to keep them optimal. This is where active
  play pays more than idle play.
- Everything is raw at the start. Types arrive as a mid-game layer.

### D9. Research runs on research tokens

- A pipeline turns raw tokens into research tokens and feeds them to the
  research tree.
- The tree has three levers for better nets:
  - Architecture: Perceptron, multi-layer net, convolution, recurrence,
    attention, Transformer.
  - Scale: model size. More parameters need more data tokens and more compute
    time. Fixed sizes come first and custom sizes later (D18).
  - Techniques: multipliers such as backprop, dropout, data cleaning (cheaper
    dedup) and vectorised maths.
- A research node such as GPU programming unlocks GPUs.

### D10. Publishing earns Citations at two costs

- Writing a paper turns a research result into a publication. It costs prose
  tokens.
- A published paper collects Citations over time. Citations build reputation,
  which unlocks better clients, grants and later hires.
- Publishing has two costs. Gig and contract pay drop a little as the market
  catches up, and the edge from that research fades because everyone has it.
  Q7 checks that we read "both ways" right.

### D11. Compute is one number, in MIPS on the CPU

- Compute is a single number. On the CPU it is measured in MIPS, millions of
  instructions per second.
- Copies, converters and training runs are jobs. Each job asks for MIPS.
- Later the number splits by hardware: FLOP/s for GPUs and TOPS for
  specialised accelerators.

### D12. Too many jobs oversubscribe by default

- When jobs ask for more MIPS than the machine has, they share it and all slow
  down by more than their fair share. The story is context switching and IO.
- A player who manages actively queues jobs instead, so the running jobs keep
  full speed.
- The slowdown is the penalty for idle play. D16 sets the curve.

### D13. Jobs are managed by hand or with priorities

Both playstyles are supported. D17 sets how priorities and the slowdown
interact.

### D14. Research takes no compute

Research nodes cost research tokens only. The pipeline limits research, and
pipeline converters are jobs that use compute, so compute reaches research only
through the pipeline.

### D15. Money buys every kind of hardware

Faster chips, more cores, more machines, RAM and overclocking. RAM caps how big
a net the machine can load, which ties to Q2. Overclocking adds MIPS and can
crash the machine as an event.

### D16. The slowdown starts gently and turns steep

When jobs oversubscribe, each job runs at (capacity / demand) squared. Jobs that
ask for 1.25 times the capacity run at 64%, and the machine does 80% of its
work. Twice the demand runs each job at 25%, and the machine does half its
work. Three times the demand leaves a third.

### D17. Priorities steer first, and queue once earned

At first, a priority list only decides which jobs slow down most. Only queuing
by hand removes the slowdown. A scheduler research node later turns the
priority list into an automatic queue for the lowest jobs, so idle play earns
its way out of the penalty.

### D18. Fixed model sizes first, custom sizes later

Early nets come in fixed sizes, so each training run asks for a fixed amount of
MIPS, set by the net. Later stages let the player choose a model's size. The
sweet spot of data tokens per parameter matters from then on.

## Open questions

| # | Question |
|:--|:--|
| Q5 | Prices: the typing ladder ratio and the costs of the first net. |
| Q6 | What unlocks the first net: a typing level, or a token total? |
| Q7 | Do both publishing costs apply to every paper? |
| Q8 | Setting: the 1950s garage, or another frame? |
| Q9 | Do real key presses count in the browser, or only the on-screen button? |

Resolved: Q1 and Q4 by D11 to D13, Q3 by D14, Q10 by D16, Q11 by D17, Q2 and
Q12 by D18.

## Later

- GPUs and full LLMs.
- Custom model sizes, with a sweet spot of data tokens per parameter.
- Data gathering: scraping replaces random seeds.
- Client management: ladders, promotions, full-time contracts.
- Prestige: Distill or a replacement. Not discussed yet.
- Story and the era roadmap.
- The design system, updated for this economy. The draft at
  <https://claude.ai/artifact/YJNB5Xq6cu3pSQEQqUNcsE> was built for the old
  economy.

## Set aside

From `tokin-build-2-spec.md`, set aside on 2026-10-11:

- The Keep, Sell and Study token split.
- The Serve and Train compute split.
- Buyers unlocked by models, and the Era 1 model and research tables.
- Story beats and the winter frame, for now.

Considered in this brainstorm and not picked: beats as the reason copies cost
tokens (kept as an idea), shards, and night shifts.
