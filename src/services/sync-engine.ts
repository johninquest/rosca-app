import type { RecordSubscription } from 'pocketbase'
import { db } from '../db/dexie'
import type { Contribution, Cycle, Member, Payout } from '../db/dexie-schema'
import { pb } from './pocketbase'

const syncQueue = new Set<string>()
let isSyncing = false
let syncTimeout: ReturnType<typeof setTimeout> | undefined
let unsubscribeFns: Array<() => void> = []

export function queueSync(recordId: string): void {
  syncQueue.add(recordId)
  debouncedSync()
}

function debouncedSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  syncTimeout = setTimeout(() => {
    void flushSyncQueue()
  }, 2000)
}

export async function flushSyncQueue(): Promise<void> {
  if (isSyncing || syncQueue.size === 0) return
  if (!navigator.onLine || !pb.authStore.isValid) return

  isSyncing = true
  const ids = Array.from(syncQueue)
  syncQueue.clear()

  try {
    for (const id of ids) {
      await syncRecord(id)
    }
    await db.settings.update('settings', { lastSyncAt: new Date() })
  } catch (error) {
    console.error('Sync failed:', error)
    ids.forEach((id) => syncQueue.add(id))
  } finally {
    isSyncing = false
  }
}

async function syncRecord(id: string): Promise<void> {
  const member = await db.members.get(id)
  if (member) return syncMember(member)

  const cycle = await db.cycles.get(id)
  if (cycle) return syncCycle(cycle)

  const contribution = await db.contributions.get(id)
  if (contribution) return syncContribution(contribution)

  const payout = await db.payouts.get(id)
  if (payout) return syncPayout(payout)
}

async function syncMember(member: Member): Promise<void> {
  const data = {
    name: member.name,
    phone: member.phone,
    joinDate: member.joinDate.toISOString().split('T')[0],
    owner: pb.authStore.model?.id,
  }

  if (member.pbId) {
    await pb.collection('members').update(member.pbId, data)
  } else {
    const record = await pb.collection('members').create(data)
    await db.members.update(member.id, { pbId: record.id, syncStatus: 'synced' })
    return
  }

  await db.members.update(member.id, { syncStatus: 'synced' })
}

async function syncCycle(cycle: Cycle): Promise<void> {
  const data = {
    name: cycle.name,
    amountPerPerson: cycle.amountPerPerson,
    frequency: cycle.frequency,
    startDate: cycle.startDate.toISOString().split('T')[0],
    endDate: cycle.endDate?.toISOString().split('T')[0] || null,
    status: cycle.status,
    memberIds: cycle.memberIds,
    payoutOrder: cycle.payoutOrder,
    currentRound: cycle.currentRound,
    owner: pb.authStore.model?.id,
  }

  if (cycle.pbId) {
    await pb.collection('cycles').update(cycle.pbId, data)
  } else {
    const record = await pb.collection('cycles').create(data)
    await db.cycles.update(cycle.id, { pbId: record.id, syncStatus: 'synced' })
    return
  }

  await db.cycles.update(cycle.id, { syncStatus: 'synced' })
}

async function syncContribution(contribution: Contribution): Promise<void> {
  const member = await db.members.get(contribution.memberId)
  const cycle = await db.cycles.get(contribution.cycleId)

  if (!member?.pbId || !cycle?.pbId) {
    syncQueue.add(contribution.id)
    return
  }

  const data = {
    cycleId: cycle.pbId,
    memberId: member.pbId,
    amount: contribution.amount,
    date: contribution.date.toISOString().split('T')[0],
    method: contribution.method,
    notes: contribution.notes || '',
    owner: pb.authStore.model?.id,
  }

  if (contribution.pbId) {
    await pb.collection('contributions').update(contribution.pbId, data)
  } else {
    const record = await pb.collection('contributions').create(data)
    await db.contributions.update(contribution.id, {
      pbId: record.id,
      syncStatus: 'synced',
    })
    return
  }

  await db.contributions.update(contribution.id, { syncStatus: 'synced' })
}

