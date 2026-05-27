import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  Contribution,
  Cycle,
  Member,
  Payout,
} from './dexie-schema'

export const db = new Dexie('TontineDB') as Dexie & {
  members: EntityTable<Member, 'id'>
  cycles: EntityTable<Cycle, 'id'>
  contributions: EntityTable<Contribution, 'id'>
  payouts: EntityTable<Payout, 'id'>
  settings: EntityTable<AppSettings, 'id'>
}

db.version(1).stores({
  members: 'id, name, phone, [syncStatus+updatedAt]',
  cycles: 'id, name, status, startDate, [syncStatus+updatedAt]',
  contributions:
    'id, cycleId, memberId, date, [cycleId+memberId], [syncStatus+updatedAt]',
  payouts: 'id, cycleId, roundNumber, date, [syncStatus+updatedAt]',
  settings: 'id',
})
