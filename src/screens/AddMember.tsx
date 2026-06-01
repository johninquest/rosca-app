import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MemberForm, { type MemberFormValues } from '../components/MemberForm'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function AddMember() {
  const { t } = useTranslation()
  const { cycles, addMember, addMemberToCycle } = useCycleStore()
  const { goMembers } = useAppStore()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (values: MemberFormValues) => {
    setError(null)
    try {
      const member = await addMember({
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
      })

      if (values.cycleId) {
        await addMemberToCycle(values.cycleId, member.id)
      }

      goMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('members.add')}</h1>

      <div className="bg-white border border-border rounded-xl p-4">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
        )}
        <MemberForm onSubmit={onSubmit} submitLabel={t('common.save')} cycles={cycles} />
      </div>

      <button
        type="button"
        onClick={goMembers}
        className="w-full py-2.5 border border-border rounded-xl text-sm"
      >
        {t('common.cancel')}
      </button>
    </section>
  )
}
