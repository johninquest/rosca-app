import { describe, expect, it } from 'vitest'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'
import type { Contribution, Cycle, Member, Payout } from '../types'

const cycle: Cycle = {
  id: 'c1',
  name: 'Tontine Famille 2026',
  amountPerPerson: 10000,
  frequency: 'monthly',
  startDate: new Date('2026-01-01'),
  status: 'active',
  memberIds: ['m1', 'm2'],
  payoutOrder: ['m1', 'm2'],
  totalRounds: 12,
  closedRounds: [],
}

const members: Member[] = [
  {
    id: 'm1',
    name: 'Marie',
    phone: '+237699000000',
    joinDate: new Date(),
  },
  {
    id: 'm2',
    name: 'Jean',
    phone: '+237677000000',
    joinDate: new Date(),
  },
]

const contributions: Contribution[] = [
  {
    id: 'k1',
    cycleId: 'c1',
    memberId: 'm1',
    amount: 10000,
    date: new Date('2026-01-02'),
    method: 'cash',
  },
]

const payouts: Payout[] = [
  {
    id: 'p1',
    cycleId: 'c1',
    memberId: 'm1',
    amount: 20000,
    roundNumber: 1,
    date: new Date('2026-01-30'),
  },
]

describe('buildRoscaWhatsAppUrl', () => {
  it('returns a wa.me URL', () => {
    const url = buildRoscaWhatsAppUrl({ cycle, members, contributions, payouts })
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('includes cycle name and round summary', () => {
    const decoded = decodeURIComponent(
      buildRoscaWhatsAppUrl({ cycle, members, contributions, payouts }),
    )

    expect(decoded).toContain('Tontine Famille 2026')
    expect(decoded).toContain('Tours fermes: 0/12')
    expect(decoded).toContain('Contributions par membre')
  })

  it('includes payout block when payout exists', () => {
    const decoded = decodeURIComponent(
      buildRoscaWhatsAppUrl({ cycle, members, contributions, payouts }),
    )

    expect(decoded).toContain('Paiement du tour')
    expect(decoded).toContain('Beneficiaire: Marie')
  })

  it('omits payout block when no payout exists', () => {
    const decoded = decodeURIComponent(
      buildRoscaWhatsAppUrl({ cycle, members, contributions, payouts: [] }),
    )

    expect(decoded).not.toContain('Paiement du tour')
  })
})