async function syncPayout(payout: Payout): Promise<void> {
  const member = await db.members.get(payout.memberId)
  const cycle = await db.cycles.get(payout.cycleId)

  if (!member?.pbId || !cycle?.pbId) {
    syncQueue.add(payout.id)
    return
  }

  const data = {
    cycleId: cycle.pbId,
    memberId: member.pbId,
    amount: payout.amount,
    roundNumber: payout.roundNumber,
    date: payout.date.toISOString().split('T')[0],
    owner: pb.authStore.model?.id,
  }

  if (payout.pbId) {
    await pb.collection('payouts').update(payout.pbId, data)
  } else {
    const record = await pb.collection('payouts').create(data)
    await db.payouts.update(payout.id, { pbId: record.id, syncStatus: 'synced' })
    return
  }

  await db.payouts.update(payout.id, { syncStatus: 'synced' })
}

export async function pullFromServer(): Promise<void> {
  if (!navigator.onLine || !pb.authStore.isValid) return

  const settings = await db.settings.get('settings')
  const lastSync = settings?.lastSyncAt
  const filter = lastSync ? `updated >= "${lastSync.toISOString()}"` : ''

  await Promise.all([
    pullCollection('members', filter),
    pullCollection('cycles', filter),
    pullCollection('contributions', filter),
    pullCollection('payouts', filter),
  ])

  await db.settings.update('settings', { lastSyncAt: new Date() })
}

async function pullCollection(collectionName: string, filter: string): Promise<void> {
  const records = await pb.collection(collectionName).getFullList({
    filter,
    sort: '-updated',
  })

  for (const record of records) {
    const localRecord = mapToLocal(collectionName, record)
    const table = (db as unknown as Record<string, { get: (id: string) => Promise<any>; put: (value: any) => Promise<void> }>)[collectionName]
    const existing = await table.get(record.id)

    if (!existing || new Date(record.updated) > existing.updatedAt) {
      await table.put({ ...localRecord, syncStatus: 'synced' as const })
    }
  }
}

function mapToLocal(collection: string, record: any): any {
  const base = {
    pbId: record.id,
    createdAt: new Date(record.created),
    updatedAt: new Date(record.updated),
    syncStatus: 'synced' as const,
  }

  switch (collection) {
    case 'members':
      return {
        id: record.id,
        name: record.name,
        phone: record.phone,
        joinDate: new Date(record.joinDate),
        ...base,
      }
    case 'cycles':
      return {
        id: record.id,
        name: record.name,
        amountPerPerson: record.amountPerPerson,
        frequency: record.frequency,
        startDate: new Date(record.startDate),
        endDate: record.endDate ? new Date(record.endDate) : undefined,
        status: record.status,
        memberIds: record.memberIds,
        payoutOrder: record.payoutOrder,
        currentRound: record.currentRound,
        ...base,
      }
    case 'contributions':
      return {
        id: record.id,
        cycleId: record.cycleId,
        memberId: record.memberId,
        amount: record.amount,
        date: new Date(record.date),
        method: record.method,
        notes: record.notes,
        ...base,
      }
    case 'payouts':
      return {
        id: record.id,
        cycleId: record.cycleId,
        memberId: record.memberId,
        amount: record.amount,
        roundNumber: record.roundNumber,
        date: new Date(record.date),
        ...base,
      }
    default:
      return record
  }
}

export async function fullRestore(): Promise<void> {
  if (!pb.authStore.isValid) {
    throw new Error('Not authenticated')
  }

  await db.members.clear()
  await db.cycles.clear()
  await db.contributions.clear()
  await db.payouts.clear()

  await pullFromServer()
}

export function startRealtimeSync(): void {
  if (!pb.authStore.isValid) return

  const collections = ['members', 'cycles', 'contributions', 'payouts']

  collections.forEach((collection) => {
    void pb
      .collection(collection)
      .subscribe('*', (event) => {
        void handleRealtimeEvent(collection, event)
      })
      .then((unsubscribe) => {
        unsubscribeFns.push(unsubscribe)
      })
  })
}

export function stopRealtimeSync(): void {
  unsubscribeFns.forEach((fn) => fn())
  unsubscribeFns = []
}

async function handleRealtimeEvent(
  collection: string,
  event: RecordSubscription<any>,
): Promise<void> {
  const table = (db as unknown as Record<string, { put: (value: any) => Promise<void>; delete: (id: string) => Promise<void> }>)[collection]

  switch (event.action) {
    case 'create':
    case 'update':
      await table.put({
        ...mapToLocal(collection, event.record),
        syncStatus: 'synced' as const,
      })
      break
    case 'delete':
      await table.delete(event.record.id)
      break
    default:
      break
  }
}

window.addEventListener('online', () => {
  void flushSyncQueue()
  void pullFromServer()
})
