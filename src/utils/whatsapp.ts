import type { Contribution, Cycle, Member, Payout } from '../types'
import { formatAmount } from './format'

interface BuildRoscaWhatsAppInput {
  cycle: Cycle
  members: Member[]
  contributions: Contribution[]
  payouts?: Payout[]
}

export function buildRoscaWhatsAppUrl({
  cycle,
  members,
  contributions,
  payouts = [],
}: BuildRoscaWhatsAppInput): string {
  const total = contributions.reduce((sum, item) => sum + item.amount, 0)

  const memberTotals = members
    .map((member) => {
      const memberTotal = contributions
        .filter((contribution) => contribution.memberId === member.id)
        .reduce((sum, contribution) => sum + contribution.amount, 0)

      return { member, memberTotal }
    })
    .sort((a, b) => b.memberTotal - a.memberTotal)

  const currentPayout = payouts.find((payout) => payout.roundNumber === cycle.currentRound)
  const payoutMember = currentPayout
    ? members.find((member) => member.id === currentPayout.memberId)
    : null

  let message = `*${cycle.name}*\n\n`
  message += `Frequence: ${cycle.frequency}\n`
  message += `Tour actuel: ${cycle.currentRound}\n`
  message += `Total collecte: ${formatAmount(total, 'XAF')}\n\n`

  message += '*Contributions par membre*\n'
  memberTotals.forEach(({ member, memberTotal }) => {
    message += `• ${member.name}: ${formatAmount(memberTotal, 'XAF')}\n`
  })

  if (payoutMember) {
    message += `\n*Paiement du tour*\n`
    message += `Beneficiaire: ${payoutMember.name}\n`
    message += `Montant: ${formatAmount(currentPayout!.amount, 'XAF')}\n`
  }

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
