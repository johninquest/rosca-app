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
  it('formats valid date string', () => {
    expect(formatDate('2026-05-12')).toMatch(/2026/)
  })

  it('returns N/A for empty value', () => {
    expect(formatDate(undefined)).toBe('N/A')
  })
})
