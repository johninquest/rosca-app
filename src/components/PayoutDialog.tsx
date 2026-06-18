import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Cycle, CycleMember } from '../types'
import { todayISO } from '../utils/format'

interface PayoutDialogProps {
  open: boolean
  cycle: Cycle
  members: CycleMember[]
  roundNumber: number
  defaultAmount: number
  suggestedBeneficiaryId?: string | null
  onSave: (data: {
    memberId: string
    amount: number
    date: Date
  }) => Promise<void> | void
  onCancel: () => void
}

export default function PayoutDialog({
  open,
  cycle,
  members,
  roundNumber,
  defaultAmount,
  suggestedBeneficiaryId,
  onSave,
  onCancel,
}: PayoutDialogProps) {
  const { t } = useTranslation()

  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [amount, setAmount] = useState<string>(String(defaultAmount))
  const [date, setDate] = useState<string>(todayISO())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select suggested beneficiary when dialog opens
  useEffect(() => {
    if (open && suggestedBeneficiaryId) {
      setSelectedMemberId(suggestedBeneficiaryId)
    } else if (open) {
      setSelectedMemberId('')
    }
  }, [open, suggestedBeneficiaryId])

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)

    if (!selectedMemberId) {
      setError(t('payout.noMemberSelected'))
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('contribution.amountMin'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        memberId: selectedMemberId,
        amount: parsedAmount,
        date: new Date(date),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payout.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('payout.addTitle')}
        </h2>

        <div className="text-sm text-text-secondary space-y-1">
          <p>
            {cycle.name} — {t('cycle.round')} {roundNumber}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="payout-member" className="block text-sm text-text-secondary mb-1">
              {t('payout.selectBeneficiary')}
            </label>
            <select
              id="payout-member"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
            >
              <option value="">{t('payout.selectBeneficiary')}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payout-amount" className="block text-sm text-text-secondary mb-1">
              {t('payout.amount')}
            </label>
            <input
              id="payout-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
              placeholder="5000"
            />
          </div>

          <div>
            <label htmlFor="payout-date" className="block text-sm text-text-secondary mb-1">
              {t('payout.date')}
            </label>
            <input
              id="payout-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-text-secondary disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-text-primary text-white text-sm disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('payout.recordButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
