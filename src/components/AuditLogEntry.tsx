import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuditLog, CycleMember } from '../types'
import {
  formatAuditDateTime,
  formatFieldValue,
  getAuditContext,
  getAuditSummaryKey,
  getChangedFields,
  getDetailFields,
  getFieldLabelKey,
} from '../utils/auditHelpers'

interface AuditLogEntryProps {
  log: AuditLog
  members: CycleMember[]
}

// Action icons
const IconPlus = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconEdit = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IconTrash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const IconChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconChevronDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export default function AuditLogEntry({ log, members }: AuditLogEntryProps) {
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const summaryKey = getAuditSummaryKey(log)
  const context = getAuditContext(log, members)
  const summary = t(summaryKey, context)
  const timestamp = formatAuditDateTime(log.performedAt, i18n.language)

  // Action icon and color
  const actionConfig = {
    create: { icon: <IconPlus />, color: 'text-green-600', bg: 'bg-green-50' },
    update: { icon: <IconEdit />, color: 'text-blue-600', bg: 'bg-blue-50' },
    delete: { icon: <IconTrash />, color: 'text-red-600', bg: 'bg-red-50' },
  }[log.action]

  // Get fields to display in expanded view
  const detailFields = getDetailFields(log)
  const changedFields = log.action === 'update' ? getChangedFields(log.oldValues, log.newValues) : []

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Action icon */}
        <div className={`shrink-0 w-8 h-8 rounded-full ${actionConfig.bg} ${actionConfig.color} flex items-center justify-center`}>
          {actionConfig.icon}
        </div>

        {/* Summary and timestamp */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary leading-tight">
            {summary}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {timestamp}
          </p>
        </div>

        {/* Chevron toggle */}
        <div className="shrink-0 text-text-secondary">
          {expanded ? <IconChevronDown /> : <IconChevronRight />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 pl-16 space-y-3">
          {/* Notes */}
          {log.notes && (
            <p className="text-xs text-text-secondary italic">
              {log.notes}
            </p>
          )}

          {/* Field changes for updates */}
          {log.action === 'update' && changedFields.length > 0 && (
            <div className="space-y-2">
              {changedFields.map(({ field, oldValue, newValue }) => (
                <div key={field} className="text-xs">
                  <span className="font-medium text-text-primary">
                    {t(getFieldLabelKey(field))}:
                  </span>
                  <div className="mt-1 space-y-1 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">{t('audit.diff.from')}:</span>
                      <span className="text-red-600 line-through">
                        {formatFieldValue(field, oldValue, t, members)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">{t('audit.diff.to')}:</span>
                      <span className="text-green-600 font-medium">
                        {formatFieldValue(field, newValue, t, members)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full details for creates/deletes */}
          {(log.action === 'create' || log.action === 'delete') && detailFields.length > 0 && (
            <div className="space-y-2">
              {detailFields.map(({ field, value }) => (
                <div key={field} className="text-xs flex gap-2">
                  <span className="font-medium text-text-primary min-w-30">
                    {t(getFieldLabelKey(field))}:
                  </span>
                  <span className="text-text-secondary">
                    {formatFieldValue(field, value, t, members)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* No changes message */}
          {log.action === 'update' && changedFields.length === 0 && (
            <p className="text-xs text-text-secondary">
              {t('audit.details.noChanges')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
