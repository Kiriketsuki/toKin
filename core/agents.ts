// Handlers for the agent actions: create, assign and remove.

import { computeRates, EPSILON, findModel, modsOf } from './economy'
import { fmtNum } from './format'
import { OK, refuse, type Handlers } from './handler'
import { nextIndex } from './rng'
import type { AgentState, ContentPack, GameState, Job, NamePool, Verdict } from './types'

const JOB_NAMES: Readonly<Record<Job, string>> = { earn: 'Earn', research: 'Research', train: 'Train' }

// Draws a first and a last name from the seeded generator. It tries a few
// times to avoid a name that a live agent already holds.
export function drawName(
  rngState: number,
  pool: NamePool,
  taken: readonly string[],
): { readonly name: string; readonly rngState: number } {
  const attempt = (state: number, tries: number): { name: string; rngState: number } => {
    const first = nextIndex(state, pool.first.length)
    const last = nextIndex(first.state, pool.last.length)
    const name = `${pool.first[first.index] ?? 'Agent'} ${pool.last[last.index] ?? ''}`.trim()
    return tries <= 1 || !taken.includes(name) ? { name, rngState: last.state } : attempt(last.state, tries - 1)
  }
  return attempt(rngState, 8)
}

function checkJob(state: GameState, content: ContentPack, job: Job): Verdict {
  return modsOf(state, content).unlockedJobs.has(job) ? OK : refuse(content, 'locked', { name: JOB_NAMES[job] })
}

export const agentHandlers: Handlers = {
  createAgent: {
    check(state, content, action) {
      const model = findModel(content, action.model)
      if (!model) return refuse(content, 'unknownId', { id: action.model })
      if (!state.models.includes(model.id)) return refuse(content, 'locked', { name: model.name })
      const job = checkJob(state, content, action.job)
      if (!job.ok) return job
      const free = computeRates(state, content).free
      if (model.footprint > free + EPSILON) return refuse(content, 'notEnoughCompute', { need: fmtNum(model.footprint) })
      return OK
    },
    run(state, content, action) {
      const drawn = drawName(state.rngState, content.names, state.agents.map((a) => a.name))
      const agent: AgentState = {
        id: `agent-${state.nextAgentId}`,
        name: drawn.name,
        model: action.model,
        job: action.job,
        lifetimeTokens: 0,
      }
      return {
        ...state,
        rngState: drawn.rngState,
        nextAgentId: state.nextAgentId + 1,
        agents: [...state.agents, agent],
      }
    },
  },
  assignAgent: {
    check(state, content, action) {
      const agent = state.agents.find((a) => a.id === action.agent)
      if (!agent) return refuse(content, 'unknownId', { id: action.agent })
      if (agent.job === action.job) return refuse(content, 'alreadyDone', { name: agent.name })
      return checkJob(state, content, action.job)
    },
    run: (state, _content, action) => ({
      ...state,
      agents: state.agents.map((a) => (a.id === action.agent ? { ...a, job: action.job } : a)),
    }),
  },
  removeAgent: {
    check: (state, content, action) =>
      state.agents.some((a) => a.id === action.agent) ? OK : refuse(content, 'unknownId', { id: action.agent }),
    run: (state, _content, action) => ({ ...state, agents: state.agents.filter((a) => a.id !== action.agent) }),
  },
}
