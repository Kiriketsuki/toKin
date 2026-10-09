// Seeded random numbers for the core. The generator is mulberry32. Its whole
// state is one 32-bit integer that lives in GameState.rngState, so the same
// seed and the same actions replay the same game. The core never calls
// Math.random.

// A draw: a value in [0, 1) and the generator state to carry forward.
export interface Draw {
  readonly value: number
  readonly state: number
}

// Turns any number into a valid generator state.
export function seedToState(seed: number): number {
  return Math.trunc(seed) >>> 0
}

// Draws one value in [0, 1). The input state stays unchanged.
export function nextDraw(state: number): Draw {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = Math.imul(next ^ (next >>> 15), 1 | next)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, state: next }
}

// Draws an integer in [0, size). A size below 1 gives 0.
export function nextIndex(state: number, size: number): { readonly index: number; readonly state: number } {
  const draw = nextDraw(state)
  const index = size < 1 ? 0 : Math.min(size - 1, Math.floor(draw.value * size))
  return { index, state: draw.state }
}
