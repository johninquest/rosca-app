export interface Member {
  id: string
  name: string
  phone: string
  joinDate: Date
}

export interface Cycle {
  id: string
  name: string
  amountPerPerson: number
  frequency: 'monthly'
  startDate: Date
  endDate?: Date
  status: 'active' | 'completed'
  memberIds: string[]
  payoutOrder: string[]
  currentRound: number
}

export interface Contribution {
  id: string
  cycleId: string
  memberId: string
  amount: number
  date: Date
  roundNumber?: number
  method: 'cash' | 'mtn' | 'orange' | 'other'
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
