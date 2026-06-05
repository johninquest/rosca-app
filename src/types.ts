export interface Member {
  id: string
  name: string
  phone: string
  joinDate: Date
  owner?: string
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money'

export interface Cycle {
  id: string
  name: string
  amountPerPerson: number
  frequency: 'monthly'
  startDate: Date
  endDate?: Date
  status: 'active' | 'completed'
  owner?: string
  memberIds: string[]
  payoutOrder: string[]
  defaultPaymentMethod: PaymentMethod
  totalRounds: number
  closedRounds: number[]
}

export interface Contribution {
  id: string
  cycleId: string
  memberId: string
  amount: number
  date: Date
  roundNumber?: number
  method: PaymentMethod
  notes?: string
}

export interface Payout {
  id: string
  cycleId: string
  memberId: string
  amount: number
  roundNumber: number
  date: Date
}
