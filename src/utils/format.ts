import type { SyncStatus } from '../db/dexie-schema'

const LOCALE = 'fr-CM'

export function formatAmount(amount: number | null | undefined, currency: 'XAF' | 'USD' | 'EUR' = 'XAF'): string {
  if (amount == null || !Number.isFinite(amount)) return 'N/A'

  if (currency === 'XAF') {
    const formatted = new Intl.NumberFormat(LOCALE, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
    return `${formatted} XAF`
  }

  const formatted = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return formatted
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'N/A'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatSyncStatus(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'Synced'
    case 'pending':
      return 'Pending'
    case 'conflict':
      return 'Conflict'
    default:
      return 'Unknown'
  }
}
