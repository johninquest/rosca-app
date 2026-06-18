import type { Cycle, CycleMember, Payout } from '../types'

/**
 * Information about a member's expected contribution for a specific round
 */
export interface FlexContributionInfo {
  memberId: string
  expectedAmount: number
  isPayback: boolean
  recipientName?: string // Name of the current round's recipient (for payback context)
}

/**
 * Calculate expected contributions for all members in a given round.
 * 
 * Core rule from the spec:
 * - If member has NOT yet received a payout: they pay their own fixed_amount (X_j)
 * - If member HAS already received a payout: they pay the current recipient's fixed_amount (X_k)
 * 
 * This ensures pairwise fairness: whichever of two members receives first sets the rate,
 * and the other pays back exactly that rate when their turn comes.
 * 
 * @param cycle - The cycle object
 * @param members - All active members in the cycle
 * @param payouts - All payouts for this cycle
 * @param currentRecipientId - The member ID receiving the payout this round
 * @returns Array of expected contribution info for each contributing member
 */
export function getExpectedContributions(
  cycle: Cycle,
  members: CycleMember[],
  payouts: Payout[],
  currentRecipientId: string
): FlexContributionInfo[] {
  // Build set of members who have already received a payout
  // (payouts whose roundNumber is in cycle.closedRounds)
  const completedRecipients = new Set<string>()
  payouts.forEach((payout) => {
    if (cycle.closedRounds.includes(payout.roundNumber)) {
      completedRecipients.add(payout.memberId)
    }
  })

  // Find the current recipient to get their contribution amount
  const currentRecipient = members.find((m) => m.id === currentRecipientId)
  if (!currentRecipient) {
    console.warn(`Current recipient ${currentRecipientId} not found in members list`)
    return []
  }

  const contributions: FlexContributionInfo[] = []

  members.forEach((member) => {
    // Recipients don't contribute to their own round
    if (member.id === currentRecipientId) {
      return
    }

    // Skip deleted members
    if (member.deletedAt) {
      return
    }

    const isPayback = completedRecipients.has(member.id)
    const expectedAmount = isPayback
      ? currentRecipient.contributionAmount // Pay back at recipient's rate
      : member.contributionAmount // Pay own rate

    contributions.push({
      memberId: member.id,
      expectedAmount,
      isPayback,
      recipientName: currentRecipient.name,
    })
  })

  return contributions
}

/**
 * Calculate the expected total for a round in flex mode.
 * 
 * Formula from spec:
 * round_total(k) = sum(X_j for j not yet received) + X_k * (count of members already received)
 * 
 * @param cycle - The cycle object
 * @param members - All active members in the cycle
 * @param payouts - All payouts for this cycle
 * @param currentRecipientId - The member ID receiving the payout this round
 * @returns The expected total amount for this round
 */
export function getFlexRoundExpectedTotal(
  cycle: Cycle,
  members: CycleMember[],
  payouts: Payout[],
  currentRecipientId: string
): number {
  const contributions = getExpectedContributions(cycle, members, payouts, currentRecipientId)
  return contributions.reduce((sum, c) => sum + c.expectedAmount, 0)
}

/**
 * Get expected contribution info for a specific member in a specific round.
 * 
 * @param cycle - The cycle object
 * @param members - All active members in the cycle
 * @param payouts - All payouts for this cycle
 * @param memberId - The member ID to get info for
 * @param currentRecipientId - The member ID receiving the payout this round
 * @returns Expected contribution info, or null if member is the recipient
 */
export function getMemberExpectedContribution(
  cycle: Cycle,
  members: CycleMember[],
  payouts: Payout[],
  memberId: string,
  currentRecipientId: string
): FlexContributionInfo | null {
  const contributions = getExpectedContributions(cycle, members, payouts, currentRecipientId)
  return contributions.find((c) => c.memberId === memberId) ?? null
}

/**
 * Determine the recipient for a given round number.
 * 
 * Priority:
 * 1. If a payout exists for this round, use payout.memberId
 * 2. Otherwise, use payoutOrder[roundNumber - 1] if available
 * 3. Otherwise, return null
 * 
 * @param cycle - The cycle object
 * @param payouts - All payouts for this cycle
 * @param roundNumber - The round number (1-indexed)
 * @returns The recipient member ID, or null if cannot be determined
 */
export function getRoundRecipient(
  cycle: Cycle,
  payouts: Payout[],
  roundNumber: number
): string | null {
  // Check if there's a payout for this round
  const payout = payouts.find((p) => p.roundNumber === roundNumber)
  if (payout) {
    return payout.memberId
  }

  // Fall back to payoutOrder (0-indexed, so roundNumber - 1)
  if (cycle.payoutOrder && cycle.payoutOrder.length >= roundNumber) {
    return cycle.payoutOrder[roundNumber - 1]
  }

  return null
}
