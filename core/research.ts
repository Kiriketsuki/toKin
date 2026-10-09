// Research: spend RP on an item once its gates hold. The effects of a
// researched item are not stored. modsOf reads them from state.research
// through the effect interpreter in effects.ts, so one list is the truth.

import { computeRates } from './economy'
import { holdsAll } from './conditions'
import { fmtNum } from './format'
import { OK, refuse, type Handlers } from './handler'
import type { ContentPack, GameState, ResearchDef, Verdict } from './types'

export function findResearch(content: ContentPack, id: string): ResearchDef | undefined {
  return content.research.find((r) => r.id === id)
}

function checkResearch(state: GameState, content: ContentPack, id: string): Verdict {
  const def = findResearch(content, id)
  if (!def) return refuse(content, 'unknownId', { id })
  if (state.research.includes(def.id)) return refuse(content, 'alreadyDone', { name: def.name })
  const gates = holdsAll(def.requires, state, content, computeRates(state, content))
  if (!gates) return refuse(content, 'locked', { name: def.name })
  return state.rp >= def.cost ? OK : refuse(content, 'notEnoughRp', { need: fmtNum(def.cost) })
}

export const researchHandlers: Handlers = {
  research: {
    check: (state, content, action) => checkResearch(state, content, action.research),
    run(state, content, action) {
      const def = findResearch(content, action.research)
      if (!def) return state
      return { ...state, rp: Math.max(0, state.rp - def.cost), research: [...state.research, def.id] }
    },
  },
}
