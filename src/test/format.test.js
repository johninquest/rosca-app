import { describe, it, expect } from 'vitest'
import { formatAmount, formatDate, todayISO } from '../utils/format'

describe('formatAmount', () => {
  it('formats XAF amounts with 2 decimal places and suffix', () => {
    expect(formatAmount(1000000, 'XAF')).toBe('1,000,000.00 XAF')
  })

  it('formats USD amounts correctly', () => {
    expect(formatAmount(1500.5, 'USD')).toBe('1,500.50 USD')
  })

  it('formats EUR amounts correctly', () => {
    expect(formatAmount(250, 'EUR')).toBe('250.00 EUR')
  })

  it('returns N/A for null', () => {
    expect(formatAmount(null, 'XAF')).toBe('N/A')
  })

  it('returns N/A for undefined', () => {
    expect(formatAmount(undefined, 'XAF')).toBe('N/A')
  })

  it('returns N/A for NaN', () => {
    expect(formatAmount(NaN, 'XAF')).toBe('N/A')
  })

  it('formats zero correctly', () => {
    expect(formatAmount(0, 'XAF')).toBe('0.00 XAF')
  })
})

describe('todayISO', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = todayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns today\'s date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(todayISO()).toBe(today)
  })
})

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string', () => {
    const result = formatDate('2026-05-12')
    expect(result).toBe('12 May 2026')
  })

  it('returns N/A for null', () => {
    expect(formatDate(null)).toBe('N/A')
  })

  it('returns N/A for undefined', () => {
    expect(formatDate(undefined)).toBe('N/A')
  })
})
