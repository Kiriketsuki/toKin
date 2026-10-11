// View models for the pane tests. buildView makes the base from a real game,
// and small patches add the parts a short game does not reach yet.

import { FIXTURE } from '../core/fixtures'
import { initialState } from '../core/state'
import { play, repeat, started } from '../core/testkit'
import type { ViewModel } from '../core/types'
import { buildView } from '../core/view'

// A named founder with $10 or more, so the Relay Rack button shows.
export function playingView(): ViewModel {
  const state = play(started(), repeat({ type: 'work' }, 12))
  return buildView(state, FIXTURE)
}

export function freshView(): ViewModel {
  return buildView(initialState(1, FIXTURE), FIXTURE)
}

// The same view with a Distill preview that can run.
export function distillView(): ViewModel {
  return {
    ...playingView(),
    distill: {
      logits: 3,
      canDistill: true,
      resets: ['cash', 'machines', 'agents'],
      keeps: ['research', 'Logits'],
    },
  }
}
