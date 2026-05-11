import { formatAmount, formatDate } from './format'

/**
 * Build the pre-filled WhatsApp message for an event.
 * @param {object} event - Firestore event document data
 * @param {Array} contributions - Array of contribution documents
 * @param {string} eventUrl - Full public URL for the event
 * @returns {string} WhatsApp wa.me URL
 */
export function buildWhatsAppUrl(event, contributions, eventUrl) {
  const { title, currency, targetAmount } = event

  const total = contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const formattedTotal = formatAmount(total, currency)
  const hasTarget = targetAmount != null && targetAmount > 0

  const recent = [...contributions]
    .sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0)
      const db_ = b.date ? new Date(b.date) : new Date(0)
      return db_ - da
    })
    .slice(0, 5)

  let msg = `🙏 *Family Contribution Update*\n\n`
  msg += `📋 *Event:* ${title}\n`

  if (hasTarget) {
    const remaining = Math.max(0, targetAmount - total)
    const pct = total > 0 ? Math.round((total / targetAmount) * 100) : 0
    msg += `💰 *Target:* ${formatAmount(targetAmount, currency)}\n`
    msg += `✅ *Collected:* ${formattedTotal}\n`
    msg += `⏳ *Remaining:* ${formatAmount(remaining, currency)}\n`
    msg += `📊 *Progress:* ${pct}%\n`
  } else {
    msg += `✅ *Collected:* ${formattedTotal}\n`
  }

  if (recent.length > 0) {
    msg += `\n👥 *Recent contributions:*\n`
    recent.forEach((c) => {
      msg += `• ${c.contributorName} — ${formatAmount(c.amount, currency)} (${formatDate(c.date)})\n`
    })
  }

  msg += `\n🔗 View full details: ${eventUrl}\n`
  msg += `\nThank you all for your generosity 🙏`

  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}
