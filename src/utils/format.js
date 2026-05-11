/** @type {Record<string, Intl.NumberFormatOptions>} */
const FORMAT_OPTIONS = {
  XAF: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  USD: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  EUR: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
}

const CURRENCY_SUFFIX = {
  XAF: ' XAF',
  USD: ' USD',
  EUR: ' EUR',
}

/**
 * Format a numeric amount for display.
 * @param {number|null|undefined} amount
 * @param {'XAF'|'USD'|'EUR'} currency
 * @returns {string} e.g. "1,000,000.00 XAF"
 */
export function formatAmount(amount, currency) {
  if (amount == null || !Number.isFinite(amount)) return 'N/A'
  const opts = FORMAT_OPTIONS[currency] ?? FORMAT_OPTIONS.XAF
  const formatted = new Intl.NumberFormat('en-US', opts).format(amount)
  return formatted + (CURRENCY_SUFFIX[currency] ?? '')
}

/**
 * Today's date as a YYYY-MM-DD string (for use as HTML date input default).
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Format a Firestore Timestamp or ISO string for display.
 * @param {import('firebase/firestore').Timestamp|string|Date} value
 * @returns {string} e.g. "12 May 2026"
 */
export function formatDate(value) {
  if (!value) return 'N/A'
  let date
  if (value?.toDate) {
    date = value.toDate()
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else {
    date = value
  }
  if (!date || isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
