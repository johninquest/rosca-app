import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MemberForm, { type MemberFormValues } from '../components/MemberForm'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function EditMember() {
  const { t } = useTranslation()
  const { selectedMemberId, goMembers } = useAppStore()
  const { members, updateMember } = useCycleStore()
  const [error, setError] = useState<string | null>(null)

  const member = useMemo(
    () => members.find((item) => item.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  )

  if (!member) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-text-secondary">Member not found.</p>
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

  const onSubmit = async (values: MemberFormValues) => {
    setError(null)
    try {
      await updateMember(member.id, {
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
      })
      goMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Edit Member</h1>

      <div className="bg-white border border-border rounded-xl p-4">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
        )}
        <MemberForm
          defaultValues={{
            name: member.name,
            phone: member.phone,
            joinDate: member.joinDate.toISOString().slice(0, 10),
          }}
          submitLabel={t('common.save')}
          onSubmit={onSubmit}
        />
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
