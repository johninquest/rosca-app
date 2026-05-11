import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
 * Export event + contributions to a PDF file.
 * @param {object} event
 * @param {Array} contributions
 */
export function exportPDF(event, contributions) {
  const { title, description, currency, targetAmount } = event
  const total = contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  let y = 30

  if (description) {
    const lines = doc.splitTextToSize(description, 182)
    doc.text(lines, 14, y)
    y += lines.length * 6 + 4
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, y)
  doc.setFont('helvetica', 'normal')
  y += 7

  const summary = [
    ['Currency', currency],
    ['Total Collected', formatAmount(total, currency)],
  ]
  if (targetAmount) {
    summary.push(['Target', formatAmount(targetAmount, currency)])
    summary.push(['Remaining', formatAmount(Math.max(0, targetAmount - total), currency)])
    summary.push(['Progress', `${total > 0 ? Math.round((total / targetAmount) * 100) : 0}%`])
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: summary,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  })

  y = doc.lastAutoTable.finalY + 10

  // Contributions table
  doc.setFont('helvetica', 'bold')
  doc.text('Contributions', 14, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['Contributor', 'Amount', 'Date', 'Note']],
    body: contributions.map((c) => [
      c.contributorName ?? '',
      formatAmount(c.amount, currency),
      formatDate(c.date),
      c.note ?? '',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 26, 26], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 249, 249] },
  })

  doc.save(`${toFilename(title)}-contributions.pdf`)
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
