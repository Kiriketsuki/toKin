import { describe, expect, test } from 'bun:test'
import { fill, fmtCompute, fmtDollars, fmtDuration, fmtMoney, fmtNum, fmtPercent, fmtRate } from './format'

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

  test('fmtNum covers the large suffixes and the 100 boundary', () => {
    expect(fmtNum(3_400_000_000)).toBe('3.4B')
    expect(fmtNum(1.2e12)).toBe('1.2T')
    expect(fmtNum(999)).toBe('999')
    expect(fmtNum(123.456)).toBe('123.5')
    expect(fmtNum(0)).toBe('0')
  })

  test('fmtDollars, fmtRate, fmtCompute and fmtPercent', () => {
    expect(fmtDollars(0.5)).toBe('$0.50')
    expect(fmtDollars(-3)).toBe('-$3.00')
    expect(fmtDollars(12_000)).toBe('$12k')
    expect(fmtRate(1500)).toBe('1.5k/s')
    expect(fmtCompute(12, 'kFLOP/s')).toBe('12 kFLOP/s')
    expect(fmtPercent(0.1)).toBe('10%')
    expect(fmtPercent(0.125)).toBe('12.5%')
  })

  test('fmtDuration rounds and clamps', () => {
    expect(fmtDuration(-5)).toBe('0s')
    expect(fmtDuration(59.6)).toBe('1m 0s')
  })
})
