import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import CycleForm, { type CycleFormValues } from '../components/CycleForm'
import { useCycleStore } from '../stores/useCycleStore'

export default function AddCycle() {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const { addCycle } = useCycleStore()

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: CycleFormValues) => {
    setError(null)
    try {
      await addCycle({
        name: values.name,
        contributionMode: values.contributionMode,
        fixedAmountPerPerson: values.fixedAmountPerPerson,
        frequency: values.frequency,
        defaultPaymentMethod: values.defaultPaymentMethod,
        startDate: new Date(values.startDate),
        status: 'active',
        totalRounds: values.totalRounds,
        terms: {
          latePaymentPolicy: values.termsLatePaymentPolicy,
          fineAmount: values.termsFineAmount,
          otherRules: values.termsOtherRules,
        },
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cycle. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('dashboard.newCycle')}</h1>
      <div className="bg-white border border-border rounded-xl p-4">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
        )}
        <CycleForm onSubmit={handleSubmit} submitLabel={t('common.save')} />
      </div>
      <button type="button" onClick={() => navigate('/')} className="w-full py-2.5 border border-border rounded-xl text-sm">
        {t('common.cancel')}
      </button>
    </section>
  )
}
