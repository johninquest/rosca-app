import { formatDate } from './format'

/**
 * Format an amount for WhatsApp: no decimals, thin-space thousands separator.
 * @param {number|null|undefined} amount
 * @param {string} currency
 * @returns {string} e.g. "500 000 XAF"
 */
function formatAmountWA(amount, currency) {
  if (amount == null || !Number.isFinite(amount)) return 'N/A'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/,/g, '\u202F')
  return `${formatted} ${currency}`
}

/**
 * Build the pre-filled WhatsApp message for an event.
 * @param {object} event - Event document data
 * @param {Array} contributions - Array of contribution documents
 * @param {string} _eventUrl - Unused (reserved for future use)
 * @returns {string} WhatsApp wa.me URL
 */
export function buildWhatsAppUrl(event, contributions, _eventUrl) {
  const { title, currency, targetAmount, deadline } = event

  const total = contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const hasTarget = targetAmount != null && targetAmount > 0

  let msg = `*${title}*\n\n`

  if (hasTarget) {
    msg += `Target: ${formatAmountWA(targetAmount, currency)}\n`
  }
  msg += `Collected: ${formatAmountWA(total, currency)}\n`
  if (deadline) {
    msg += `Deadline: ${formatDate(deadline)}\n`
  }

  if (contributions.length > 0) {
    const sorted = [...contributions]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0)
        const db = b.date ? new Date(b.date) : new Date(0)
        return db - da
      })
      .slice(0, 5)

    msg += `\nContributions:\n`
    sorted.forEach((c) => {
      msg += `• ${c.contributorName} – ${formatAmountWA(c.amount, currency)}\n`
    })
  }

  msg += `\nThank you all for your contributions!`

  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}
