import type { Contribution, Cycle, CycleMember, Payout } from '../types'
import { formatAmount } from './format'

interface BuildRoscaWhatsAppInput {
  cycle: Cycle
  members: CycleMember[]
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
  const activeRound = Array.from({ length: cycle.totalRounds }, (_, idx) => idx + 1)
    .find((round) => !cycle.closedRounds.includes(round))

  const memberTotals = members
    .map((member) => {
      const memberTotal = contributions
        .filter((contribution) => contribution.memberId === member.id)
        .reduce((sum, contribution) => sum + contribution.amount, 0)

      return { member, memberTotal }
    })
    .sort((a, b) => b.memberTotal - a.memberTotal)

  const currentPayout = activeRound
    ? payouts.find((payout) => payout.roundNumber === activeRound)
    : undefined
  const payoutMember = currentPayout
    ? members.find((member) => member.id === currentPayout.memberId)
    : null

  let message = `*${cycle.name}*\n\n`
  message += `Frequence: ${cycle.frequency}\n`
  message += `Tours fermes: ${cycle.closedRounds.length}/${cycle.totalRounds}\n`
  if (activeRound) message += `Tour ouvert: ${activeRound}\n`
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
