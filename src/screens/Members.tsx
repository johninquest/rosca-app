import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MemberForm, { type MemberFormValues } from '../components/MemberForm'
import { useCycleStore } from '../stores/useCycleStore'

export default function Members() {
  const { t } = useTranslation()
  const { members, cycles, loadAll, addMember, updateMember, addMemberToCycle } = useCycleStore()

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const [error, setError] = useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const handleSubmit = async (values: MemberFormValues) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member. Please try again.')
    }
  }

  const handleEditSubmit = async (memberId: string, values: MemberFormValues) => {
    setError(null)
    try {
      await updateMember(memberId, {
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
      })
      setEditingMemberId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member. Please try again.')
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
        <MemberForm onSubmit={handleSubmit} submitLabel={t('members.add')} cycles={cycles} />
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {members.length === 0 && (
          <p className="text-sm text-text-secondary p-4">{t('members.empty')}</p>
        )}
        {members.map((member) => (
          <div key={member.id} className="px-4 py-3 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">{member.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-text-secondary">{member.phone}</span>
                <button
                  type="button"
                  className="text-xs text-text-primary underline"
                  onClick={() => setEditingMemberId((current) => (current === member.id ? null : member.id))}
                >
                  Edit
                </button>
              </div>
            </div>

            {editingMemberId === member.id && (
              <div className="border border-border rounded-lg p-3 bg-background/40 space-y-2">
                <MemberForm
                  defaultValues={{
                    name: member.name,
                    phone: member.phone,
                    joinDate: member.joinDate.toISOString().slice(0, 10),
                  }}
                  submitLabel="Save changes"
                  onSubmit={(values) => handleEditSubmit(member.id, values)}
                />
                <button
                  type="button"
                  className="text-xs text-text-secondary underline"
                  onClick={() => setEditingMemberId(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
