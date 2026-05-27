import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

export default function Dashboard() {
  const { t } = useTranslation()
  const { cycles, isLoading, loadAll, getCycleTotal } = useCycleStore()
  const { openCycleDetail, setScreen } = useAppStore()

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{t('dashboard.title')}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScreen('addCycle')}
            className="px-3 py-2 rounded-lg border border-border text-sm"
          >
            {t('dashboard.newCycle')}
          </button>
          <button
            type="button"
            onClick={() => setScreen('members')}
            className="px-3 py-2 rounded-lg border border-border text-sm"
          >
            {t('dashboard.members')}
          </button>
          <button
            type="button"
            onClick={() => setScreen('settings')}
            className="px-3 py-2 rounded-lg border border-border text-sm"
          >
            {t('dashboard.settings')}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-text-secondary text-sm">{t('common.loading')}</p>}

      {!isLoading && cycles.length === 0 && (
        <div className="bg-white border border-border rounded-xl p-4 text-text-secondary">
          {t('dashboard.empty')}
        </div>
      )}

      <div className="space-y-3">
        {cycles.map((cycle) => (
          <button
            key={cycle.id}
            type="button"
            onClick={() => openCycleDetail(cycle.id)}
            className="w-full text-left bg-white border border-border rounded-xl p-4 hover:border-text-primary transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-text-primary">{cycle.name}</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-[#F0F0F0] text-text-secondary">
                {cycle.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-2">
              {t('cycle.total')}: {getCycleTotal(cycle.id).toLocaleString()} XAF
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {t('cycle.round')}: {cycle.currentRound}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
