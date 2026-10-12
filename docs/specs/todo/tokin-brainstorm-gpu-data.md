# toKin brainstorm: the GPU era and data gathering

Options from the 2026-10-12 brainstorm, for the user to choose from. Nothing
here is decided. The full option texts, with mechanics, risks and flavor, are
in `curves-v1/brainstorm.json`. Decisions go to `tokin-economy-decisions.md`.

## The GPU era

| # | Option | In one line |
|:--|:--|:--|
| G1 | The arcade board | The first GPU is a junked graphics board from an arcade gig. It sits unused until research teaches it to count |
| G2 | Two meters, home hardware | The one compute number becomes a meter per device. Each job has a home device and asks 4 times more away from it |
| G3 | The training bay | The simplest split. Keep MIPS for everything. A board is a bay that runs one training run, which frees the CPU for copies and converters |
| G4 | The serial tail | Every job has a parallel share. The parallel part runs on the board and the rest stays on the CPU, so the CPU must keep feeding the board |
| G5 | Picture memory (VRAM) | A net that fits on a board runs at full speed. One that spills into RAM slows on the same squared curve as D16 |
| G6 | The fuse box | The garage has one circuit. Boards draw watts and make heat. Too many trip the breaker, which sheds one device |
| G7 | The shelf | More boards run more jobs at once. Ganging boards on one job needs research and a link, with falling returns until the link improves |
| G8 | Time on the big machine | Money rents compute: an overnight punch-card run, then time-sharing, then a grid. Renting keeps every net trainable |
| G9 | Board market weather | Board prices move with golden-cookie-style events: an arcade boom, a crash, a surplus auction, a memory plant fire |
| G10 | First light | The era arrives as a staged moment: the CPU wall, the teaser board, and a first run on the board that takes 1.5 minutes instead of 2.7 hours |

Suggested path: the CPU wall (G10), a punch-card rental as the way through
(G8), the arcade board (G1) as a training bay (G3), GPU programming and first
light (G10) with VRAM (G5), more boards and market weather (G9), then batched
serving grows the bay into two meters (G2), then the fuse box (G6), the shelf
(G7) and time-sharing (G8).

Questions:

1. Which compute split: the training bay growing into two meters, two meters
   from the start, or the serial tail?
2. Should a board also speed up small jobs, or only lift big nets out of the
   crawl?
3. Is 1 op the same on every device (MIPS, FLOP/s and TOPS only as labels), or
   is there an exchange rate?
4. How does the first board arrive: an arcade gig, the shop, or both? One
   research node or two?
5. Can run 1 reach the GPU era, or only a later run? What does Distill keep?
6. VRAM: a hard cap, a spill on the squared curve, or a spill plus a reward for
   spare VRAM?
7. Power and heat: both, power only, or neither for now?
8. Renting: which stages? May the player rent out idle boards?
9. Market events: which ones? Is a mining boom fine as loose history?
10. Rough dates: does the board era sit in a loose 1970s and 1980s, after the
    garage?

## Data gathering

| # | Option | In one line |
|:--|:--|:--|
| A1 | Data fills a Corpus | Data becomes a fourth pipeline type. It fills the Corpus, which training reads and nothing else spends |
| A2 | Volume and quality | The Corpus has two numbers, shown as a size and a school grade. A net's quality comes from both |
| A3 | Scissors and paste | A press can clip data instead of writing tokens, on the same typing ladder. Each finished gig leaves a carbon copy as data |
| A4 | Seeds to shards | Each copy reads its own shard of the Corpus and never repeats. Copies beyond the shards fall back to seeds |
| A5 | The data dial | Each net size wants about 20 data tokens per parameter. Short data trains a worse net, never a blocked one |
| A6 | Synthetic generators and the bad batch | Generators make cheap data at uneven quality. A batch sometimes goes bad, and an active player can catch it |
| A7 | Carbon copies (model collapse) | Training on your own output makes each generation fainter. Fresh human data keeps the ink dark. Floor at 40% quality |
| A8 | Sift and sort | Cleaning trades volume for quality, with a strictness dial and an optional hand-sorting tray |
| A9 | The publisher's letter | Sources are public domain, licensed or found. Found data and papers raise Heat, and Heat brings a lawyer's letter |
| A10 | Agents in the stacks | Late game, your nets gather data, scan books and finally hit the data wall |

Suggested path: the first repeat event introduces the Corpus, with hand
clipping and gig carbons (A2, A3, A4, A5). Pipelines bring data converters,
scraping, cleaning and the first lawyer's letter (A1, A8, A9). Synthetic
generators follow through research (A6), with model collapse tracked gently
(A7). Custom model sizes bring the data dial slider (A5). The GPU era brings
agent gatherers, book scanning and the data wall (A10).

Questions:

1. Where does data live: a Corpus fed by a fourth pipeline type, or somewhere
   else?
2. Does training use data up, or read it and leave it, with repeat passes
   worth less?
3. Does the Corpus show volume only, or volume and quality?
4. What does net quality do: more tokens per copy, better-paying gigs, or
   both?
5. When does data first appear: at the first repeat event, or only with LLMs?
6. Should a press be able to clip data on the same ladder?
7. Should every finished gig leave a little data behind?
8. Bad batches: visible with a catch window, or found only when the net comes
   out bad?
9. Model collapse: in or out?
10. Licensing: real mechanics or flavor only?
11. What does Distill keep from the data layer?
