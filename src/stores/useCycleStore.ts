import { create } from 'zustand'
import { db } from '../db/dexie'
import type { Contribution, Cycle, Member, Payout } from '../db/dexie-schema'
import { pullFromServer, queueSync, tryWithRetry } from '../services/sync-engine'
import { pb } from '../services/pocketbase'

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
  advanceRound: (cycleId: string) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
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

    try {
      const record = await tryWithRetry(() =>
        pb.collection('rosca_members').create({
          name: member.name,
          phone: member.phone,
          joinDate: member.joinDate instanceof Date
            ? member.joinDate.toISOString().split('T')[0]
            : member.joinDate,
          owner: pb.authStore.model?.id,
        }),
      )
      await db.members.add({ ...member, pbId: record.id, syncStatus: 'synced' })
    } catch {
      await db.members.add(member)
      queueSync(id)
    }

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

    try {
      const record = await tryWithRetry(() =>
        pb.collection('rosca_cycles').create({
          name: cycle.name,
          amountPerPerson: cycle.amountPerPerson,
          frequency: cycle.frequency,
          startDate: cycle.startDate instanceof Date
            ? cycle.startDate.toISOString().split('T')[0]
            : cycle.startDate,
          endDate: cycle.endDate
            ? (cycle.endDate instanceof Date ? cycle.endDate.toISOString().split('T')[0] : cycle.endDate)
            : null,
          status: cycle.status,
          memberIds: cycle.memberIds,
          payoutOrder: cycle.payoutOrder,
          currentRound: cycle.currentRound,
          owner: pb.authStore.model?.id,
        }),
      )
      await db.cycles.add({ ...cycle, pbId: record.id, syncStatus: 'synced' })
    } catch {
      await db.cycles.add(cycle)
      queueSync(id)
    }

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

    const member = await db.members.get(contribution.memberId)
    const cycle = await db.cycles.get(contribution.cycleId)

    if (member?.pbId && cycle?.pbId) {
      try {
        const record = await tryWithRetry(() =>
          pb.collection('rosca_contributions').create({
            cycleId: cycle.pbId,
            memberId: member.pbId,
            amount: contribution.amount,
            date: contribution.date instanceof Date
              ? contribution.date.toISOString().split('T')[0]
              : contribution.date,
            method: contribution.method,
            notes: contribution.notes ?? '',
            owner: pb.authStore.model?.id,
          }),
        )
        await db.contributions.add({ ...contribution, pbId: record.id, syncStatus: 'synced' })
        await get().loadAll()
        return
      } catch {
        // fall through to local save
      }
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

    const member = await db.members.get(payout.memberId)
    const cycle = await db.cycles.get(payout.cycleId)

    if (member?.pbId && cycle?.pbId) {
      try {
        const record = await tryWithRetry(() =>
          pb.collection('rosca_payouts').create({
            cycleId: cycle.pbId,
            memberId: member.pbId,
            amount: payout.amount,
            roundNumber: payout.roundNumber,
            date: payout.date instanceof Date
              ? payout.date.toISOString().split('T')[0]
              : payout.date,
            owner: pb.authStore.model?.id,
          }),
        )
        await db.payouts.add({ ...payout, pbId: record.id, syncStatus: 'synced' })
        await get().loadAll()
        return
      } catch {
        // fall through to local save
      }
    }

    await db.payouts.add(payout)
    queueSync(id)
    await get().loadAll()
  },

  advanceRound: async (cycleId) => {
    const cycle = get().cycles.find((c) => c.id === cycleId)
    if (!cycle) return
    const nextRound = cycle.currentRound + 1
    const updatedAt = new Date()

    if (cycle.pbId) {
      try {
        await tryWithRetry(() =>
          pb.collection('rosca_cycles').update(cycle.pbId!, { currentRound: nextRound }),
        )
        await db.cycles.update(cycleId, { currentRound: nextRound, updatedAt, syncStatus: 'synced' })
        await get().loadAll()
        return
      } catch {
        // fall through to local save
      }
    }

    await db.cycles.update(cycleId, { currentRound: nextRound, updatedAt, syncStatus: 'pending' })
    queueSync(cycleId)
    await get().loadAll()
  },

  deleteContribution: async (id) => {
    const contribution = await db.contributions.get(id)
    if (contribution?.pbId) {
      try {
        await tryWithRetry(() => pb.collection('rosca_contributions').delete(contribution.pbId!))
      } catch {
        // best-effort — local delete always proceeds
      }
    }
    await db.contributions.delete(id)
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
