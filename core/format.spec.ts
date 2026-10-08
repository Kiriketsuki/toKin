import { describe, expect, test } from 'bun:test'
import { fill, fmtDuration, fmtMoney, fmtNum } from './format'

describe('format', () => {
  test('fmtNum trims and abbreviates', () => {
    expect(fmtNum(4)).toBe('4')
    expect(fmtNum(28.25)).toBe('28.25')
    expect(fmtNum(3.5)).toBe('3.5')
    expect(fmtNum(1500)).toBe('1.5k')
    expect(fmtNum(2_400_000)).toBe('2.4M')
    expect(fmtNum(-12.5)).toBe('-12.5')
    expect(fmtNum(Number.NaN)).toBe('0')
  })

  test('fmtMoney keeps two decimals under 1000', () => {
    expect(fmtMoney(5)).toBe('5.00')
    expect(fmtMoney(28.25)).toBe('28.25')
    expect(fmtMoney(6000)).toBe('6k')
  })

  test('fmtDuration', () => {
    expect(fmtDuration(45)).toBe('45s')
    expect(fmtDuration(200)).toBe('3m 20s')
    expect(fmtDuration(7500)).toBe('2h 5m')
  })

  test('fill replaces known placeholders and keeps unknown ones', () => {
    expect(fill('hi {name}, {x}', { name: 'Ada' })).toBe('hi Ada, {x}')
  })
})
