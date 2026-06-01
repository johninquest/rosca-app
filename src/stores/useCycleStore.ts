import type { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { pb } from '../services/pocketbase'
import type { Contribution, Cycle, Member, Payout } from '../types'

type NewMember = Omit<Member, 'id'>
type NewCycle = Omit<Cycle, 'id' | 'currentRound'>
type NewContribution = Omit<Contribution, 'id'>
type NewPayout = Omit<Payout, 'id'>

export function mapMember(r: RecordModel): Member {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    joinDate: new Date(r.joinDate),
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
    memberIds: r.memberIds,
    payoutOrder: r.payoutOrder,
    currentRound: r.currentRound,
  }
}

export function mapContribution(r: RecordModel): Contribution {
  return {
    id: r.id,
    cycleId: r.cycleId,
    memberId: r.memberId,
    amount: r.amount,
    date: new Date(r.date),
    roundNumber: r.roundNumber ?? undefined,
    method: r.method,
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
  updateMember: (id: string, data: Partial<NewMember>) => Promise<void>
  addCycle: (data: NewCycle) => Promise<void>
  addMemberToCycle: (cycleId: string, memberId: string) => Promise<void>
  addContribution: (data: NewContribution) => Promise<void>
  updateContribution: (id: string, data: Partial<NewContribution>) => Promise<void>
  addPayout: (data: NewPayout) => Promise<void>
  advanceRound: (cycleId: string) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
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
      const [memberRecords, cycleRecords, contributionRecords, payoutRecords] = await Promise.all([
        pb.collection('rosca_members').getFullList({ sort: 'name' }),
        pb.collection('rosca_cycles').getFullList({ sort: '-created' }),
        pb.collection('rosca_contributions').getFullList({ sort: '-date' }),
        pb.collection('rosca_payouts').getFullList({ sort: '-date' }),
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
      startDate: data.startDate instanceof Date
        ? data.startDate.toISOString().split('T')[0]
        : data.startDate,
      endDate: data.endDate
        ? (data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate)
        : null,
      status: data.status,
      memberIds: data.memberIds,
      payoutOrder: data.payoutOrder,
      currentRound: 1,
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

  advanceRound: async (cycleId) => {
    const cycle = get().cycles.find((c) => c.id === cycleId)
    if (!cycle) return
    const nextRound = cycle.currentRound + 1
    await pb.collection('rosca_cycles').update(cycleId, { currentRound: nextRound })
    set((state) => ({
      cycles: state.cycles.map((c) =>
        c.id === cycleId ? { ...c, currentRound: nextRound } : c,
      ),
    }))
  },

  deleteContribution: async (id) => {
    await pb.collection('rosca_contributions').delete(id)
    set((state) => ({
      contributions: state.contributions.filter((c) => c.id !== id),
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
