export type SyncStatus = 'synced' | 'pending' | 'conflict'

export interface Member {
  id: string
  name: string
  phone: string
  joinDate: Date
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  pbId?: string
}

export interface Cycle {
  id: string
  name: string
  amountPerPerson: number
  frequency: 'weekly' | 'monthly'
  startDate: Date
  endDate?: Date
  status: 'active' | 'completed'
  memberIds: string[]
  payoutOrder: string[]
  currentRound: number
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  pbId?: string
}

export interface Contribution {
  id: string
  cycleId: string
  memberId: string
  amount: number
  date: Date
  method: 'cash' | 'mtn' | 'orange' | 'other'
  notes?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  pbId?: string
}

export interface Payout {
  id: string
  cycleId: string
  memberId: string
  amount: number
  roundNumber: number
  date: Date
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  pbId?: string
}

export interface AppSettings {
  id: 'settings'
  language: 'fr' | 'en'
  lastSyncAt?: Date
  adminEmail?: string
  pbToken?: string
}
