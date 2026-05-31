import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContributionForm, { type ContributionFormValues } from '../components/ContributionForm'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function AddContribution() {
  const { t } = useTranslation()
  const { selectedCycleId, goDashboard } = useAppStore()
  const { cycles, members, addContribution } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId],
  )

  if (!cycle) {
    return <p className="text-sm text-text-secondary">Cycle introuvable.</p>
  }

  const cycleMembers = members.filter((member) => cycle.memberIds.includes(member.id))

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: ContributionFormValues) => {
    setError(null)
    try {
      await addContribution({
        cycleId: cycle.id,
        memberId: values.memberId,
        amount: values.amount,
        date: new Date(values.date),
        method: values.method,
        notes: values.notes ?? '',
      })
      goDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contribution. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('cycle.addContribution')}</h1>
      <div className="bg-white border border-border rounded-xl p-4">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
        )}
        <ContributionForm members={cycleMembers} onSubmit={handleSubmit} submitLabel={t('common.save')} />
      </div>
      <button type="button" onClick={goDashboard} className="w-full py-2.5 border border-border rounded-xl text-sm">
        {t('common.cancel')}
      </button>
    </section>
  )
}
