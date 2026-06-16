import { describe, expect, it } from 'vitest'
import { formatAmount, formatDate, todayISO } from '../utils/format'

describe('formatAmount', () => {
  it('formats XAF without decimals', () => {
    expect(formatAmount(1000000, 'XAF')).toContain('1')
    expect(formatAmount(1000000, 'XAF')).toContain('XAF')
  })

  it('returns N/A for invalid values', () => {
    expect(formatAmount(null, 'XAF')).toBe('N/A')
    expect(formatAmount(undefined, 'XAF')).toBe('N/A')
    expect(formatAmount(Number.NaN, 'XAF')).toBe('N/A')
  })
})

describe('todayISO', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDate', () => {
  it('formats valid date as DD/MM/YYYY', () => {
    // Use Date constructor with local time to avoid UTC timezone shift issues
    expect(formatDate(new Date(2026, 4, 12))).toBe('12/05/2026')
  })

  it('formats a Date object as DD/MM/YYYY', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026')
  })

  it('returns N/A for empty value', () => {
    expect(formatDate(undefined)).toBe('N/A')
  })

  it('returns N/A for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('N/A')
  })
})
