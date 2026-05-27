import { create } from 'zustand'
import { db } from '../db/dexie'
import type { Contribution, Cycle, Member, Payout } from '../db/dexie-schema'
import { pullFromServer, queueSync } from '../services/sync-engine'

type NewMember = Omit<
  Member,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'
>

type NewCycle = Omit<
  Cycle,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId' | 'currentRound'
>

type NewContribution = Omit<
  Contribution,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'
>

type NewPayout = Omit<
  Payout,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'
>

interface CycleState {
  cycles: Cycle[]
  members: Member[]
  contributions: Contribution[]
  payouts: Payout[]
  isLoading: boolean
  isSyncing: boolean
  pendingCount: number
  loadAll: () => Promise<void>
  addMember: (data: NewMember) => Promise<void>
  addCycle: (data: NewCycle) => Promise<void>
  addContribution: (data: NewContribution) => Promise<void>
  addPayout: (data: NewPayout) => Promise<void>
  getMemberTotal: (memberId: string, cycleId: string) => number
  getCycleTotal: (cycleId: string) => number
  refreshFromServer: () => Promise<void>
}

export const useCycleStore = create<CycleState>((set, get) => ({
  cycles: [],
  members: [],
  contributions: [],
  payouts: [],
  isLoading: false,
  isSyncing: false,
  pendingCount: 0,

  loadAll: async () => {
    set({ isLoading: true })
    const [cycles, members, contributions, payouts] = await Promise.all([
      db.cycles.toArray(),
      db.members.toArray(),
      db.contributions.toArray(),
      db.payouts.toArray(),
    ])

    const pendingCount = [...members, ...cycles, ...contributions, ...payouts].filter(
      (record) => record.syncStatus === 'pending',
    ).length

    set({ cycles, members, contributions, payouts, pendingCount, isLoading: false })
  },

  addMember: async (data) => {
    const id = crypto.randomUUID()
    const now = new Date()
    const member: Member = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.members.add(member)
    queueSync(id)
    await get().loadAll()
  },

  addCycle: async (data) => {
    const id = crypto.randomUUID()
    const now = new Date()
    const cycle: Cycle = {
      ...data,
      id,
      currentRound: 1,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.cycles.add(cycle)
    queueSync(id)
    await get().loadAll()
  },

  addContribution: async (data) => {
    const id = crypto.randomUUID()
    const now = new Date()
    const contribution: Contribution = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.contributions.add(contribution)
    queueSync(id)
    await get().loadAll()
  },

  addPayout: async (data) => {
    const id = crypto.randomUUID()
    const now = new Date()
    const payout: Payout = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.payouts.add(payout)
    queueSync(id)
    await get().loadAll()
  },

  getMemberTotal: (memberId, cycleId) => {
    return get()
      .contributions.filter(
        (contribution) =>
          contribution.memberId === memberId && contribution.cycleId === cycleId,
      )
      .reduce((sum, contribution) => sum + contribution.amount, 0)
  },

  getCycleTotal: (cycleId) => {
    return get()
      .contributions.filter((contribution) => contribution.cycleId === cycleId)
      .reduce((sum, contribution) => sum + contribution.amount, 0)
  },

  refreshFromServer: async () => {
    set({ isSyncing: true })
    await pullFromServer()
    await get().loadAll()
    set({ isSyncing: false })
  },
}))
