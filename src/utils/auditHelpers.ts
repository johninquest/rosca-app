import type { AuditLog, CycleMember } from '../types'
import { formatAmount, formatDate } from './format'

type TFunction = (key: string, options?: Record<string, unknown>) => string

/** Fields to hide from the expanded detail view */
const HIDDEN_FIELDS = new Set([
  'id', 'cycleId', 'owner', 'deletedAt', 'recordId',
  'tableName', 'action', 'performedBy', 'performedAt',
  'notes', 'payoutOrder',
])

/** Fields that represent monetary amounts */
const AMOUNT_FIELDS = new Set([
  'amount', 'contributionAmount', 'fixedAmountPerPerson', 'fineAmount',
])

/**
 * Map a technical field name to a human-readable i18n key.
 */
export function getFieldLabelKey(field: string): string {
  const map: Record<string, string> = {
    name: 'audit.field.name',
    phone: 'audit.field.phone',
    joinDate: 'audit.field.joinDate',
    contributionAmount: 'audit.field.contributionAmount',
    amount: 'audit.field.amount',
    date: 'audit.field.date',
    roundNumber: 'audit.field.roundNumber',
    method: 'audit.field.method',
    notes: 'audit.field.notes',
    memberId: 'audit.field.member',
    contributionMode: 'audit.field.contributionMode',
    frequency: 'audit.field.frequency',
    startDate: 'audit.field.startDate',
    endDate: 'audit.field.endDate',
    status: 'audit.field.status',
    totalRounds: 'audit.field.totalRounds',
    closedRounds: 'audit.field.closedRounds',
    defaultPaymentMethod: 'audit.field.defaultPaymentMethod',
    termsLatePaymentPolicy: 'audit.field.latePolicy',
    termsFineAmount: 'audit.field.fineAmount',
    termsOtherRules: 'audit.field.otherRules',
    terms: 'audit.field.terms',
  }
  return map[field] ?? `audit.field.${field}`
}

/**
 * Format a field value for display, using context-aware formatting
 * (amounts → currency, memberIds → names, dates → localized, etc.).
 */
export function formatFieldValue(
  field: string,
  value: unknown,
  t: TFunction,
  members: CycleMember[],
): string {
  if (value == null || value === '') return '—'

  if (AMOUNT_FIELDS.has(field)) {
    return formatAmount(Number(value))
  }

  if (field === 'memberId') {
    const member = members.find((m) => m.id === value)
    return member?.name ?? String(value)
  }

  if (field === 'method' || field === 'defaultPaymentMethod') {
    return t(`payment.${value}`)
  }

  if (field === 'frequency') {
    return t(`frequency.${value}`)
  }

  if (field === 'contributionMode') {
    return value === 'flex'
      ? t('cycleForm.flexLabel')
      : t('cycleForm.fixedLabel')
  }

  if (field === 'status') {
    return value === 'completed'
      ? t('cycle.round.closed')
      : t('cycle.round.open')
  }

  if (field === 'date' || field === 'joinDate' || field === 'startDate' || field === 'endDate') {
    return formatDate(value as string | Date)
  }

  if (field === 'closedRounds' && Array.isArray(value)) {
    return (value as number[]).join(', ') || '—'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

/**
 * Format a Date or ISO string as a localized date + time string.
 */
export function formatAuditDateTime(value: Date | string, locale: string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
  const datePart = date.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

/**
 * Compute the list of fields that changed between old and new values,
 * filtering out internal/hidden fields and unchanged values.
 */
export function getChangedFields(
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  if (!oldValues || !newValues) return []

  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue

    const oldVal = oldValues[key]
    const newVal = newValues[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal })
    }
  }

  return changes
}

/**
 * Get the i18n key for the audit log summary message.
 */
export function getAuditSummaryKey(log: AuditLog): string {
  // Special case: round closed (detected from notes)
  if (
    log.tableName === 'cycles' &&
    log.action === 'update' &&
    log.notes?.startsWith('Closed round')
  ) {
    return 'audit.summary.roundClosed'
  }

  const actionMap: Record<string, Record<string, string>> = {
    create: {
      cycles: 'audit.summary.cycleCreated',
      cycle_members: 'audit.summary.memberAdded',
      contributions: 'audit.summary.contributionRecorded',
      payouts: 'audit.summary.payoutRecorded',
    },
    update: {
      cycles: 'audit.summary.cycleUpdated',
      cycle_members: 'audit.summary.memberUpdated',
      contributions: 'audit.summary.contributionUpdated',
      payouts: 'audit.summary.payoutUpdated',
    },
    delete: {
      cycles: 'audit.summary.cycleDeleted',
      cycle_members: 'audit.summary.memberRemoved',
      contributions: 'audit.summary.contributionDeleted',
      payouts: 'audit.summary.payoutDeleted',
    },
  }

  return actionMap[log.action]?.[log.tableName] ?? 'audit.summary.generic'
}

/**
 * Extract interpolation values from the audit log for use in i18n templates.
 */
export function getAuditContext(
  log: AuditLog,
  members: CycleMember[],
): Record<string, string> {
  const values = log.newValues ?? log.oldValues ?? {}
  const memberId = (values as Record<string, unknown>).memberId as string | undefined
  const member = memberId ? members.find((m) => m.id === memberId) : null

  const ctx: Record<string, string> = {}

  if (member) ctx.name = member.name
  if (typeof (values as Record<string, unknown>).name === 'string') {
    ctx.name = (values as Record<string, unknown>).name as string
  }
  if (typeof (values as Record<string, unknown>).amount === 'number') {
    ctx.amount = formatAmount((values as Record<string, unknown>).amount as number)
  }
  if ((values as Record<string, unknown>).roundNumber != null) {
    ctx.round = String((values as Record<string, unknown>).roundNumber)
  }

  // Extract round number from "Closed round X" notes
  if (log.notes?.startsWith('Closed round')) {
    const match = log.notes.match(/Closed round (\d+)/)
    if (match) ctx.round = match[1]
  }

  return ctx
}

/**
 * Get the fields to display in the expanded detail view.
 * For updates: only changed fields.
 * For creates/deletes: all meaningful fields from the values.
 */
export function getDetailFields(
  log: AuditLog,
): Array<{ field: string; value: unknown }> {
  if (log.action === 'update') {
    const changes = getChangedFields(log.oldValues, log.newValues)
    return changes.map((c) => ({ field: c.field, value: c.newValue }))
  }

  const values = log.newValues ?? log.oldValues ?? {}
  return Object.entries(values)
    .filter(([key]) => !HIDDEN_FIELDS.has(key))
    .map(([field, value]) => ({ field, value }))
}
