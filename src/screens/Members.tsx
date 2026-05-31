import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MemberForm, { type MemberFormValues } from '../components/MemberForm'
import { useCycleStore } from '../stores/useCycleStore'

export default function Members() {
  const { t } = useTranslation()
  const { members, loadAll, addMember } = useCycleStore()

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: MemberFormValues) => {
    setError(null)
    try {
      await addMember({
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('members.title')}</h1>

      <div className="bg-white border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-text-primary mb-3">{t('members.add')}</p>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
        )}
        <MemberForm onSubmit={handleSubmit} submitLabel={t('members.add')} />
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {members.length === 0 && (
          <p className="text-sm text-text-secondary p-4">{t('members.empty')}</p>
        )}
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-text-primary">{member.name}</span>
            <span className="text-text-secondary">{member.phone}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
