import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

export interface CycleMemberFormValues {
  name: string
  phone?: string
  joinDate: string
  contributionAmount: number
}

interface CycleMemberFormProps {
  defaultValues?: Partial<CycleMemberFormValues>
  defaultAmount?: number
  defaultJoinDate?: string
  submitLabel?: string
  lockContributionAmount?: boolean
  onSubmit: (values: CycleMemberFormValues) => Promise<void> | void
}

export default function CycleMemberForm({
  defaultValues,
  defaultAmount,
  defaultJoinDate,
  submitLabel,
  lockContributionAmount = false,
  onSubmit,
}: CycleMemberFormProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CycleMemberFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      phone: defaultValues?.phone || '',
      joinDate: defaultValues?.joinDate || defaultJoinDate || new Date().toISOString().slice(0, 10),
      contributionAmount: defaultValues?.contributionAmount ?? defaultAmount,
    },
  })

  const finalSubmitLabel = submitLabel ?? t('memberForm.addMember')

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label htmlFor="cm-name" className="block text-sm text-text-secondary mb-1">
          {t('memberForm.name')}
        </label>
        <input
          id="cm-name"
          {...register('name', { required: t('memberForm.nameRequired') })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder={t('memberForm.namePlaceholder')}
        />
        {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="cm-phone" className="block text-sm text-text-secondary mb-1">
          {t('memberForm.phone')} <span className="text-text-secondary font-normal">{t('memberForm.phoneOptional')}</span>
        </label>
        <input
          id="cm-phone"
          {...register('phone')}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder={t('memberForm.phonePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="cm-amount" className="block text-sm text-text-secondary mb-1">
          {t('memberForm.amount')}
        </label>
        <input
          id="cm-amount"
          type="number"
          min={1}
          {...register('contributionAmount', {
            required: t('memberForm.amountRequired'),
            valueAsNumber: true,
            min: { value: 1, message: t('memberForm.amountMin') },
          })}
          disabled={lockContributionAmount}
          className="w-full px-3 py-2.5 border border-border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={t('memberForm.amountPlaceholder')}
        />
        {lockContributionAmount && (
          <p className="text-xs text-text-secondary mt-1 italic">
            {t('memberForm.amountLockedHint')}
          </p>
        )}
        {errors.contributionAmount && (
          <p className="text-xs text-red-700 mt-1">{errors.contributionAmount.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cm-join-date" className="block text-sm text-text-secondary mb-1">
          {t('memberForm.joinDate')}
        </label>
        <input
          id="cm-join-date"
          type="date"
          {...register('joinDate', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg bg-text-primary text-white disabled:opacity-50"
      >
        {isSubmitting ? t('memberForm.saving') : finalSubmitLabel}
      </button>
    </form>
  )
}
