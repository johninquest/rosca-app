import type { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { pb } from '../services/pocketbase'
import { logAuditEvent } from '../services/audit'
import type {
  AuditLog,
  Contribution,
  Cycle,
  CycleFrequency,
  CycleMember,
  CycleStatus,
  PaymentMethod,
  Payout,
} from '../types'

type NewCycleMember = Omit<CycleMember, 'id'>
type NewCycle = Omit<Cycle, 'id' | 'closedRounds' | 'payoutOrder'>
type NewContribution = Omit<Contribution, 'id'>
type NewPayout = Omit<Payout, 'id'>

function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === 'cash' || value === 'bank_transfer' || value === 'mobile_money'
    ? value
    : 'mobile_money'
}

function normalizeFrequency(value: unknown): CycleFrequency {
  return value === 'weekly' || value === 'biweekly' || value === 'monthly' ? value : 'monthly'
}

function normalizeStatus(value: unknown): CycleStatus {
  return value === 'completed' ? 'completed' : 'active'
}

function mapTerms(r: RecordModel): Cycle['terms'] {
  return {
    latePaymentPolicy: r.termsLatePaymentPolicy || undefined,
    fineAmount: typeof r.termsFineAmount === 'number' ? r.termsFineAmount : undefined,
    fineCurrency: 'XAF',
    otherRules: r.termsOtherRules || undefined,
  }
}

export function mapCycleMember(r: RecordModel): CycleMember {
  return {
    id: r.id,
    cycleId: r.cycleId,
    name: r.name,
    phone: r.phone ?? '',
    joinDate: new Date(r.joinDate),
    contributionAmount: typeof r.contributionAmount === 'number' ? r.contributionAmount : 0,
    owner: typeof r.owner === 'string' ? r.owner : undefined,
    deletedAt: r.deletedAt ? new Date(r.deletedAt) : undefined,
  }
}

export function mapCycle(r: RecordModel): Cycle {
  return {
    id: r.id,
    name: r.name,
    contributionMode: r.contributionMode === 'flex' ? 'flex' : 'fixed',
    fixedAmountPerPerson: typeof r.fixedAmountPerPerson === 'number' ? r.fixedAmountPerPerson : undefined,
    frequency: normalizeFrequency(r.frequency),
    startDate: new Date(r.startDate),
    endDate: r.endDate ? new Date(r.endDate) : undefined,
    status: normalizeStatus(r.status),
    owner: typeof r.owner === 'string' ? r.owner : undefined,
    terms: mapTerms(r),
    totalRounds: typeof r.totalRounds === 'number' ? r.totalRounds : 12,
    closedRounds: Array.isArray(r.closedRounds) ? r.closedRounds : [],
    payoutOrder: Array.isArray(r.payoutOrder) ? r.payoutOrder : [],
    defaultPaymentMethod:
      r.defaultPaymentMethod === 'bank_transfer' || r.defaultPaymentMethod === 'mobile_money'
        ? r.defaultPaymentMethod
        : 'cash',
    deletedAt: r.deletedAt ? new Date(r.deletedAt) : undefined,
  }
}

export function mapContribution(r: RecordModel): Contribution {
  return {
    id: r.id,
    cycleId: r.cycleId,
    memberId: r.memberId,
    amount: r.amount,
    date: new Date(r.date),
    roundNumber: Number(r.roundNumber),
    method: normalizePaymentMethod(r.method),
    notes: r.notes || undefined,
    owner: typeof r.owner === 'string' ? r.owner : undefined,
    deletedAt: r.deletedAt ? new Date(r.deletedAt) : undefined,
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
    owner: typeof r.owner === 'string' ? r.owner : undefined,
    deletedAt: r.deletedAt ? new Date(r.deletedAt) : undefined,
  }
}

