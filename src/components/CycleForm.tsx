import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ContributionMode, CycleFrequency, PaymentMethod } from '../types'

export interface CycleFormValues {
  name: string
  contributionMode: ContributionMode
  fixedAmountPerPerson?: number
  frequency: CycleFrequency
  startDate: string
  totalRounds: number
  defaultPaymentMethod: PaymentMethod
  termsLatePaymentPolicy?: string
  termsFineAmount?: number
  termsOtherRules?: string
}

interface CycleFormProps {
  defaultValues?: Partial<CycleFormValues>
  submitLabel?: string
  onSubmit: (values: CycleFormValues) => Promise<void> | void
}

export default function CycleForm({
  defaultValues,
  submitLabel = 'Save',
  onSubmit,
}: CycleFormProps) {
  const [showTerms, setShowTerms] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      contributionMode: defaultValues?.contributionMode || 'fixed',
      fixedAmountPerPerson: defaultValues?.fixedAmountPerPerson,
      frequency: defaultValues?.frequency || 'monthly',
      startDate: defaultValues?.startDate || new Date().toISOString().slice(0, 10),
      totalRounds: defaultValues?.totalRounds ?? 12,
      defaultPaymentMethod: defaultValues?.defaultPaymentMethod || 'cash',
      termsLatePaymentPolicy: defaultValues?.termsLatePaymentPolicy || '',
      termsFineAmount: defaultValues?.termsFineAmount,
      termsOtherRules: defaultValues?.termsOtherRules || '',
    },
  })

  const contributionMode = watch('contributionMode')

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label htmlFor="cycle-name" className="block text-sm text-text-secondary mb-1">Cycle name</label>
        <input
          id="cycle-name"
          {...register('name', { required: 'Name is required' })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Family Njangi 2026"
        />
        {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="cycle-mode" className="block text-sm text-text-secondary mb-1">Contribution mode</label>
        <select
          id="cycle-mode"
          {...register('contributionMode', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
        >
          <option value="fixed">Fixed — everyone pays the same amount</option>
          <option value="flex">Flexible — each member pays their own amount</option>
        </select>
      </div>

      {contributionMode === 'fixed' && (
        <div>
          <label htmlFor="cycle-amount" className="block text-sm text-text-secondary mb-1">Amount per person (XAF)</label>
          <input
            id="cycle-amount"
            type="number"
            min={1}
            {...register('fixedAmountPerPerson', {
              required: contributionMode === 'fixed' ? 'Amount is required' : false,
              valueAsNumber: true,
              min: { value: 1, message: 'Minimum is 1' },
            })}
            className="w-full px-3 py-2.5 border border-border rounded-lg"
            placeholder="5000"
          />
          {errors.fixedAmountPerPerson && (
            <p className="text-xs text-red-700 mt-1">{errors.fixedAmountPerPerson.message}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="cycle-frequency" className="block text-sm text-text-secondary mb-1">Frequency</label>
        <select
          id="cycle-frequency"
          {...register('frequency', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label htmlFor="cycle-rounds" className="block text-sm text-text-secondary mb-1">Number of rounds</label>
        <input
          id="cycle-rounds"
          type="number"
          min={1}
          max={60}
          {...register('totalRounds', {
            required: 'Number of rounds is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Minimum is 1' },
          })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="12"
        />
        {errors.totalRounds && (
          <p className="text-xs text-red-700 mt-1">{errors.totalRounds.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cycle-start-date" className="block text-sm text-text-secondary mb-1">Start date</label>
        <input
          id="cycle-start-date"
          type="date"
          {...register('startDate', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        />
      </div>

      <div>
        <label htmlFor="cycle-default-method" className="block text-sm text-text-secondary mb-1">
          Default payment method
        </label>
        <select
          id="cycle-default-method"
          {...register('defaultPaymentMethod', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_money">Mobile money</option>
        </select>
      </div>

      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowTerms((s) => !s)}
          className="w-full px-3 py-2 text-sm text-text-secondary flex items-center justify-between"
        >
          <span>Terms & Rules (optional)</span>
          <span>{showTerms ? '▲' : '▼'}</span>
        </button>
        {showTerms && (
          <div className="px-3 pb-3 space-y-3 border-t border-border">
            <div className="pt-2">
              <label htmlFor="terms-late" className="block text-sm text-text-secondary mb-1">Late payment policy</label>
              <textarea
                id="terms-late"
                {...register('termsLatePaymentPolicy')}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="e.g. Late payment fine of 500 XAF after 5th of the month"
              />
            </div>
            <div>
              <label htmlFor="terms-fine" className="block text-sm text-text-secondary mb-1">Fine amount (XAF)</label>
              <input
                id="terms-fine"
                type="number"
                min={0}
                {...register('termsFineAmount', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="500"
              />
            </div>
            <div>
              <label htmlFor="terms-other" className="block text-sm text-text-secondary mb-1">Other rules</label>
              <textarea
                id="terms-other"
                {...register('termsOtherRules')}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="Any other rules for this cycle"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg bg-text-primary text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
