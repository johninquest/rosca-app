import { formatAmount, formatDate } from './format'

/**
 * Sanitise a string for use in a filename.
 */
function toFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Export contributions to a CSV file.
 * @param {object} event
 * @param {Array} contributions
 */
export function exportCSV(event, contributions) {
  const { title, currency } = event

  const header = ['Contributor Name', 'Amount', 'Currency', 'Date', 'Note']
  const rows = contributions.map((c) => [
    `"${(c.contributorName ?? '').replace(/"/g, '""')}"`,
    c.amount ?? '',
    currency,
    formatDate(c.date),
    `"${(c.note ?? '').replace(/"/g, '""')}"`,
  ])

  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${toFilename(title)}-contributions.csv`
  link.click()
  URL.revokeObjectURL(url)
}
