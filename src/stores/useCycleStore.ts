import type { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { pb } from '../services/pocketbase'
import type { Contribution, Cycle, Member, PaymentMethod, Payout } from '../types'

type NewMember = Omit<Member, 'id'>
type NewCycle = Omit<Cycle, 'id' | 'totalRounds' | 'closedRounds'>
type NewContribution = Omit<Contribution, 'id'>
type NewPayout = Omit<Payout, 'id'>

export function mapMember(r: RecordModel): Member {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    joinDate: new Date(r.joinDate),
    owner: typeof r.owner === 'string' ? r.owner : undefined,
  }
}

export function mapCycle(r: RecordModel): Cycle {
  return {
    id: r.id,
    name: r.name,
    amountPerPerson: r.amountPerPerson,
    frequency: 'monthly',
    startDate: new Date(r.startDate),
    endDate: r.endDate ? new Date(r.endDate) : undefined,
    status: r.status,
    owner: typeof r.owner === 'string' ? r.owner : undefined,
    memberIds: r.memberIds,
    payoutOrder: r.payoutOrder,
    defaultPaymentMethod:
      r.defaultPaymentMethod === 'bank_transfer' || r.defaultPaymentMethod === 'mobile_money'
        ? r.defaultPaymentMethod
        : 'cash',
    totalRounds: typeof r.totalRounds === 'number' ? r.totalRounds : 12,
    closedRounds: Array.isArray(r.closedRounds) ? r.closedRounds : [],
  }
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === 'cash' || value === 'bank_transfer' || value === 'mobile_money'
    ? value
    : 'mobile_money'
}

export function mapContribution(r: RecordModel): Contribution {
  return {
    id: r.id,
    cycleId: r.cycleId,
    memberId: r.memberId,
    amount: r.amount,
    date: new Date(r.date),
    roundNumber: r.roundNumber != null ? Number(r.roundNumber) : undefined,
    method: normalizePaymentMethod(r.method),
    notes: r.notes || undefined,
  }
}

export function mapPayout(r: RecordModel): Payout {
  return {
    id: r.id,
    cycleId: r.cycleId,
    memberId: r.memberId,
    amount: r.amount,
    roundNumber: r.roundNumber,
    date: new Date(r.date),
  }
}

interface CycleState {
  cycles: Cycle[]
  members: Member[]
  contributions: Contribution[]
  payouts: Payout[]
  isLoading: boolean
  loadAll: () => Promise<void>
  addMember: (data: NewMember) => Promise<Member>
  deleteMember: (memberId: string) => Promise<void>
  updateMember: (id: string, data: Partial<NewMember>) => Promise<void>
  addCycle: (data: NewCycle) => Promise<void>
  addMemberToCycle: (cycleId: string, memberId: string) => Promise<void>
  addContribution: (data: NewContribution) => Promise<void>
  updateContribution: (id: string, data: Partial<NewContribution>) => Promise<void>
  addPayout: (data: NewPayout) => Promise<void>
  closeRound: (cycleId: string, roundNumber: number) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  deleteCycle: (cycleId: string) => Promise<void>
  getMemberTotal: (memberId: string, cycleId: string) => number
  getCycleTotal: (cycleId: string) => number
}

