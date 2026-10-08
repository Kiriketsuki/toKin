// The action dispatcher. check says whether an action can run, apply runs
// it, and attempt does both for a host. A refused action returns the same
// state object, so "nothing changes" is a reference check.
//
// Each action type has a handler. Training, research, Distill and the shop
// add their handlers to HANDLERS when their modules land.

import { agentHandlers } from './agents'
import { distillHandlers } from './distill'
import { EPSILON, findContract, handWorkCash, isMachineUnlocked, machineCost, modsOf, ownedMachines } from './economy'
import { fill, fmtMoney } from './format'
import { OK, refuse, type Handler, type Handlers } from './handler'
import { revealNew } from './reveal'
import { advanceStory } from './story'
import { researchHandlers } from './research'
import { shopHandlers } from './shop'
import { withLog } from './state'
import { trainingHandlers } from './training'
import type { Action, ActionType, ContentPack, GameState, Verdict } from './types'

const coreHandlers: Handlers = {
  nameFounder: {
    check(state, content, action) {
      if (state.founder !== null) return refuse(content, 'alreadyDone', { name: state.founder })
      return action.name.trim() === '' ? refuse(content, 'needsFounder') : OK
    },
    run(state, content, action) {
      const name = action.name.trim()
      const named = { ...state, founder: name }
      return withLog(named, content, fill(content.text.founderNamed, { name, year: named.year }))
    },
  },
  work: {
    check: () => OK,
    run: (state, content) => {
      const tokens = content.balance.handWorkTokens
      return {
        ...state,
        cash: state.cash + handWorkCash(content),
        runTokens: state.runTokens + tokens,
        lifetimeTokens: state.lifetimeTokens + tokens,
        stats: { ...state.stats, workPresses: state.stats.workPresses + 1 },
      }
    },
  },
  buyMachine: {
    check(state, content, action) {
      const def = content.machines.find((m) => m.id === action.machine)
      if (!def) return refuse(content, 'unknownId', { id: action.machine })
      const mods = modsOf(state, content)
      if (!isMachineUnlocked(def, mods)) return refuse(content, 'locked', { name: def.name })
      const cost = machineCost(def, ownedMachines(state, def.id), mods)
      return state.cash + EPSILON >= cost ? OK : refuse(content, 'notEnoughCash', { need: fmtMoney(cost) })
    },
    run(state, content, action) {
      const def = content.machines.find((m) => m.id === action.machine)
      if (!def) return state
      const owned = ownedMachines(state, def.id)
      const cost = machineCost(def, owned, modsOf(state, content))
      return {
        ...state,
        cash: Math.max(0, state.cash - cost),
        machines: { ...state.machines, [def.id]: owned + 1 },
      }
    },
  },
  pickContract: {
    check(state, content, action) {
      const def = findContract(content, action.contract)
      if (!def) return refuse(content, 'unknownId', { id: action.contract })
      return state.contractPick === def.id ? refuse(content, 'alreadyDone', { name: def.name }) : OK
    },
    run: (state, _content, action) => ({ ...state, contractPick: action.contract }),
  },
  ...agentHandlers,
}

// Later modules merge their handlers here.
export const HANDLERS: Handlers = {
  ...coreHandlers,
  ...trainingHandlers,
  ...researchHandlers,
  ...distillHandlers,
  ...shopHandlers,
}

function handlerFor(type: ActionType): Handler | undefined {
  return HANDLERS[type] as Handler | undefined
}

export function check(state: GameState, content: ContentPack, action: Action): Verdict {
  const handler = handlerFor(action.type)
  if (!handler) return refuse(content, 'locked', { name: action.type })
  if (state.founder === null && action.type !== 'nameFounder') return refuse(content, 'needsFounder')
  return handler.check(state, content, action)
}

// Runs the action when check allows it. A refusal returns the input object.
export function apply(state: GameState, content: ContentPack, action: Action): GameState {
  return attempt(state, content, action).state
}

export interface Attempt {
  readonly state: GameState
  readonly verdict: Verdict
}

// check and apply in one pass, so a host gets the refusal text too.
export function attempt(state: GameState, content: ContentPack, action: Action): Attempt {
  const verdict = check(state, content, action)
  const handler = handlerFor(action.type)
  if (!verdict.ok || !handler) return { state, verdict }
  return { state: revealNew(advanceStory(handler.run(state, content, action), content), content), verdict }
}
