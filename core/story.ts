// Story beats. A beat fires once per save when its trigger holds. The text
// goes to the log, and the year moves forward when the beat sets one.

import { holds } from './conditions'
import { computeRates } from './economy'
import { fill } from './format'
import { withLog } from './state'
import type { ContentPack, GameState, StoryBeatDef } from './types'

// The beats that have not fired and whose trigger holds now, in content order.
export function dueBeats(state: GameState, content: ContentPack): readonly StoryBeatDef[] {
  const pending = content.story.filter((b) => !state.story.includes(b.id))
  if (pending.length === 0) return []
  const rates = computeRates(state, content)
  return pending.filter((b) => holds(b.trigger, state, content, rates))
}

// Fires every due beat. Returns the same object when none is due.
export function advanceStory(state: GameState, content: ContentPack): GameState {
  const due = dueBeats(state, content)
  if (due.length === 0) return state
  const fired = due.reduce<GameState>((acc, beat) => {
    // {agent} stands for the first agent the player created.
    const text = fill(beat.text, { agent: acc.agents[0]?.name ?? 'it' })
    const logged = withLog(acc, content, text)
    return {
      ...logged,
      story: [...logged.story, beat.id],
      year: beat.year === undefined ? logged.year : Math.max(logged.year, beat.year),
    }
  }, state)
  return fired
}

// The ids of beats that fired between two states. A host shows each as a toast.
export function newBeats(before: GameState, after: GameState): readonly string[] {
  return after.story.filter((id) => !before.story.includes(id))
}
