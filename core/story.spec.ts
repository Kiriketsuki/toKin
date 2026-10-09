import { describe, expect, test } from 'bun:test'
import { apply } from './actions'
import { FIXTURE } from './fixtures'
import { advanceStory, newBeats } from './story'
import { started, play, repeat, tick, withState } from './testkit'

describe('Story beats', () => {
  test('a beat fires when its trigger holds and logs its text', () => {
    const s = play(started(), repeat({ type: 'work' }, 10))
    expect(s.story).toContain('first-ten')
    expect(s.log.map((l) => l.text)).toContain('the numbers add up. they always do, eventually.')
  })

  test('a beat does not fire before its trigger', () => {
    const s = play(started(), repeat({ type: 'work' }, 9))
    expect(s.story).not.toContain('first-ten')
  })

  test('a beat fires once', () => {
    const s = play(started(), repeat({ type: 'work' }, 25))
    expect(s.story.filter((id) => id === 'first-ten')).toHaveLength(1)
    const lines = s.log.filter((l) => l.text.startsWith('the numbers add up'))
    expect(lines).toHaveLength(1)
    expect(tick(s, 5).story.filter((id) => id === 'first-ten')).toHaveLength(1)
  })

  test('advanceStory returns the same object when nothing is due', () => {
    const s = started()
    expect(advanceStory(s, FIXTURE)).toBe(s)
  })

  test('a beat with a year moves the year forward', () => {
    const s = withState(started(), { cash: 100 })
    const bought = apply(s, FIXTURE, { type: 'buyMachine', machine: 'relay-rack' })
    expect(bought.year).toBe(1953)
    expect(bought.story).toContain('first-rack')
  })

  test('the year never moves back', () => {
    const s = withState(started(), { cash: 100, year: 1960 })
    expect(apply(s, FIXTURE, { type: 'buyMachine', machine: 'relay-rack' }).year).toBe(1960)
  })

  test('newBeats lists the beats that fired between two states', () => {
    const before = started()
    const after = play(before, repeat({ type: 'work' }, 10))
    expect(newBeats(before, after)).toEqual(after.story.filter((id) => !before.story.includes(id)))
    expect(newBeats(after, after)).toEqual([])
  })

  test('a beat survives Distill and does not fire again', () => {
    const s = withState(started(), { story: ['first-ten'], research: ['distillation'], lifetimeTokens: 10000 })
    const d = apply(s, FIXTURE, { type: 'distill' })
    expect(d.story.filter((id) => id === 'first-ten')).toHaveLength(1)
  })
})

describe('Story placeholders', () => {
  const content = {
    ...FIXTURE,
    story: FIXTURE.story.map((b) =>
      b.id === 'first-agent' ? { ...b, text: '{agent} takes the next ledger.' } : b,
    ),
  }

  test('the first-agent beat logs the agent name and no placeholder', () => {
    const s = withState(started(), { cash: 100 })
    const bought = apply(s, content, { type: 'buyMachine', machine: 'relay-rack' })
    const made = apply(bought, content, { type: 'createAgent', model: 'kin-0.1', job: 'earn' })
    expect(made.story).toContain('first-agent')
    const text = made.log.map((l) => l.text).join('\n')
    expect(text).toContain(`${(made.agents[0]?.name ?? '')} takes the next ledger.`)
    expect(text).not.toContain('{')
  })
})
