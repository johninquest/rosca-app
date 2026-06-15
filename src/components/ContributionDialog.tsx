import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contribution, Cycle, CycleMember, PaymentMethod } from '../types'
import { todayISO } from '../utils/format'

interface ContributionDialogProps {
  open: boolean
  cycle: Cycle
  member: CycleMember
  roundNumber: number
  existingContribution?: Contribution | null
  onSave: (data: {
    amount: number
    method: PaymentMethod
    date: Date
    notes: string
  }) => Promise<void> | void
  onCancel: () => void
}

export default function ContributionDialog({
  open,
  cycle,
  member,
  roundNumber,
  existingContribution,
  onSave,
  onCancel,
}: ContributionDialogProps) {
  const { t } = useTranslation()
  const isEditMode = Boolean(existingContribution)

  const [amount, setAmount] = useState<string>(
    existingContribution ? String(existingContribution.amount) : String(member.contributionAmount)
  )
  const [method, setMethod] = useState<PaymentMethod>(
    existingContribution ? existingContribution.method : cycle.defaultPaymentMethod
  )
  const [date, setDate] = useState<string>(
    existingContribution
      ? existingContribution.date.toISOString().slice(0, 10)
      : todayISO()
  )
  const [notes, setNotes] = useState<string>(existingContribution?.notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('contribution.amountMin'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        amount: parsedAmount,
        method,
        date: new Date(date),
        notes: notes.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contribution.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {isEditMode ? t('contribution.editTitle') : t('contribution.title')}
        </h2>

        <div className="text-sm text-text-secondary space-y-1">
          <p>
            <span className="font-medium">{member.name}</span> — {t('cycle.round')} {roundNumber}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="contribution-amount" className="block text-sm text-text-secondary mb-1">
              {t('contribution.amount')}
            </label>
            <input
              id="contribution-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
              placeholder="5000"
            />
          </div>

          <div>
            <label htmlFor="contribution-method" className="block text-sm text-text-secondary mb-1">
              {t('contribution.method')}
            </label>
            <select
              id="contribution-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
            >
              <option value="cash">{t('payment.cash')}</option>
              <option value="bank_transfer">{t('payment.bank_transfer')}</option>
              <option value="mobile_money">{t('payment.mobile_money')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="contribution-date" className="block text-sm text-text-secondary mb-1">
              {t('contribution.date')}
            </label>
            <input
              id="contribution-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="contribution-notes" className="block text-sm text-text-secondary mb-1">
              {t('contribution.notes')} <span className="text-text-secondary font-normal">({t('common.optional')})</span>
            </label>
            <input
              id="contribution-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
              placeholder={t('contribution.notesPlaceholder')}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-text-primary border border-border rounded-md hover:bg-bg transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-md bg-text-primary text-white hover:bg-ink-mid transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? t('common.loading')
              : isEditMode
              ? t('contribution.updatePayment')
              : t('contribution.savePayment')}
          </button>
        </div>
      </div>
    </div>
  )
}
