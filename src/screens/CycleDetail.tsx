import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'
import { exportCycleContributionsCSV, exportCycleContributionsPDF } from '../utils/export'
import { formatAmount } from '../utils/format'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'

export default function CycleDetail() {
  const { t } = useTranslation()
  const { selectedCycleId, setScreen, openAddPayout } = useAppStore()
  const { cycles, members, contributions, payouts, getMemberTotal, getCycleTotal, advanceRound } =
    useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId],
  )

  const cycleMembers = useMemo(
    () => (cycle ? members.filter((m) => cycle.memberIds.includes(m.id)) : []),
    [cycle, members],
  )

  const cycleContributions = useMemo(
    () => contributions.filter((c) => c.cycleId === selectedCycleId),
    [contributions, selectedCycleId],
  )

  const cyclePayouts = useMemo(
    () => payouts.filter((p) => p.cycleId === selectedCycleId),
    [payouts, selectedCycleId],
  )

  const currentRoundBeneficiary = useMemo(() => {
    if (!cycle || cycle.payoutOrder.length === 0) return null
    const idx = (cycle.currentRound - 1) % cycle.payoutOrder.length
    const memberId = cycle.payoutOrder[idx]
    return members.find((m) => m.id === memberId) ?? null
  }, [cycle, members])

  if (!cycle) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 text-text-secondary">
        Cycle introuvable.
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-border rounded-xl p-4 space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">{cycle.name}</h1>
        <p className="text-sm text-text-secondary">
          {t('cycle.total')}: {formatAmount(getCycleTotal(cycle.id))}
        </p>
        <p className="text-sm text-text-secondary">
          {t('cycle.round')}: {cycle.currentRound} / {cycle.payoutOrder.length}
        </p>
        {currentRoundBeneficiary && (
          <p className="text-sm font-medium text-text-primary">
            {t('cycle.beneficiary')}: {currentRoundBeneficiary.name}
          </p>
        )}
      </div>

      {/* Member contribution summary */}
      <div className="bg-white border border-border rounded-xl p-4">
        <h2 className="font-semibold text-text-primary mb-3">{t('cycle.members')}</h2>
        <div className="space-y-2">
          {cycleMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{member.name}</span>
              <span className="text-text-secondary">
                {formatAmount(getMemberTotal(member.id, cycle.id))}
              </span>
            </div>
          ))}
          {cycleMembers.length === 0 && (
            <p className="text-sm text-text-secondary">{t('members.empty')}</p>
          )}
        </div>
      </div>

      {/* Payouts history */}
      {cyclePayouts.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4">
          <h2 className="font-semibold text-text-primary mb-3">{t('payout.title')}</h2>
          <div className="space-y-2">
            {cyclePayouts.map((payout) => {
              const beneficiary = members.find((m) => m.id === payout.memberId)
              return (
                <div key={payout.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">
                    {t('cycle.round')} {payout.roundNumber} — {beneficiary?.name ?? '?'}
                  </span>
                  <span className="text-text-secondary">{formatAmount(payout.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Export / Share */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            const url = buildRoscaWhatsAppUrl({
              cycle,
              members: cycleMembers,
              contributions: cycleContributions,
              payouts: cyclePayouts,
            })
            window.open(url, '_blank', 'noopener,noreferrer')
          }}
          className="py-2 border border-border rounded-xl text-xs text-text-primary"
        >
          {t('cycle.shareWhatsApp')}
        </button>
        <button
          type="button"
          onClick={() => exportCycleContributionsCSV(cycle, cycleMembers, cycleContributions)}
          className="py-2 border border-border rounded-xl text-xs text-text-primary"
        >
          {t('cycle.exportCSV')}
        </button>
        <button
          type="button"
          onClick={() => exportCycleContributionsPDF(cycle, cycleMembers, cycleContributions)}
          className="py-2 border border-border rounded-xl text-xs text-text-primary"
        >
          {t('cycle.exportPDF')}
        </button>
      </div>

      {/* Primary actions */}
      <button
        type="button"
        onClick={() => setScreen('addContribution')}
        className="w-full py-3 rounded-xl bg-text-primary text-white font-semibold"
      >
        {t('cycle.addContribution')}
      </button>
      <button
        type="button"
        onClick={() => openAddPayout(cycle.id)}
        className="w-full py-3 rounded-xl border-2 border-text-primary text-text-primary font-semibold"
      >
        {t('cycle.addPayout')}
      </button>
      <button
        type="button"
        onClick={() => void advanceRound(cycle.id)}
        className="w-full py-2.5 rounded-xl border border-border text-text-secondary text-sm"
      >
        {t('cycle.advanceRound')}
      </button>
    </section>
  )
}
