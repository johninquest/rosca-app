import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function CycleDetail() {
  const { t } = useTranslation()
  const { selectedCycleId, setScreen } = useAppStore()
  const { cycles, members, getMemberTotal, getCycleTotal } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === selectedCycleId) || null,
    [cycles, selectedCycleId],
  )

  if (!cycle) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 text-text-secondary">
        Cycle introuvable.
      </div>
    )
  }

  const cycleMembers = members.filter((member) => cycle.memberIds.includes(member.id))

  return (
    <section className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-4">
        <h1 className="text-xl font-semibold text-text-primary">{cycle.name}</h1>
        <p className="text-sm text-text-secondary mt-2">
          {t('cycle.total')}: {getCycleTotal(cycle.id).toLocaleString()} XAF
        </p>
        <p className="text-sm text-text-secondary mt-1">
          {t('cycle.round')}: {cycle.currentRound}
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl p-4">
        <h2 className="font-semibold text-text-primary mb-3">{t('cycle.members')}</h2>
        <div className="space-y-2">
          {cycleMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{member.name}</span>
              <span className="text-text-secondary">
                {getMemberTotal(member.id, cycle.id).toLocaleString()} XAF
              </span>
            </div>
          ))}
          {cycleMembers.length === 0 && (
            <p className="text-sm text-text-secondary">{t('members.empty')}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setScreen('addContribution')}
        className="w-full py-3 rounded-xl bg-text-primary text-white font-semibold"
      >
        {t('cycle.addContribution')}
      </button>
    </section>
  )
}
