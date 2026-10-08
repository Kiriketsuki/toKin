// The Logits shop. Logits are the prestige currency that Distill pays out.
// A level costs Logits from a content curve. Most items act at once through
// modsOf. Warm Start also tops up machines, and Distill reads the keep lists
// through the helpers below.

import { shopLevel } from './economy'
import { fmtNum } from './format'
import { OK, refuse, type Handlers } from './handler'
import type { ContentPack, GameState, ModelId, ResearchId, ShopDef, Verdict } from './types'

// The highest level of an item. A table cost sets its own limit.
export function shopMaxLevel(def: ShopDef): number | null {
  const limit = def.cost.kind === 'table' ? def.cost.values.length : null
  if (limit === null) return def.maxLevel
  return def.maxLevel === null ? limit : Math.min(limit, def.maxLevel)
}

// The Logits price of the next level, or null at the max level.
export function shopCost(def: ShopDef, level: number): number | null {
  const max = shopMaxLevel(def)
  if (max !== null && level >= max) return null
  if (def.cost.kind === 'table') return def.cost.values[level] ?? null
  return Math.ceil(def.cost.base * def.cost.ratio ** level)
}

export function findShop(content: ContentPack, id: string): ShopDef | undefined {
  return content.shop.find((s) => s.id === id)
}

function checkBuy(state: GameState, content: ContentPack, id: string): Verdict {
  const def = findShop(content, id)
  if (!def) return refuse(content, 'unknownId', { id })
  const cost = shopCost(def, shopLevel(state, def.id))
  if (cost === null) return refuse(content, 'maxLevel', { name: def.name })
  return state.logits >= cost ? OK : refuse(content, 'notEnoughLogits', { need: fmtNum(cost) })
}

// Raises every start machine up to the level of Warm Start. It never lowers
// a count, so the player keeps machines bought above the Warm Start grant.
export function applyWarmStart(state: GameState, content: ContentPack): GameState {
  const machines = content.shop.reduce<Readonly<Record<string, number>>>((acc, def) => {
    const level = shopLevel(state, def.id)
    if (def.effect.kind !== 'startMachines' || level <= 0) return acc
    const grant = def.effect.perLevel[Math.min(level, def.effect.perLevel.length) - 1] ?? 0
    return { ...acc, [def.effect.machine]: Math.max(acc[def.effect.machine] ?? 0, grant) }
  }, state.machines)
  return { ...state, machines }
}

// Models that Hand-me-down keeps at the current levels, in content order.
export function keptModels(state: GameState, content: ContentPack): readonly ModelId[] {
  return content.shop.flatMap((def) => {
    const level = shopLevel(state, def.id)
    if (def.effect.kind !== 'keepModels' || level <= 0) return []
    return def.effect.perLevel[Math.min(level, def.effect.perLevel.length) - 1] ?? []
  })
}

// Research that Old Notes keeps at the current levels.
export function keptResearch(state: GameState, content: ContentPack): readonly ResearchId[] {
  return content.shop.flatMap((def) =>
    def.effect.kind === 'keepResearch' && shopLevel(state, def.id) > 0 ? def.effect.research : [],
  )
}

export const shopHandlers: Handlers = {
  buyShop: {
    check: (state, content, action) => checkBuy(state, content, action.item),
    run(state, content, action) {
      const def = findShop(content, action.item)
      if (!def) return state
      const level = shopLevel(state, def.id)
      const cost = shopCost(def, level) ?? 0
      const bought = {
        ...state,
        logits: state.logits - cost,
        shop: { ...state.shop, [def.id]: level + 1 },
      }
      return applyWarmStart(bought, content)
    },
  },
}