export function mapAuditLog(r: RecordModel): AuditLog {
  return {
    id: r.id,
    cycleId: r.cycleId,
    tableName: r.tableName as AuditLog['tableName'],
    recordId: r.recordId,
    action: r.action as AuditLog['action'],
    oldValues: r.oldValues ?? undefined,
    newValues: r.newValues ?? undefined,
    performedBy: r.performedBy,
    performedAt: new Date(r.performedAt),
    notes: r.notes || undefined,
    owner: typeof r.owner === 'string' ? r.owner : undefined,
  }
}

type CycleUpdate = Partial<NewCycle> & { payoutOrder?: string[] }

interface CycleState {
  cycles: Cycle[]
  cycleMembers: CycleMember[]
  contributions: Contribution[]
  payouts: Payout[]
  auditLogs: AuditLog[]
  isLoading: boolean
  loadAll: () => Promise<void>
  addCycle: (data: NewCycle) => Promise<Cycle>
  updateCycle: (id: string, data: CycleUpdate) => Promise<void>
  deleteCycle: (cycleId: string) => Promise<void>
  addCycleMember: (data: NewCycleMember) => Promise<CycleMember>
  updateCycleMember: (id: string, data: Partial<NewCycleMember>) => Promise<void>
  deleteCycleMember: (memberId: string) => Promise<void>
  addContribution: (data: NewContribution) => Promise<void>
  updateContribution: (id: string, data: Partial<NewContribution>) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  addPayout: (data: NewPayout) => Promise<void>
  updatePayout: (id: string, data: Partial<NewPayout>) => Promise<void>
  deletePayout: (id: string) => Promise<void>
  closeRound: (cycleId: string, roundNumber: number) => Promise<void>
  loadAuditLogs: (cycleId: string) => Promise<void>
  getMemberTotal: (memberId: string, cycleId: string) => number
  getCycleTotal: (cycleId: string) => number
  getMemberNetPosition: (memberId: string, cycleId: string) => number
  getRoundExpectedTotal: (cycleId: string) => number
}

function softDeleteFilter(userId: string | undefined): string {
  const base = userId ? `owner = "${userId}"` : ''
  const deleted = `deletedAt = null`
  return base ? `${base} && ${deleted}` : deleted
}

