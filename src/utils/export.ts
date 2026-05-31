import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Contribution, Cycle, Member } from '../types'
import { formatAmount, formatDate } from './format'

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function exportCycleContributionsCSV(
  cycle: Cycle,
  members: Member[],
  contributions: Contribution[],
): void {
  const memberMap = new Map(members.map((member) => [member.id, member]))

  const header = ['Cycle', 'Member', 'Phone', 'Amount (XAF)', 'Method', 'Date', 'Notes']
  const rows = contributions.map((contribution) => {
    const member = memberMap.get(contribution.memberId)
    return [
      cycle.name,
      member?.name || 'Unknown',
      member?.phone || '',
      String(contribution.amount),
      contribution.method,
      formatDate(contribution.date),
      (contribution.notes || '').replaceAll('"', '""'),
    ]
  })

  const csv = [header.join(','), ...rows.map((row) => row.map((item) => `"${item}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilename(cycle.name)}-contributions.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportCycleContributionsPDF(
  cycle: Cycle,
  members: Member[],
  contributions: Contribution[],
): void {
  const memberMap = new Map(members.map((member) => [member.id, member]))
  const total = contributions.reduce((sum, contribution) => sum + contribution.amount, 0)

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Tontine - ${cycle.name}`, 14, 18)

  doc.setFontSize(11)
  doc.text(`Frequence: ${cycle.frequency}`, 14, 26)
  doc.text(`Tour actuel: ${cycle.currentRound}`, 14, 32)
  doc.text(`Total collecte: ${formatAmount(total, 'XAF')}`, 14, 38)

  autoTable(doc, {
    startY: 45,
    head: [['Membre', 'Telephone', 'Montant', 'Methode', 'Date', 'Note']],
    body: contributions.map((contribution) => {
      const member = memberMap.get(contribution.memberId)
      return [
        member?.name || 'Unknown',
        member?.phone || '',
        formatAmount(contribution.amount, 'XAF'),
        contribution.method,
        formatDate(contribution.date),
        contribution.notes || '',
      ]
    }),
    styles: { fontSize: 9 },
  })

  doc.save(`${safeFilename(cycle.name)}-contributions.pdf`)
}
