import type { RecordSubscription } from 'pocketbase'
import { pb } from './pocketbase'
import { mapContribution, mapCycle, mapMember, mapPayout, useCycleStore } from '../stores/useCycleStore'

let unsubscribeFns: Array<() => void> = []

export function startRealtimeSync(): void {
  if (!pb.authStore.isValid) return

  const collections = ['rosca_members', 'rosca_cycles', 'rosca_contributions', 'rosca_payouts']

  collections.forEach((collection) => {
    void pb
      .collection(collection)
      .subscribe('*', (event) => {
        handleRealtimeEvent(collection, event)
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

function handleRealtimeEvent(collection: string, event: RecordSubscription<any>): void {
  const { action, record } = event

  switch (collection) {
    case 'rosca_members': {
      const mapped = action !== 'delete' ? mapMember(record) : null
      useCycleStore.setState((state) => ({
        members:
          action === 'delete'
            ? state.members.filter((m) => m.id !== record.id)
            : state.members.some((m) => m.id === record.id)
            ? state.members.map((m) => (m.id === record.id ? mapped! : m))
            : [...state.members, mapped!],
      }))
      break
    }
    case 'rosca_cycles': {
      const mapped = action !== 'delete' ? mapCycle(record) : null
      useCycleStore.setState((state) => ({
        cycles:
          action === 'delete'
            ? state.cycles.filter((c) => c.id !== record.id)
            : state.cycles.some((c) => c.id === record.id)
            ? state.cycles.map((c) => (c.id === record.id ? mapped! : c))
            : [mapped!, ...state.cycles],
      }))
      break
    }
    case 'rosca_contributions': {
      const mapped = action !== 'delete' ? mapContribution(record) : null
      useCycleStore.setState((state) => ({
        contributions:
          action === 'delete'
            ? state.contributions.filter((c) => c.id !== record.id)
            : state.contributions.some((c) => c.id === record.id)
            ? state.contributions.map((c) => (c.id === record.id ? mapped! : c))
            : [mapped!, ...state.contributions],
      }))
      break
    }
    case 'rosca_payouts': {
      const mapped = action !== 'delete' ? mapPayout(record) : null
      useCycleStore.setState((state) => ({
        payouts:
          action === 'delete'
            ? state.payouts.filter((p) => p.id !== record.id)
            : state.payouts.some((p) => p.id === record.id)
            ? state.payouts.map((p) => (p.id === record.id ? mapped! : p))
            : [mapped!, ...state.payouts],
      }))
      break
    }
  }
}
