import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  editMode?: boolean
  onSubmit: (values: CycleFormValues) => Promise<void> | void
}

export default function CycleForm({
  defaultValues,
  submitLabel,
  editMode = false,
  onSubmit,
}: CycleFormProps) {
  const { t } = useTranslation()
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
  const finalSubmitLabel = submitLabel ?? (editMode ? t('cycleForm.updateCycle') : t('common.save'))

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      {!editMode && (
        <>
          <div>
            <label htmlFor="cycle-name" className="block text-sm text-text-secondary mb-1">
              {t('cycleForm.name')}
            </label>
            <input
              id="cycle-name"
              {...register('name', { required: t('cycleForm.nameRequired') })}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
              placeholder={t('cycleForm.namePlaceholder')}
            />
            {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="cycle-mode" className="block text-sm text-text-secondary mb-1">
              {t('cycleForm.contributionMode')}
            </label>
            <select
              id="cycle-mode"
              {...register('contributionMode', { required: true })}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
            >
              <option value="fixed">{t('cycleForm.fixedLabel')}</option>
              <option value="flex">{t('cycleForm.flexLabel')}</option>
            </select>
          </div>
        </>
      )}

      {contributionMode === 'fixed' && (
        <div>
          <label htmlFor="cycle-amount" className="block text-sm text-text-secondary mb-1">
            {t('cycleForm.amountPerPerson')}
          </label>
          <input
            id="cycle-amount"
            type="number"
            min={1}
            {...register('fixedAmountPerPerson', {
              required: contributionMode === 'fixed' ? t('cycleForm.amountRequired') : false,
              valueAsNumber: true,
              min: { value: 1, message: t('cycleForm.amountMin') },
            })}
            className="w-full px-3 py-2.5 border border-border rounded-lg"
            placeholder={t('cycleForm.amountPlaceholder')}
          />
          {errors.fixedAmountPerPerson && (
            <p className="text-xs text-red-700 mt-1">{errors.fixedAmountPerPerson.message}</p>
          )}
        </div>
      )}

      {!editMode && (
        <>
          <div>
            <label htmlFor="cycle-frequency" className="block text-sm text-text-secondary mb-1">
              {t('cycleForm.frequency')}
            </label>
            <select
              id="cycle-frequency"
              {...register('frequency', { required: true })}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
            >
              <option value="weekly">{t('frequency.weekly')}</option>
              <option value="biweekly">{t('frequency.biweekly')}</option>
              <option value="monthly">{t('frequency.monthly')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="cycle-rounds" className="block text-sm text-text-secondary mb-1">
              {t('cycleForm.rounds')}
            </label>
            <input
              id="cycle-rounds"
              type="number"
              min={1}
              max={60}
              {...register('totalRounds', {
                required: t('cycleForm.roundsRequired'),
                valueAsNumber: true,
                min: { value: 1, message: t('cycleForm.roundsMin') },
              })}
              className="w-full px-3 py-2.5 border border-border rounded-lg"
              placeholder={t('cycleForm.roundsPlaceholder')}
            />
            {errors.totalRounds && (
              <p className="text-xs text-red-700 mt-1">{errors.totalRounds.message}</p>
            )}
          </div>
        </>
      )}

      <div>
        <label htmlFor="cycle-start-date" className="block text-sm text-text-secondary mb-1">
          {t('cycleForm.startDate')}
        </label>
        <input
          id="cycle-start-date"
          type="date"
          {...register('startDate', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        />
      </div>

      <div>
        <label htmlFor="cycle-default-method" className="block text-sm text-text-secondary mb-1">
          {t('cycleForm.defaultMethod')}
        </label>
        <select
          id="cycle-default-method"
          {...register('defaultPaymentMethod', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
        >
          <option value="cash">{t('payment.cash')}</option>
          <option value="bank_transfer">{t('payment.bank_transfer')}</option>
          <option value="mobile_money">{t('payment.mobile_money')}</option>
        </select>
      </div>

      {!editMode && (
        <div className="border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setShowTerms((s) => !s)}
            className="w-full px-3 py-2 text-sm text-text-secondary flex items-center justify-between"
          >
            <span>{t('cycleForm.termsTitle')}</span>
            <span>{showTerms ? '▲' : '▼'}</span>
          </button>
          {showTerms && (
            <div className="px-3 pb-3 space-y-3 border-t border-border">
              <div className="pt-2">
                <label htmlFor="terms-late" className="block text-sm text-text-secondary mb-1">
                  {t('cycleForm.latePolicy')}
                </label>
                <textarea
                  id="terms-late"
                  {...register('termsLatePaymentPolicy')}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder={t('cycleForm.latePolicyPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="terms-fine" className="block text-sm text-text-secondary mb-1">
                  {t('cycleForm.fineAmount')}
                </label>
                <input
                  id="terms-fine"
                  type="number"
                  min={0}
                  {...register('termsFineAmount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder={t('cycleForm.finePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="terms-other" className="block text-sm text-text-secondary mb-1">
                  {t('cycleForm.otherRules')}
                </label>
                <textarea
                  id="terms-other"
                  {...register('termsOtherRules')}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder={t('cycleForm.otherRulesPlaceholder')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg bg-text-primary text-white disabled:opacity-50"
      >
        {isSubmitting ? t('common.loading') : finalSubmitLabel}
      </button>
    </form>
  )
}
