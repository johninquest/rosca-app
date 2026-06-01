import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function Members() {
  const { t } = useTranslation()
  const { members, cycles, loadAll } = useCycleStore()
  const { openAddMember, openEditMember } = useAppStore()

  useEffect(() => {
    void loadAll()
  }, [loadAll])

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
        {members.length === 0 && (
          <p className="text-sm text-text-secondary p-4">{t('members.empty')}</p>
        )}
        {members.map((member) => (
          <div key={member.id} className="px-4 py-3 text-sm flex items-start justify-between gap-3">
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
            <button
              type="button"
              className="text-xs text-text-primary underline"
              onClick={() => openEditMember(member.id)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