export const useCycleStore = create<CycleState>((set, get) => ({
  cycles: [],
  members: [],
  contributions: [],
  payouts: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const ownerFilter = `owner = "${pb.authStore.record?.id}"`
      const [memberRecords, cycleRecords, contributionRecords, payoutRecords] = await Promise.all([
        pb
          .collection('rosca_members')
          .getFullList({ sort: 'name', filter: ownerFilter, $autoCancel: false }),
        pb
          .collection('rosca_cycles')
          .getFullList({ sort: '-created', filter: ownerFilter, $autoCancel: false }),
        pb
          .collection('rosca_contributions')
          .getFullList({ sort: '-date', filter: ownerFilter, $autoCancel: false }),
        pb
          .collection('rosca_payouts')
          .getFullList({ sort: '-date', filter: ownerFilter, $autoCancel: false }),
      ])
      set({
        members: memberRecords.map(mapMember),
        cycles: cycleRecords.map(mapCycle),
        contributions: contributionRecords.map(mapContribution),
        payouts: payoutRecords.map(mapPayout),
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  addMember: async (data) => {
    const record = await pb.collection('rosca_members').create({
      name: data.name,
      phone: data.phone,
      joinDate: data.joinDate instanceof Date
        ? data.joinDate.toISOString().split('T')[0]
        : data.joinDate,
      owner: pb.authStore.record?.id,
    })
    const member = mapMember(record)
    set((state) => ({ members: [...state.members, member] }))
    return member
  },

  deleteMember: async (memberId: string) => {
    const state = get()
    const affectedCycles = state.cycles.filter((cycle) => cycle.memberIds.includes(memberId))
    const contributionIds = state.contributions
      .filter((item) => item.memberId === memberId)
      .map((item) => item.id)
    const payoutIds = state.payouts
      .filter((item) => item.memberId === memberId)
      .map((item) => item.id)

    await Promise.all(
      affectedCycles.map((cycle) =>
        pb.collection('rosca_cycles').update(cycle.id, {
          memberIds: cycle.memberIds.filter((id) => id !== memberId),
          payoutOrder: cycle.payoutOrder.filter((id) => id !== memberId),
        }),
      ),
    )
    await Promise.all(contributionIds.map((id) => pb.collection('rosca_contributions').delete(id)))
    await Promise.all(payoutIds.map((id) => pb.collection('rosca_payouts').delete(id)))
    await pb.collection('rosca_members').delete(memberId)

    set((current) => ({
      members: current.members.filter((member) => member.id !== memberId),
      cycles: current.cycles.map((cycle) =>
        cycle.memberIds.includes(memberId)
          ? {
              ...cycle,
              memberIds: cycle.memberIds.filter((id) => id !== memberId),
              payoutOrder: cycle.payoutOrder.filter((id) => id !== memberId),
            }
          : cycle,
      ),
      contributions: current.contributions.filter((item) => item.memberId !== memberId),
      payouts: current.payouts.filter((item) => item.memberId !== memberId),
    }))
  },

  updateMember: async (id, data) => {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.joinDate !== undefined) {
      payload.joinDate = data.joinDate instanceof Date
        ? data.joinDate.toISOString().split('T')[0]
        : data.joinDate
    }

    const record = await pb.collection('rosca_members').update(id, payload)
    const updated = mapMember(record)
    set((state) => ({
      members: state.members.map((member) => (member.id === id ? updated : member)),
    }))
  },

  addCycle: async (data) => {
    const record = await pb.collection('rosca_cycles').create({
      name: data.name,
      amountPerPerson: data.amountPerPerson,
      frequency: data.frequency,
      defaultPaymentMethod: data.defaultPaymentMethod,
      startDate: data.startDate instanceof Date
        ? data.startDate.toISOString().split('T')[0]
        : data.startDate,
      endDate: data.endDate
        ? (data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate)
        : null,
      status: data.status,
      memberIds: data.memberIds,
      payoutOrder: data.payoutOrder,
      totalRounds: 12,
      closedRounds: [],
      owner: pb.authStore.record?.id,
    })
    const cycle = mapCycle(record)
    set((state) => ({ cycles: [cycle, ...state.cycles] }))
  },

  addMemberToCycle: async (cycleId, memberId) => {
    const cycle = get().cycles.find((item) => item.id === cycleId)
    if (!cycle || cycle.memberIds.includes(memberId)) return

    const memberIds = [...cycle.memberIds, memberId]
    const payoutOrder = [...cycle.payoutOrder, memberId]

    const record = await pb.collection('rosca_cycles').update(cycleId, {
      memberIds,
      payoutOrder,
    })

    const updatedCycle = mapCycle(record)
    set((state) => ({
      cycles: state.cycles.map((item) => (item.id === cycleId ? updatedCycle : item)),
    }))
  },

  addContribution: async (data) => {
    const record = await pb.collection('rosca_contributions').create({
      cycleId: data.cycleId,
      memberId: data.memberId,
      amount: data.amount,
      date: data.date instanceof Date
        ? data.date.toISOString().split('T')[0]
        : data.date,
      roundNumber: data.roundNumber,
      method: data.method,
      notes: data.notes ?? '',
      owner: pb.authStore.record?.id,
    })
    const contribution = mapContribution(record)
    set((state) => ({ contributions: [contribution, ...state.contributions] }))
  },

  updateContribution: async (id, data) => {
    const payload: Record<string, unknown> = {}
    if (data.memberId !== undefined) payload.memberId = data.memberId
    if (data.amount !== undefined) payload.amount = data.amount
    if (data.method !== undefined) payload.method = data.method
    if (data.notes !== undefined) payload.notes = data.notes
    if (data.roundNumber !== undefined) payload.roundNumber = data.roundNumber
    if (data.date !== undefined) {
      payload.date = data.date instanceof Date
        ? data.date.toISOString().split('T')[0]
        : data.date
    }

    const record = await pb.collection('rosca_contributions').update(id, payload)
    const updated = mapContribution(record)
    set((state) => ({
      contributions: state.contributions.map((item) => (item.id === id ? updated : item)),
    }))
  },

  addPayout: async (data) => {
    const record = await pb.collection('rosca_payouts').create({
      cycleId: data.cycleId,
      memberId: data.memberId,
      amount: data.amount,
      roundNumber: data.roundNumber,
      date: data.date instanceof Date
        ? data.date.toISOString().split('T')[0]
        : data.date,
      owner: pb.authStore.record?.id,
    })
    const payout = mapPayout(record)
    set((state) => ({ payouts: [payout, ...state.payouts] }))
  },

  closeRound: async (cycleId, roundNumber) => {
    const cycle = get().cycles.find((c) => c.id === cycleId)
    if (!cycle || cycle.closedRounds.includes(roundNumber)) return

    const closedRounds = [...cycle.closedRounds, roundNumber].sort((a, b) => a - b)
    const status = closedRounds.length >= cycle.totalRounds ? 'completed' : cycle.status

    await pb.collection('rosca_cycles').update(cycleId, { closedRounds, status })

    set((state) => ({
      cycles: state.cycles.map((c) =>
        c.id === cycleId ? { ...c, closedRounds, status } : c,
      ),
    }))
  },

  deleteContribution: async (id) => {
    await pb.collection('rosca_contributions').delete(id)
    set((state) => ({
      contributions: state.contributions.filter((c) => c.id !== id),
    }))
  },

  deleteCycle: async (cycleId) => {
    const state = get()
    const contributionIds = state.contributions
      .filter((item) => item.cycleId === cycleId)
      .map((item) => item.id)
    const payoutIds = state.payouts
      .filter((item) => item.cycleId === cycleId)
      .map((item) => item.id)

    await Promise.all(contributionIds.map((id) => pb.collection('rosca_contributions').delete(id)))
    await Promise.all(payoutIds.map((id) => pb.collection('rosca_payouts').delete(id)))
    await pb.collection('rosca_cycles').delete(cycleId)

    set((current) => ({
      cycles: current.cycles.filter((cycle) => cycle.id !== cycleId),
      contributions: current.contributions.filter((item) => item.cycleId !== cycleId),
      payouts: current.payouts.filter((item) => item.cycleId !== cycleId),
    }))
  },

  getMemberTotal: (memberId, cycleId) => {
    return get()
      .contributions.filter((c) => c.memberId === memberId && c.cycleId === cycleId)
      .reduce((sum, c) => sum + c.amount, 0)
  },

  getCycleTotal: (cycleId) => {
    return get()
      .contributions.filter((c) => c.cycleId === cycleId)
      .reduce((sum, c) => sum + c.amount, 0)
  },
}))
