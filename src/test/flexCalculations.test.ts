import { describe, it, expect } from 'vitest'
import {
  getExpectedContributions,
  getFlexRoundExpectedTotal,
  getMemberExpectedContribution,
  getRoundRecipient,
} from '../utils/flexCalculations'
import type { Cycle, CycleMember, Payout } from '../types'

// Helper to create a minimal cycle object
function createCycle(overrides: Partial<Cycle> = {}): Cycle {
  return {
    id: 'cycle-1',
    name: 'Test Cycle',
    contributionMode: 'flex',
    frequency: 'monthly',
    startDate: new Date('2026-01-01'),
    status: 'active',
    terms: {},
    totalRounds: 3,
    closedRounds: [],
    payoutOrder: [],
    defaultPaymentMethod: 'cash',
    ...overrides,
  }
}

// Helper to create a minimal member object
function createMember(overrides: Partial<CycleMember> = {}): CycleMember {
  return {
    id: 'member-1',
    cycleId: 'cycle-1',
    name: 'Test Member',
    phone: '',
    joinDate: new Date('2026-01-01'),
    contributionAmount: 10,
    ...overrides,
  }
}

// Helper to create a minimal payout object
function createPayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: 'payout-1',
    cycleId: 'cycle-1',
    memberId: 'member-1',
    amount: 100,
    roundNumber: 1,
    date: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('flexCalculations', () => {
  describe('getExpectedContributions', () => {
    it('should return empty array if current recipient not found', () => {
      const cycle = createCycle()
      const members = [createMember({ id: 'member-1', name: 'A', contributionAmount: 10 })]
      const payouts: Payout[] = []

      const result = getExpectedContributions(cycle, members, payouts, 'nonexistent')

      expect(result).toEqual([])
    })

    it('should exclude the current recipient from contributions', () => {
      const cycle = createCycle()
      const members = [
        createMember({ id: 'member-1', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'member-2', name: 'B', contributionAmount: 20 }),
      ]
      const payouts: Payout[] = []

      const result = getExpectedContributions(cycle, members, payouts, 'member-1')

      expect(result).toHaveLength(1)
      expect(result[0].memberId).toBe('member-2')
    })

    it('should exclude deleted members', () => {
      const cycle = createCycle()
      const members = [
        createMember({ id: 'member-1', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'member-2', name: 'B', contributionAmount: 20, deletedAt: new Date() }),
      ]
      const payouts: Payout[] = []

      const result = getExpectedContributions(cycle, members, payouts, 'member-1')

      expect(result).toHaveLength(0)
    })

    describe('first round (no completed recipients)', () => {
      it('everyone pays their own rate', () => {
        const cycle = createCycle({ closedRounds: [] })
        const members = [
          createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
          createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
          createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
        ]
        const payouts: Payout[] = []

        const result = getExpectedContributions(cycle, members, payouts, 'A')

        expect(result).toHaveLength(2)
        expect(result.find((c) => c.memberId === 'B')).toMatchObject({
          expectedAmount: 20,
          isPayback: false,
        })
        expect(result.find((c) => c.memberId === 'C')).toMatchObject({
          expectedAmount: 30,
          isPayback: false,
        })
      })
    })

    describe('middle round (some completed recipients)', () => {
      it('mix of normal contributions and paybacks', () => {
        const cycle = createCycle({ closedRounds: [1] })
        const members = [
          createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
          createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
          createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
        ]
        const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

        // Round 2: B is recipient
        const result = getExpectedContributions(cycle, members, payouts, 'B')

        expect(result).toHaveLength(2)
        
        // A already received, so pays B's rate (20)
        expect(result.find((c) => c.memberId === 'A')).toMatchObject({
          expectedAmount: 20,
          isPayback: true,
        })
        
        // C hasn't received yet, so pays own rate (30)
        expect(result.find((c) => c.memberId === 'C')).toMatchObject({
          expectedAmount: 30,
          isPayback: false,
        })
      })
    })

    describe('last round (all others completed)', () => {
      it('everyone pays the recipient\'s rate', () => {
        const cycle = createCycle({ closedRounds: [1, 2] })
        const members = [
          createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
          createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
          createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
        ]
        const payouts = [
          createPayout({ memberId: 'A', roundNumber: 1 }),
          createPayout({ memberId: 'B', roundNumber: 2 }),
        ]

        // Round 3: C is recipient
        const result = getExpectedContributions(cycle, members, payouts, 'C')

        expect(result).toHaveLength(2)
        
        // A already received, so pays C's rate (30)
        expect(result.find((c) => c.memberId === 'A')).toMatchObject({
          expectedAmount: 30,
          isPayback: true,
        })
        
        // B already received, so pays C's rate (30)
        expect(result.find((c) => c.memberId === 'B')).toMatchObject({
          expectedAmount: 30,
          isPayback: true,
        })
      })
    })

    describe('worked example from spec: Order A → B → C', () => {
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
      ]

      it('Round 1: A receives, B pays 20, C pays 30, total = 50', () => {
        const cycle = createCycle({ closedRounds: [] })
        const payouts: Payout[] = []

        const result = getExpectedContributions(cycle, members, payouts, 'A')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'B')?.expectedAmount).toBe(20)
        expect(result.find((c) => c.memberId === 'C')?.expectedAmount).toBe(30)
        expect(total).toBe(50)
      })

      it('Round 2: B receives, A pays 20 (payback), C pays 30, total = 50', () => {
        const cycle = createCycle({ closedRounds: [1] })
        const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

        const result = getExpectedContributions(cycle, members, payouts, 'B')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'A')?.expectedAmount).toBe(20)
        expect(result.find((c) => c.memberId === 'A')?.isPayback).toBe(true)
        expect(result.find((c) => c.memberId === 'C')?.expectedAmount).toBe(30)
        expect(total).toBe(50)
      })

      it('Round 3: C receives, A pays 30 (payback), B pays 30 (payback), total = 60', () => {
        const cycle = createCycle({ closedRounds: [1, 2] })
        const payouts = [
          createPayout({ memberId: 'A', roundNumber: 1 }),
          createPayout({ memberId: 'B', roundNumber: 2 }),
        ]

        const result = getExpectedContributions(cycle, members, payouts, 'C')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'A')?.expectedAmount).toBe(30)
        expect(result.find((c) => c.memberId === 'A')?.isPayback).toBe(true)
        expect(result.find((c) => c.memberId === 'B')?.expectedAmount).toBe(30)
        expect(result.find((c) => c.memberId === 'B')?.isPayback).toBe(true)
        expect(total).toBe(60)
      })
    })

    describe('worked example from spec: Order C → B → A', () => {
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
      ]

      it('Round 1: C receives, A pays 10, B pays 20, total = 30', () => {
        const cycle = createCycle({ closedRounds: [] })
        const payouts: Payout[] = []

        const result = getExpectedContributions(cycle, members, payouts, 'C')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'A')?.expectedAmount).toBe(10)
        expect(result.find((c) => c.memberId === 'B')?.expectedAmount).toBe(20)
        expect(total).toBe(30)
      })

      it('Round 2: B receives, C pays 20 (payback), A pays 10, total = 30', () => {
        const cycle = createCycle({ closedRounds: [1] })
        const payouts = [createPayout({ memberId: 'C', roundNumber: 1 })]

        const result = getExpectedContributions(cycle, members, payouts, 'B')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'C')?.expectedAmount).toBe(20)
        expect(result.find((c) => c.memberId === 'C')?.isPayback).toBe(true)
        expect(result.find((c) => c.memberId === 'A')?.expectedAmount).toBe(10)
        expect(total).toBe(30)
      })

      it('Round 3: A receives, C pays 10 (payback), B pays 10 (payback), total = 20', () => {
        const cycle = createCycle({ closedRounds: [1, 2] })
        const payouts = [
          createPayout({ memberId: 'C', roundNumber: 1 }),
          createPayout({ memberId: 'B', roundNumber: 2 }),
        ]

        const result = getExpectedContributions(cycle, members, payouts, 'A')
        const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)

        expect(result.find((c) => c.memberId === 'C')?.expectedAmount).toBe(10)
        expect(result.find((c) => c.memberId === 'C')?.isPayback).toBe(true)
        expect(result.find((c) => c.memberId === 'B')?.expectedAmount).toBe(10)
        expect(result.find((c) => c.memberId === 'B')?.isPayback).toBe(true)
        expect(total).toBe(20)
      })
    })
  })

  describe('getFlexRoundExpectedTotal', () => {
    it('should sum all expected contributions', () => {
      const cycle = createCycle({ closedRounds: [1] })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
      ]
      const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

      const total = getFlexRoundExpectedTotal(cycle, members, payouts, 'B')

      expect(total).toBe(50) // A pays 20 (payback) + C pays 30 (own rate)
    })
  })

  describe('getMemberExpectedContribution', () => {
    it('should return null if member is the recipient', () => {
      const cycle = createCycle()
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
      ]
      const payouts: Payout[] = []

      const result = getMemberExpectedContribution(cycle, members, payouts, 'A', 'A')

      expect(result).toBeNull()
    })

    it('should return expected contribution info for a contributor', () => {
      const cycle = createCycle({ closedRounds: [1] })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 10 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 20 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 30 }),
      ]
      const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

      const result = getMemberExpectedContribution(cycle, members, payouts, 'A', 'B')

      expect(result).toMatchObject({
        memberId: 'A',
        expectedAmount: 20,
        isPayback: true,
      })
    })
  })

  describe('getRoundRecipient', () => {
    it('should return payout memberId if payout exists for round', () => {
      const cycle = createCycle()
      const payouts = [createPayout({ memberId: 'member-1', roundNumber: 1 })]

      const result = getRoundRecipient(cycle, payouts, 1)

      expect(result).toBe('member-1')
    })

    it('should fall back to payoutOrder if no payout exists', () => {
      const cycle = createCycle({ payoutOrder: ['member-1', 'member-2', 'member-3'] })
      const payouts: Payout[] = []

      const result = getRoundRecipient(cycle, payouts, 2)

      expect(result).toBe('member-2')
    })

    it('should return null if neither payout nor payoutOrder available', () => {
      const cycle = createCycle({ payoutOrder: [] })
      const payouts: Payout[] = []

      const result = getRoundRecipient(cycle, payouts, 1)

      expect(result).toBeNull()
    })

    it('should prioritize payout over payoutOrder', () => {
      const cycle = createCycle({ payoutOrder: ['member-1', 'member-2'] })
      const payouts = [createPayout({ memberId: 'member-3', roundNumber: 1 })]

      const result = getRoundRecipient(cycle, payouts, 1)

      expect(result).toBe('member-3')
    })
  })

  describe('mid-cycle member additions', () => {
    it('new members added after Round 1 should pay their own rate (not payback)', () => {
      // Scenario: A=15000, B=10000, C=10000. Round 1 closed with A receiving.
      // Then D=10000 and E=10000 are added.
      // Round 2: B is recipient.
      // A should pay 10000 (payback at B's rate)
      // C should pay 10000 (own rate, not yet received)
      // D should pay 10000 (own rate, new member, not yet received)
      // E should pay 10000 (own rate, new member, not yet received)
      const cycle = createCycle({
        closedRounds: [1],
        payoutOrder: ['A', 'B', 'C', 'D', 'E'],
      })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 15000 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 10000 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 10000 }),
        createMember({ id: 'D', name: 'D', contributionAmount: 10000 }),
        createMember({ id: 'E', name: 'E', contributionAmount: 10000 }),
      ]
      const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

      const result = getExpectedContributions(cycle, members, payouts, 'B')

      // A already received payout in Round 1, so pays B's rate (10000) as payback
      expect(result.find((c) => c.memberId === 'A')).toMatchObject({
        expectedAmount: 10000,
        isPayback: true,
      })

      // C has NOT received a payout, so pays own rate (10000)
      expect(result.find((c) => c.memberId === 'C')).toMatchObject({
        expectedAmount: 10000,
        isPayback: false,
      })

      // D is a new member, has NOT received a payout, so pays own rate (10000)
      expect(result.find((c) => c.memberId === 'D')).toMatchObject({
        expectedAmount: 10000,
        isPayback: false,
      })

      // E is a new member, has NOT received a payout, so pays own rate (10000)
      expect(result.find((c) => c.memberId === 'E')).toMatchObject({
        expectedAmount: 10000,
        isPayback: false,
      })

      // Total: A(10000) + C(10000) + D(10000) + E(10000) = 40000
      const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)
      expect(total).toBe(40000)
    })

    it('new members should NOT be treated as payback even if added after a closed round', () => {
      // Edge case: ensure new members are never incorrectly classified as payback
      const cycle = createCycle({
        closedRounds: [1, 2],
        payoutOrder: ['A', 'B', 'C', 'D'],
      })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 15000 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 10000 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 10000 }),
        createMember({ id: 'D', name: 'D', contributionAmount: 10000 }),
      ]
      const payouts = [
        createPayout({ memberId: 'A', roundNumber: 1 }),
        createPayout({ memberId: 'B', roundNumber: 2 }),
      ]

      // Round 3: C is recipient
      const result = getExpectedContributions(cycle, members, payouts, 'C')

      // A already received, pays C's rate (10000) as payback
      expect(result.find((c) => c.memberId === 'A')).toMatchObject({
        expectedAmount: 10000,
        isPayback: true,
      })

      // B already received, pays C's rate (10000) as payback
      expect(result.find((c) => c.memberId === 'B')).toMatchObject({
        expectedAmount: 10000,
        isPayback: true,
      })

      // D is a new member, has NOT received a payout, so pays own rate (10000)
      expect(result.find((c) => c.memberId === 'D')).toMatchObject({
        expectedAmount: 10000,
        isPayback: false,
      })
    })

    it('should handle soft-deleted payouts correctly (not count as received)', () => {
      const cycle = createCycle({
        closedRounds: [1],
        payoutOrder: ['A', 'B', 'C'],
      })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 15000 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 10000 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 10000 }),
      ]
      // Payout for A exists but is soft-deleted
      const payouts = [
        createPayout({ memberId: 'A', roundNumber: 1, deletedAt: new Date() }),
      ]

      // Round 2: B is recipient
      const result = getExpectedContributions(cycle, members, payouts, 'B')

      // A's payout was soft-deleted, so A should NOT be treated as payback
      expect(result.find((c) => c.memberId === 'A')).toMatchObject({
        expectedAmount: 15000,
        isPayback: false,
      })

      // C has not received, pays own rate
      expect(result.find((c) => c.memberId === 'C')).toMatchObject({
        expectedAmount: 10000,
        isPayback: false,
      })
    })

    it('should correctly calculate totals with mixed old and new members', () => {
      const cycle = createCycle({
        closedRounds: [1],
        payoutOrder: ['A', 'B', 'C', 'D', 'E'],
      })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 15000 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 10000 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 10000 }),
        createMember({ id: 'D', name: 'D', contributionAmount: 10000 }),
        createMember({ id: 'E', name: 'E', contributionAmount: 10000 }),
      ]
      const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

      // Round 2: B is recipient
      const total = getFlexRoundExpectedTotal(cycle, members, payouts, 'B')

      // A(10000 payback) + C(10000 own) + D(10000 own) + E(10000 own) = 40000
      expect(total).toBe(40000)
    })

    it('new member with different contribution amount should pay their own rate', () => {
      // New member joins with a higher contribution amount
      const cycle = createCycle({
        closedRounds: [1],
        payoutOrder: ['A', 'B', 'C', 'D'],
      })
      const members = [
        createMember({ id: 'A', name: 'A', contributionAmount: 15000 }),
        createMember({ id: 'B', name: 'B', contributionAmount: 10000 }),
        createMember({ id: 'C', name: 'C', contributionAmount: 10000 }),
        createMember({ id: 'D', name: 'D', contributionAmount: 20000 }),
      ]
      const payouts = [createPayout({ memberId: 'A', roundNumber: 1 })]

      // Round 2: B is recipient
      const result = getExpectedContributions(cycle, members, payouts, 'B')

      // D is new, pays own rate (20000), NOT payback
      expect(result.find((c) => c.memberId === 'D')).toMatchObject({
        expectedAmount: 20000,
        isPayback: false,
      })

      // Total: A(10000 payback at B's rate) + C(10000 own) + D(20000 own) = 40000
      const total = result.reduce((sum, c) => sum + c.expectedAmount, 0)
      expect(total).toBe(40000)
    })
  })
})
