import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ConfirmDialog from '../components/ConfirmDialog'
import { pb } from '../services/pocketbase'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function Members() {
  const { t } = useTranslation()
  const { members, cycles, loadAll, deleteMember } = useCycleStore()
  const { openAddMember, openEditMember } = useAppStore()
  const [memberToDeleteId, setMemberToDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const memberToDelete = useMemo(
    () => members.find((member) => member.id === memberToDeleteId) ?? null,
    [memberToDeleteId, members],
  )

  const memberCycles = useMemo(
    () => (memberToDelete ? cycles.filter((cycle) => cycle.memberIds.includes(memberToDelete.id)) : []),
    [cycles, memberToDelete],
  )

  const canDeleteMember = memberToDelete
    ? !memberToDelete.owner || memberToDelete.owner === pb.authStore.record?.id
    : false

  const handleDeleteMember = async () => {
    if (!memberToDelete) return
    if (!canDeleteMember) return

    setError(null)
    setIsDeleting(true)
    try {
      await deleteMember(memberToDelete.id)
      setMemberToDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('members.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteMessage = memberCycles.length > 0
    ? `${t('members.deleteConfirmMessage')}\n\n${t('members.deleteConfirmCycles')}\n${memberCycles.map((cycle) => `- ${cycle.name}`).join('\n')}`
    : `${t('members.deleteConfirmMessage')}\n\n${t('members.deleteConfirmNoCycles')}`

  return (
    <section className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{t('members.title')}</h1>
        <button
          type="button"
          onClick={openAddMember}
          className="px-3 py-2 rounded-lg border border-border text-sm text-text-primary"
        >
          {t('members.add')}
        </button>
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-none p-4">
            {error}
          </p>
        )}
        {members.length === 0 && (
          <p className="text-sm text-text-secondary p-4">{t('members.empty')}</p>
        )}
        {members.map((member) => (
          <div key={member.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium text-text-primary">{member.name}</p>
              <p className="text-text-secondary">{member.phone || 'No phone'}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {cycles
                  .filter((cycle) => cycle.memberIds.includes(member.id))
                  .map((cycle) => (
                    <span
                      key={cycle.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-[#F0F0F0] text-text-secondary"
                    >
                      {cycle.name}
                    </span>
                  ))}
                {cycles.every((cycle) => !cycle.memberIds.includes(member.id)) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F7F7F7] text-text-secondary">
                    No cycle
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="text-xs text-text-primary underline"
                onClick={() => openEditMember(member.id)}
              >
                Edit
              </button>
              {(!member.owner || member.owner === pb.authStore.record?.id) && (
                <button
                  type="button"
                  className="text-xs text-red-700 underline"
                  onClick={() => setMemberToDeleteId(member.id)}
                >
                  {t('members.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(memberToDelete)}
        title={t('members.deleteConfirmTitle', { name: memberToDelete?.name ?? '' })}
        message={deleteMessage}
        onCancel={() => setMemberToDeleteId(null)}
        onConfirm={() => void handleDeleteMember()}
        danger
      />
    </section>
  )
}
