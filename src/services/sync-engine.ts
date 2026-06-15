import type { RecordSubscription } from 'pocketbase'
import { pb } from './pocketbase'
import {
  mapAuditLog,
  mapContribution,
  mapCycle,
  mapCycleMember,
  mapPayout,
  useCycleStore,
} from '../stores/useCycleStore'

let unsubscribeFns: Array<() => void> = []

export function startRealtimeSync(): void {
  if (!pb.authStore.isValid) return

  const collections = [
    'rosca_cycle_members',
    'rosca_cycles',
    'rosca_contributions',
    'rosca_payouts',
    'rosca_audit_logs',
  ]

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

  const isSoftDelete = action === 'update' && Boolean(record.deletedAt)

  switch (collection) {
    case 'rosca_cycle_members': {
      const mapped = action !== 'delete' ? mapCycleMember(record) : null
      if (isSoftDelete || action === 'delete') {
        useCycleStore.setState((state) => ({
          cycleMembers: state.cycleMembers.filter((m) => m.id !== record.id),
        }))
      } else {
        useCycleStore.setState((state) => ({
          cycleMembers: state.cycleMembers.some((m) => m.id === record.id)
            ? state.cycleMembers.map((m) => (m.id === record.id ? mapped! : m))
            : [...state.cycleMembers, mapped!],
        }))
      }
      break
    }
    case 'rosca_cycles': {
      const mapped = action !== 'delete' ? mapCycle(record) : null
      if (isSoftDelete || action === 'delete') {
        useCycleStore.setState((state) => ({
          cycles: state.cycles.filter((c) => c.id !== record.id),
        }))
      } else {
        useCycleStore.setState((state) => ({
          cycles: state.cycles.some((c) => c.id === record.id)
            ? state.cycles.map((c) => (c.id === record.id ? mapped! : c))
            : [mapped!, ...state.cycles],
        }))
      }
      break
    }
    case 'rosca_contributions': {
      const mapped = action !== 'delete' ? mapContribution(record) : null
      if (isSoftDelete || action === 'delete') {
        useCycleStore.setState((state) => ({
          contributions: state.contributions.filter((c) => c.id !== record.id),
        }))
      } else {
        useCycleStore.setState((state) => ({
          contributions: state.contributions.some((c) => c.id === record.id)
            ? state.contributions.map((c) => (c.id === record.id ? mapped! : c))
            : [mapped!, ...state.contributions],
        }))
      }
      break
    }
    case 'rosca_payouts': {
      const mapped = action !== 'delete' ? mapPayout(record) : null
      if (isSoftDelete || action === 'delete') {
        useCycleStore.setState((state) => ({
          payouts: state.payouts.filter((p) => p.id !== record.id),
        }))
      } else {
        useCycleStore.setState((state) => ({
          payouts: state.payouts.some((p) => p.id === record.id)
            ? state.payouts.map((p) => (p.id === record.id ? mapped! : p))
            : [mapped!, ...state.payouts],
        }))
      }
      break
    }
    case 'rosca_audit_logs': {
      const mapped = action !== 'delete' ? mapAuditLog(record) : null
      if (action === 'delete') {
        // Audit logs are never soft-deleted, but handle just in case
        useCycleStore.setState((state) => ({
          auditLogs: state.auditLogs.filter((log) => log.id !== record.id),
        }))
      } else {
        useCycleStore.setState((state) => ({
          auditLogs: state.auditLogs.some((log) => log.id === record.id)
            ? state.auditLogs.map((log) => (log.id === record.id ? mapped! : log))
            : [mapped!, ...state.auditLogs],
        }))
      }
      break
    }
  }
}
