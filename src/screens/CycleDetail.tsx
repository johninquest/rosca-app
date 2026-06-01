import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'
import { exportCycleContributionsCSV, exportCycleContributionsPDF } from '../utils/export'
import { formatAmount } from '../utils/format'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'

export default function CycleDetail() {
  const { t } = useTranslation()
  const { selectedCycleId, openAddPayout } = useAppStore()
  const {
    cycles,
    members,
    contributions,
    payouts,
    getMemberTotal,
    getCycleTotal,
    advanceRound,
    addMemberToCycle,
    addContribution,
    updateContribution,
    deleteContribution,
  } = useCycleStore()

  const [selectedNewMemberId, setSelectedNewMemberId] = useState('')
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({})
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null)
  const [editMethod, setEditMethod] = useState<'cash' | 'mtn' | 'orange' | 'other'>('cash')
  const [editNotes, setEditNotes] = useState('')
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const availableMembers = useMemo(
    () => (cycle ? members.filter((m) => !cycle.memberIds.includes(m.id)) : []),
    [cycle, members],
  )

  const rounds = useMemo(() => {
    if (!cycle) return []
    return Array.from({ length: cycle.currentRound }, (_, idx) => idx + 1)
  }, [cycle])

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

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [round]: !(prev[round] ?? round === cycle.currentRound),
    }))
  }

  const isRoundExpanded = (round: number) => expandedRounds[round] ?? round === cycle.currentRound

  const getRoundContribution = (memberId: string, roundNumber: number) => {
    return cycleContributions.find(
      (item) => item.memberId === memberId && item.roundNumber === roundNumber,
    )
  }

  const currentRoundContributions = cycleContributions.filter(
    (item) => item.roundNumber === cycle.currentRound,
  )
  const currentRoundCollected = currentRoundContributions.reduce((sum, item) => sum + item.amount, 0)
  const currentRoundExpected = cycleMembers.length * cycle.amountPerPerson

  const beginEditContribution = (contributionId: string) => {
    const contribution = cycleContributions.find((item) => item.id === contributionId)
    if (!contribution) return
    setEditingContributionId(contribution.id)
    setEditMethod(contribution.method)
    setEditNotes(contribution.notes ?? '')
  }

  const saveContributionEdit = async () => {
    if (!editingContributionId) return
    setError(null)
    try {
      await updateContribution(editingContributionId, {
        method: editMethod,
        notes: editNotes,
      })
      setEditingContributionId(null)
      setEditNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contribution.')
    }
  }

  const toggleMemberPaid = async (memberId: string, isPaid: boolean) => {
    setError(null)
    setSavingMemberId(memberId)
    try {
      const existing = getRoundContribution(memberId, cycle.currentRound)
      if (!isPaid && existing) {
        await deleteContribution(existing.id)
      }

      if (isPaid && !existing) {
        await addContribution({
          cycleId: cycle.id,
          memberId,
          amount: cycle.amountPerPerson,
          date: new Date(),
          roundNumber: cycle.currentRound,
          method: 'cash',
          notes: '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status.')
    } finally {
      setSavingMemberId(null)
    }
  }

  return (
    <section className="space-y-4">
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

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      <div className="bg-white border border-border rounded-xl p-4">
        <h2 className="font-semibold text-text-primary mb-3">Current month collection</h2>
        <p className="text-sm text-text-secondary mb-3">
          Collected: {formatAmount(currentRoundCollected)} / {formatAmount(currentRoundExpected)}
        </p>

        <div className="space-y-2">
          {cycleMembers.map((member) => {
            const contribution = getRoundContribution(member.id, cycle.currentRound)
            const isPaid = Boolean(contribution)
            const isSaving = savingMemberId === member.id

            return (
              <div key={member.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-text-primary">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      disabled={isSaving}
                      onChange={(event) => {
                        void toggleMemberPaid(member.id, event.target.checked)
                      }}
                    />
                    {member.name}
                  </label>
                  <span className="text-text-secondary">{formatAmount(cycle.amountPerPerson)}</span>
                </div>

                {isPaid && contribution && (
                  <div className="text-xs text-text-secondary flex items-center justify-between gap-2">
                    <span>Method: {contribution.method}</span>
                    <button
                      type="button"
                      onClick={() => beginEditContribution(contribution.id)}
                      className="underline text-text-primary"
                    >
                      Edit contribution
                    </button>
                  </div>
                )}

                {editingContributionId === contribution?.id && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Method</label>
                      <select
                        value={editMethod}
                        onChange={(event) => {
                          setEditMethod(event.target.value as 'cash' | 'mtn' | 'orange' | 'other')
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="mtn">MTN</option>
                        <option value="orange">Orange</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Notes</label>
                      <input
                        value={editNotes}
                        onChange={(event) => setEditNotes(event.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveContributionEdit()}
                        className="px-3 py-2 rounded-lg bg-text-primary text-white text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingContributionId(null)}
                        className="px-3 py-2 rounded-lg border border-border text-xs text-text-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {cycleMembers.length === 0 && (
            <p className="text-sm text-text-secondary">{t('members.empty')}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-4">
        <h2 className="font-semibold text-text-primary mb-3">Members</h2>
        <div className="space-y-2">
          {cycleMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{member.name}</span>
              <span className="text-text-secondary">{formatAmount(getMemberTotal(member.id, cycle.id))}</span>
            </div>
          ))}
        </div>

        {availableMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-text-primary mb-2">Add member to this Njangi</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedNewMemberId}
                onChange={(e) => setSelectedNewMemberId(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-white text-sm"
              >
                <option value="">Select member</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedNewMemberId}
                onClick={async () => {
                  await addMemberToCycle(cycle.id, selectedNewMemberId)
                  setSelectedNewMemberId('')
                }}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-text-primary disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {rounds.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4">
          <h2 className="font-semibold text-text-primary mb-3">Monthly history</h2>
          <div className="space-y-2">
            {rounds.map((roundNumber) => {
              const roundContributions = cycleContributions.filter((c) => c.roundNumber === roundNumber)
              const roundPayout = cyclePayouts.find((p) => p.roundNumber === roundNumber)
              const roundCollected = roundContributions.reduce((sum, item) => sum + item.amount, 0)
              const beneficiary = roundPayout
                ? members.find((m) => m.id === roundPayout.memberId)
                : null

              return (
                <div key={roundNumber} className="border border-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleRound(roundNumber)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-sm"
                  >
                    <span className="text-text-primary font-medium">
                      Month {roundNumber}
                      {beneficiary ? ` - ${beneficiary.name}` : ''}
                    </span>
                    <span className="text-text-secondary">{formatAmount(roundCollected)}</span>
                  </button>

                  {isRoundExpanded(roundNumber) && (
                    <div className="border-t border-border px-3 py-2.5 space-y-2">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        Contributions
                      </p>
                      {roundContributions.length === 0 && (
                        <p className="text-sm text-text-secondary">No contributions recorded.</p>
                      )}
                      {roundContributions.map((contribution) => {
                        const contributor = members.find((m) => m.id === contribution.memberId)
                        return (
                          <div
                            key={contribution.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-text-primary">
                              {contributor?.name ?? 'Unknown'} ({contribution.method})
                            </span>
                            <span className="text-text-secondary">
                              {formatAmount(contribution.amount)}
                            </span>
                          </div>
                        )
                      })}

                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide pt-1">
                        Payout
                      </p>
                      {roundPayout ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-primary">{beneficiary?.name ?? 'Unknown'}</span>
                          <span className="text-text-secondary">{formatAmount(roundPayout.amount)}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary">No payout recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
