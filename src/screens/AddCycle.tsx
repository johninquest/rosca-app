import { useTranslation } from 'react-i18next'
import CycleForm, { type CycleFormValues } from '../components/CycleForm'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function AddCycle() {
  const { t } = useTranslation()
  const { goDashboard } = useAppStore()
  const { members, addCycle } = useCycleStore()

  const handleSubmit = async (values: CycleFormValues) => {
    await addCycle({
      name: values.name,
      amountPerPerson: values.amountPerPerson,
      frequency: values.frequency,
      startDate: new Date(values.startDate),
      status: 'active',
      memberIds: values.memberIds,
      payoutOrder: values.memberIds,
      endDate: undefined,
    })
    goDashboard()
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('dashboard.newCycle')}</h1>
      <div className="bg-white border border-border rounded-xl p-4">
        {members.length === 0 ? (
          <p className="text-sm text-text-secondary mb-3">{t('members.emptyHint')}</p>
        ) : null}
        <CycleForm members={members} onSubmit={handleSubmit} submitLabel={t('common.save')} />
      </div>
      <button type="button" onClick={goDashboard} className="w-full py-2.5 border border-border rounded-xl text-sm">
        {t('common.cancel')}
      </button>
    </section>
  )
}
