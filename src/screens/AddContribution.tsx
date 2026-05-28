import { useMemo } from 'react'
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

  const handleSubmit = async (values: ContributionFormValues) => {
    await addContribution({
      cycleId: cycle.id,
      memberId: values.memberId,
      amount: values.amount,
      date: new Date(values.date),
      method: values.method,
      notes: values.notes ?? '',
    })
    goDashboard()
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('cycle.addContribution')}</h1>
      <div className="bg-white border border-border rounded-xl p-4">
        <ContributionForm members={cycleMembers} onSubmit={handleSubmit} submitLabel={t('common.save')} />
      </div>
      <button type="button" onClick={goDashboard} className="w-full py-2.5 border border-border rounded-xl text-sm">
        {t('common.cancel')}
      </button>
    </section>
  )
}