export const useCycleStore = create<CycleState>((set, get) => ({
  cycles: [],
  cycleMembers: [],
  contributions: [],
  payouts: [],
  auditLogs: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const userId = pb.authStore.record?.id
      const filter = softDeleteFilter(userId)
      const [memberRecords, cycleRecords, contributionRecords, payoutRecords] = await Promise.all([
        pb
          .collection('rosca_cycle_members')
          .getFullList({ sort: 'name', filter, $autoCancel: false }),
        pb
          .collection('rosca_cycles')
          .getFullList({ sort: '-created', filter, $autoCancel: false }),
        pb
          .collection('rosca_contributions')
          .getFullList({ sort: '-date', filter, $autoCancel: false }),
        pb
          .collection('rosca_payouts')
          .getFullList({ sort: '-date', filter, $autoCancel: false }),
      ])
      set({
        cycleMembers: memberRecords.map(mapCycleMember),
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

  addCycle: async (data) => {
    const record = await pb.collection('rosca_cycles').create({
      name: data.name,
      contributionMode: data.contributionMode,
      fixedAmountPerPerson: data.fixedAmountPerPerson ?? null,
      frequency: data.frequency,
      defaultPaymentMethod: data.defaultPaymentMethod,
      startDate: data.startDate instanceof Date
        ? data.startDate.toISOString().split('T')[0]
        : data.startDate,
      endDate: data.endDate
        ? (data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate)
        : null,
      status: data.status,
      totalRounds: data.totalRounds,
      closedRounds: [],
      payoutOrder: [],
      termsLatePaymentPolicy: data.terms?.latePaymentPolicy ?? '',
      termsFineAmount: data.terms?.fineAmount ?? null,
      termsOtherRules: data.terms?.otherRules ?? '',
      owner: pb.authStore.record?.id,
    })
    const cycle = mapCycle(record)
    set((state) => ({ cycles: [cycle, ...state.cycles] }))

    await logAuditEvent({
      cycleId: cycle.id,
      tableName: 'cycles',
      recordId: cycle.id,
      action: 'create',
      newValues: cycle as unknown as Record<string, unknown>,
    })

    return cycle
  },

  updateCycle: async (id, data) => {
    const before = get().cycles.find((c) => c.id === id)
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.contributionMode !== undefined) payload.contributionMode = data.contributionMode
    if (data.fixedAmountPerPerson !== undefined) payload.fixedAmountPerPerson = data.fixedAmountPerPerson
    if (data.frequency !== undefined) payload.frequency = data.frequency
    if (data.defaultPaymentMethod !== undefined) payload.defaultPaymentMethod = data.defaultPaymentMethod
    if (data.totalRounds !== undefined) payload.totalRounds = data.totalRounds
    if (data.status !== undefined) payload.status = data.status
    if (data.terms !== undefined) {
      payload.termsLatePaymentPolicy = data.terms.latePaymentPolicy ?? ''
      payload.termsFineAmount = data.terms.fineAmount ?? null
      payload.termsOtherRules = data.terms.otherRules ?? ''
    }

    const record = await pb.collection('rosca_cycles').update(id, payload)
    const updated = mapCycle(record)
    set((state) => ({
      cycles: state.cycles.map((c) => (c.id === id ? updated : c)),
    }))

    await logAuditEvent({
      cycleId: id,
      tableName: 'cycles',
      recordId: id,
      action: 'update',
      oldValues: before ? (before as unknown as Record<string, unknown>) : undefined,
      newValues: updated as unknown as Record<string, unknown>,
    })
  },

  deleteCycle: async (cycleId) => {
    const state = get()
    const now = new Date().toISOString()

    // Soft-delete related records
    const contributionIds = state.contributions
      .filter((item) => item.cycleId === cycleId && !item.deletedAt)
      .map((item) => item.id)
    const payoutIds = state.payouts
      .filter((item) => item.cycleId === cycleId && !item.deletedAt)
      .map((item) => item.id)
    const memberIds = state.cycleMembers
      .filter((item) => item.cycleId === cycleId && !item.deletedAt)
      .map((item) => item.id)

    await Promise.all(contributionIds.map((id) =>
      pb.collection('rosca_contributions').update(id, { deletedAt: now })))
    await Promise.all(payoutIds.map((id) =>
      pb.collection('rosca_payouts').update(id, { deletedAt: now })))
    await Promise.all(memberIds.map((id) =>
      pb.collection('rosca_cycle_members').update(id, { deletedAt: now })))
    await pb.collection('rosca_cycles').update(cycleId, { deletedAt: now })

    await logAuditEvent({
      cycleId: cycleId,
      tableName: 'cycles',
      recordId: cycleId,
      action: 'delete',
      notes: 'Soft deleted with related records',
    })

    set((current) => ({
      cycles: current.cycles.filter((cycle) => cycle.id !== cycleId),
      cycleMembers: current.cycleMembers.filter((m) => m.cycleId !== cycleId),
      contributions: current.contributions.filter((item) => item.cycleId !== cycleId),
      payouts: current.payouts.filter((item) => item.cycleId !== cycleId),
      auditLogs: current.auditLogs.filter((log) => log.cycleId !== cycleId),
    }))
  },

  addCycleMember: async (data) => {
    const record = await pb.collection('rosca_cycle_members').create({
      name: data.name,
      phone: data.phone ?? '',
      joinDate: data.joinDate instanceof Date
        ? data.joinDate.toISOString().split('T')[0]
        : data.joinDate,
      contributionAmount: data.contributionAmount,
      cycleId: data.cycleId,
      owner: pb.authStore.record?.id,
    })
    const member = mapCycleMember(record)
    set((state) => ({ cycleMembers: [...state.cycleMembers, member] }))

    // Also update cycle payoutOrder to include new member
    const cycle = get().cycles.find((c) => c.id === data.cycleId)
    if (cycle) {
      const newPayoutOrder = [...cycle.payoutOrder, member.id]
      await pb.collection('rosca_cycles').update(cycle.id, {
        payoutOrder: newPayoutOrder,
      })
      set((state) => ({
        cycles: state.cycles.map((c) =>
          c.id === cycle.id ? { ...c, payoutOrder: newPayoutOrder } : c,
        ),
      }))
    }

    await logAuditEvent({
      cycleId: data.cycleId,
      tableName: 'cycle_members',
      recordId: member.id,
      action: 'create',
      newValues: member as unknown as Record<string, unknown>,
    })

    return member
  },

  updateCycleMember: async (id, data) => {
    const before = get().cycleMembers.find((m) => m.id === id)
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.joinDate !== undefined) {
      payload.joinDate = data.joinDate instanceof Date
        ? data.joinDate.toISOString().split('T')[0]
        : data.joinDate
    }
    if (data.contributionAmount !== undefined) payload.contributionAmount = data.contributionAmount

    const record = await pb.collection('rosca_cycle_members').update(id, payload)
    const updated = mapCycleMember(record)
    set((state) => ({
      cycleMembers: state.cycleMembers.map((m) => (m.id === id ? updated : m)),
    }))

    await logAuditEvent({
      cycleId: updated.cycleId,
      tableName: 'cycle_members',
      recordId: id,
      action: 'update',
      oldValues: before ? (before as unknown as Record<string, unknown>) : undefined,
      newValues: updated as unknown as Record<string, unknown>,
    })
  },

  deleteCycleMember: async (memberId) => {
    const member = get().cycleMembers.find((m) => m.id === memberId)
    if (!member) return

    const cycle = get().cycles.find((c) => c.id === member.cycleId)
    if (cycle) {
      const newPayoutOrder = cycle.payoutOrder.filter((id) => id !== memberId)
      await pb.collection('rosca_cycles').update(cycle.id, {
        payoutOrder: newPayoutOrder,
      })
      set((state) => ({
        cycles: state.cycles.map((c) =>
          c.id === cycle.id ? { ...c, payoutOrder: newPayoutOrder } : c,
        ),
      }))
    }

    await pb.collection('rosca_cycle_members').update(memberId, {
      deletedAt: new Date().toISOString(),
    })

    await logAuditEvent({
      cycleId: member.cycleId,
      tableName: 'cycle_members',
      recordId: memberId,
      action: 'delete',
      notes: 'Soft deleted',
    })

    set((state) => ({
      cycleMembers: state.cycleMembers.filter((m) => m.id !== memberId),
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

    await logAuditEvent({
      cycleId: data.cycleId,
      tableName: 'contributions',
      recordId: contribution.id,
      action: 'create',
      newValues: contribution as unknown as Record<string, unknown>,
    })
  },

  updateContribution: async (id, data) => {
    const before = get().contributions.find((c) => c.id === id)
    const payload: Record<string, unknown> = {}
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

    await logAuditEvent({
      cycleId: updated.cycleId,
      tableName: 'contributions',
      recordId: id,
      action: 'update',
      oldValues: before ? (before as unknown as Record<string, unknown>) : undefined,
      newValues: updated as unknown as Record<string, unknown>,
    })
  },

  deleteContribution: async (id) => {
    const before = get().contributions.find((c) => c.id === id)
    await pb.collection('rosca_contributions').update(id, {
      deletedAt: new Date().toISOString(),
    })

    if (before) {
      await logAuditEvent({
        cycleId: before.cycleId,
        tableName: 'contributions',
        recordId: id,
        action: 'delete',
        oldValues: before as unknown as Record<string, unknown>,
        notes: 'Soft deleted',
      })
    }

    set((state) => ({
      contributions: state.contributions.filter((c) => c.id !== id),
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

    await logAuditEvent({
      cycleId: data.cycleId,
      tableName: 'payouts',
      recordId: payout.id,
      action: 'create',
      newValues: payout as unknown as Record<string, unknown>,
    })
  },

  updatePayout: async (id, data) => {
    const before = get().payouts.find((p) => p.id === id)
    const payload: Record<string, unknown> = {}
    if (data.amount !== undefined) payload.amount = data.amount
    if (data.date !== undefined) {
      payload.date = data.date instanceof Date
        ? data.date.toISOString().split('T')[0]
        : data.date
    }

    const record = await pb.collection('rosca_payouts').update(id, payload)
    const updated = mapPayout(record)
    set((state) => ({
      payouts: state.payouts.map((p) => (p.id === id ? updated : p)),
    }))

    await logAuditEvent({
      cycleId: updated.cycleId,
      tableName: 'payouts',
      recordId: id,
      action: 'update',
      oldValues: before ? (before as unknown as Record<string, unknown>) : undefined,
      newValues: updated as unknown as Record<string, unknown>,
    })
  },

  deletePayout: async (id) => {
    const before = get().payouts.find((p) => p.id === id)
    await pb.collection('rosca_payouts').update(id, {
      deletedAt: new Date().toISOString(),
    })

    if (before) {
      await logAuditEvent({
        cycleId: before.cycleId,
        tableName: 'payouts',
        recordId: id,
        action: 'delete',
        oldValues: before as unknown as Record<string, unknown>,
        notes: 'Soft deleted',
      })
    }

    set((state) => ({
      payouts: state.payouts.filter((p) => p.id !== id),
    }))
  },

  closeRound: async (cycleId, roundNumber) => {
    const cycle = get().cycles.find((c) => c.id === cycleId)
    if (!cycle || cycle.closedRounds.includes(roundNumber)) return

    const closedRounds = [...cycle.closedRounds, roundNumber].sort((a, b) => a - b)
    const status: CycleStatus = closedRounds.length >= cycle.totalRounds ? 'completed' : cycle.status

    await pb.collection('rosca_cycles').update(cycleId, { closedRounds, status })

    set((state) => ({
      cycles: state.cycles.map((c) =>
        c.id === cycleId ? { ...c, closedRounds, status } : c,
      ),
    }))

    await logAuditEvent({
      cycleId,
      tableName: 'cycles',
      recordId: cycleId,
      action: 'update',
      notes: `Closed round ${roundNumber}`,
    })
  },

  loadAuditLogs: async (cycleId) => {
    try {
      const userId = pb.authStore.record?.id
      const filter = userId
        ? `cycleId = "${cycleId}" && owner = "${userId}"`
        : `cycleId = "${cycleId}"`
      const records = await pb
        .collection('rosca_audit_logs')
        .getFullList({ sort: '-performedAt', filter, $autoCancel: false })
      set({ auditLogs: records.map(mapAuditLog) })
    } catch {
      set({ auditLogs: [] })
    }
  },

  getMemberTotal: (memberId, cycleId) => {
    return get()
      .contributions.filter(
        (c) => c.memberId === memberId && c.cycleId === cycleId && !c.deletedAt,
      )
      .reduce((sum, c) => sum + c.amount, 0)
  },

  getCycleTotal: (cycleId) => {
    return get()
      .contributions.filter((c) => c.cycleId === cycleId && !c.deletedAt)
      .reduce((sum, c) => sum + c.amount, 0)
  },

  getMemberNetPosition: (memberId, cycleId) => {
    const contributed = get()
      .contributions.filter(
        (c) => c.memberId === memberId && c.cycleId === cycleId && !c.deletedAt,
      )
      .reduce((sum, c) => sum + c.amount, 0)

    const received = get()
      .payouts.filter(
        (p) => p.memberId === memberId && p.cycleId === cycleId && !p.deletedAt,
      )
      .reduce((sum, p) => sum + p.amount, 0)

    return contributed - received
  },

  getRoundExpectedTotal: (cycleId) => {
    return get()
      .cycleMembers.filter(
        (m) => m.cycleId === cycleId && !m.deletedAt,
      )
      .reduce((sum, m) => sum + m.contributionAmount, 0)
  },
}))
