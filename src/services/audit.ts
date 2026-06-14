import { pb } from './pocketbase'
import type { AuditLog } from '../types'

export async function logAuditEvent(params: {
  cycleId: string
  tableName: AuditLog['tableName']
  recordId: string
  action: 'create' | 'update' | 'delete'
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  notes?: string
}): Promise<void> {
  try {
    await pb.collection('rosca_audit_logs').create({
      cycleId: params.cycleId,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      oldValues: params.oldValues ?? null,
      newValues: params.newValues ?? null,
      performedBy: pb.authStore.record?.id ?? '',
      performedAt: new Date().toISOString(),
      notes: params.notes ?? '',
      owner: pb.authStore.record?.id,
    })
  } catch {
    // Silently fail — audit logging should never break user flow
  }
}
