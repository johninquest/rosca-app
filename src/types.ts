export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money'
export type ContributionMode = 'fixed' | 'flex'
export type CycleFrequency = 'weekly' | 'biweekly' | 'monthly'
export type CycleStatus = 'active' | 'completed'

export interface CycleTerms {
  latePaymentPolicy?: string
  fineAmount?: number
  fineCurrency?: 'XAF'
  otherRules?: string
}

export interface Cycle {
  id: string
  name: string
  contributionMode: ContributionMode
  fixedAmountPerPerson?: number
  frequency: CycleFrequency
  startDate: Date
  endDate?: Date
  status: CycleStatus
  owner?: string
  terms: CycleTerms
  totalRounds: number
  closedRounds: number[]
  payoutOrder: string[]
  defaultPaymentMethod: PaymentMethod
  deletedAt?: Date
}

export interface CycleMember {
  id: string
  cycleId: string
  name: string
  phone: string
  joinDate: Date
  contributionAmount: number
  owner?: string
  deletedAt?: Date
}

export interface Contribution {
  id: string
  cycleId: string
  memberId: string
  amount: number
  date: Date
  roundNumber: number
  method: PaymentMethod
  notes?: string
  owner?: string
  deletedAt?: Date
}

export interface Payout {
  id: string
  cycleId: string
  memberId: string
  amount: number
  roundNumber: number
  date: Date
  owner?: string
  deletedAt?: Date
}

export interface AuditLog {
  id: string
  cycleId: string
  tableName: 'cycles' | 'cycle_members' | 'contributions' | 'payouts'
  recordId: string
  action: 'create' | 'update' | 'delete'
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  performedBy: string
  performedAt: Date
  notes?: string
  owner?: string
}
