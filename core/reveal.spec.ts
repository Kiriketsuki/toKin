import { describe, expect, test } from 'bun:test'
import { FIXTURE } from './fixtures'
import { revealNew } from './reveal'
import { step } from './step'
import { started, withState } from './testkit'
import { buildView } from './view'

const racks = (n: number) => ({ 'relay-rack': n, 'valve-bank': 0, 'drum-cabinet': 0, 'core-lattice': 0 })

describe('Reveal', () => {
  test('a revealed item stays visible after cash drops below half its cost', () => {
    const rich = withState(started(), { research: ['valve-logic'], cash: 210 })
    const revealed = revealNew(rich, FIXTURE)
    expect(revealed.revealed).toContain('valve-bank')
    const poor = { ...revealed, cash: 0 }
    const row = buildView(poor, FIXTURE).machines.find((m) => m.id === 'valve-bank')
    expect(row?.isVisible).toBe(true)
  })

  test('step persists a reveal', () => {
    const rich = withState(started(), { research: ['valve-logic'], cash: 210 })
    expect(step(rich, FIXTURE, 1).revealed).toContain('valve-bank')
  })

  test('an item below half its cost stays hidden and the state is unchanged', () => {
    const poor = withState(started(), { research: ['valve-logic'], cash: 1 })
    expect(revealNew(poor, FIXTURE).revealed).not.toContain('valve-bank')
    const once = revealNew(poor, FIXTURE)
    expect(revealNew(once, FIXTURE)).toBe(once)
  })

  test('an owned machine always shows', () => {
    const owned = withState(started(), { machines: { ...racks(0), 'valve-bank': 1 }, cash: 0 })
    expect(buildView(owned, FIXTURE).machines.find((m) => m.id === 'valve-bank')?.isVisible).toBe(true)
  })
})
