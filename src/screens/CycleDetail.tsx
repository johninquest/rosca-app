import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'
import { exportCycleContributionsCSV, exportCycleContributionsPDF } from '../utils/export'
import { formatAmount, todayISO } from '../utils/format'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'

type ContributionMethod = 'cash' | 'mtn' | 'orange' | 'other'

export default function CycleDetail() {
  const { t } = useTranslation()
  const { selectedCycleId } = useAppStore()
  const {
    cycles,
    members,
    contributions,
    payouts,
    getMemberTotal,
    getCycleTotal,
    addMemberToCycle,
    addContribution,
    updateContribution,
    deleteContribution,
    addPayout,
    closeRound,
  } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId],
  )

  const [selectedNewMemberId, setSelectedNewMemberId] = useState('')
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({})
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null)
  const [editMethod, setEditMethod] = useState<ContributionMethod>('cash')
  const [editNotes, setEditNotes] = useState('')
  const [savingMemberKey, setSavingMemberKey] = useState<string | null>(null)
  const [savingPayoutRound, setSavingPayoutRound] = useState<number | null>(null)
  const [closingRound, setClosingRound] = useState<number | null>(null)
  const [payoutAmountByRound, setPayoutAmountByRound] = useState<Record<number, string>>({})
  const [payoutDateByRound, setPayoutDateByRound] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const pendingToggleKeysRef = useRef<Set<string>>(new Set())

  const cycleMembers = useMemo(
    () => (cycle ? members.filter((m) => cycle.memberIds.includes(m.id)) : []),
    [cycle, members],
  )

  const cycleContributions = useMemo(
    () => (cycle ? contributions.filter((c) => c.cycleId === cycle.id) : []),
    [contributions, cycle],
  )

  const cyclePayouts = useMemo(
    () => (cycle ? payouts.filter((p) => p.cycleId === cycle.id) : []),
    [payouts, cycle],
  )

  const availableMembers = useMemo(
    () => (cycle ? members.filter((m) => !cycle.memberIds.includes(m.id)) : []),
    [cycle, members],
  )

  if (!cycle) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 text-text-secondary">
        Cycle introuvable.
      </div>
    )
  }

  const rounds = Array.from({ length: cycle.totalRounds }, (_, idx) => idx + 1)
  const activeRound = rounds.find((round) => !cycle.closedRounds.includes(round)) ?? null

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [round]: !(prev[round] ?? round === activeRound),
    }))
  }

  const isRoundExpanded = (round: number) => expandedRounds[round] ?? round === activeRound

  const getRoundContributions = (memberId: string, roundNumber: number) => {
    return cycleContributions.filter(
      (item) => item.memberId === memberId && item.roundNumber === roundNumber,
    )
  }

  const getRoundContribution = (memberId: string, roundNumber: number) => {
    return getRoundContributions(memberId, roundNumber)[0]
  }

  const roundBeneficiary = (roundNumber: number) => {
    if (cycle.payoutOrder.length === 0) return null
    const idx = (roundNumber - 1) % cycle.payoutOrder.length
    const memberId = cycle.payoutOrder[idx]
    return members.find((m) => m.id === memberId) ?? null
  }

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

  const toggleMemberPaid = async (roundNumber: number, memberId: string, isPaid: boolean) => {
    if (cycle.closedRounds.includes(roundNumber)) return

    const key = `${roundNumber}:${memberId}`
    if (pendingToggleKeysRef.current.has(key)) return

    pendingToggleKeysRef.current.add(key)
    setError(null)
    setSavingMemberKey(key)
    try {
      const existingContributions = getRoundContributions(memberId, roundNumber)

      if (!isPaid && existingContributions.length > 0) {
        await Promise.all(existingContributions.map((item) => deleteContribution(item.id)))
      }

      if (isPaid && existingContributions.length === 0) {
        await addContribution({
          cycleId: cycle.id,
          memberId,
          amount: cycle.amountPerPerson,
          date: new Date(),
          roundNumber,
          method: 'cash',
          notes: '',
        })
      }

      if (isPaid && existingContributions.length > 1) {
        await Promise.all(existingContributions.slice(1).map((item) => deleteContribution(item.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status.')
    } finally {
      pendingToggleKeysRef.current.delete(key)
      setSavingMemberKey(null)
    }
  }

  const handlePayout = async (roundNumber: number, memberId: string, defaultAmount: number) => {
    setError(null)
    setSavingPayoutRound(roundNumber)

    try {
      const amountValue = payoutAmountByRound[roundNumber] || String(defaultAmount)
      const parsedAmount = Number(amountValue)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Payout amount must be greater than zero.')
      }

      const dateValue = payoutDateByRound[roundNumber] || todayISO()

      await addPayout({
        cycleId: cycle.id,
        memberId,
        amount: parsedAmount,
        roundNumber,
        date: new Date(dateValue),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payout.')
    } finally {
      setSavingPayoutRound(null)
    }
  }

  const handleCloseRound = async (roundNumber: number) => {
    setError(null)
    setClosingRound(roundNumber)
    try {
      await closeRound(cycle.id, roundNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close round.')
    } finally {
      setClosingRound(null)
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
          Rounds closed: {cycle.closedRounds.length} / {cycle.totalRounds}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

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

      <div className="space-y-2">
        {rounds.map((roundNumber) => {
          const roundContributions = cycleContributions.filter((c) => c.roundNumber === roundNumber)
          const contributionsByMember = new Map<string, (typeof roundContributions)[number]>()
          roundContributions.forEach((item) => {
            // Keep only the latest contribution per member for this round.
            if (!contributionsByMember.has(item.memberId)) {
              contributionsByMember.set(item.memberId, item)
            }
          })
          const uniqueRoundContributions = Array.from(contributionsByMember.values())
          const roundCollected = uniqueRoundContributions.reduce((sum, item) => sum + item.amount, 0)
          const roundExpected = cycleMembers.length * cycle.amountPerPerson
          const roundPayout = cyclePayouts.find((p) => p.roundNumber === roundNumber)
          const beneficiary = roundBeneficiary(roundNumber)
          const isClosed = cycle.closedRounds.includes(roundNumber)

          return (
            <div key={roundNumber} className="bg-white border border-border rounded-xl">
              <button
                type="button"
                onClick={() => toggleRound(roundNumber)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm"
              >
                <span className="font-medium text-text-primary">
                  Month {roundNumber} {beneficiary ? `- ${beneficiary.name}` : ''}
                </span>
                <span className="text-text-secondary">
                  {isClosed ? 'Closed' : 'Open'}
                </span>
              </button>

              {isRoundExpanded(roundNumber) && (
                <div className="border-t border-border p-4 space-y-3">
                  <p className="text-sm text-text-secondary">
                    Collected: {formatAmount(roundCollected)} / {formatAmount(roundExpected)}
                  </p>

                  <div className="space-y-2">
                    {cycleMembers.map((member) => {
                      const contribution = getRoundContribution(member.id, roundNumber)
                      const isPaid = Boolean(contribution)
                      const saveKey = `${roundNumber}:${member.id}`

                      return (
                        <div key={member.id} className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <label className="flex items-center gap-2 text-text-primary">
                              <input
                                type="checkbox"
                                checked={isPaid}
                                disabled={isClosed || savingMemberKey === saveKey}
                                onChange={(event) => {
                                  void toggleMemberPaid(roundNumber, member.id, event.target.checked)
                                }}
                              />
                              {member.name}
                            </label>
                            <span className="text-text-secondary">{formatAmount(cycle.amountPerPerson)}</span>
                          </div>

                          {isPaid && contribution && (
                            <div className="text-xs text-text-secondary flex items-center justify-between gap-2">
                              <span>Method: {contribution.method}</span>
                              {!isClosed && (
                                <button
                                  type="button"
                                  onClick={() => beginEditContribution(contribution.id)}
                                  className="underline text-text-primary"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}

                          {editingContributionId === contribution?.id && !isClosed && (
                            <div className="pt-2 border-t border-border space-y-2">
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">Method</label>
                                <select
                                  value={editMethod}
                                  onChange={(event) => {
                                    setEditMethod(event.target.value as ContributionMethod)
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
                  </div>

                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Payout</p>
                    {roundPayout ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-primary">
                          {beneficiary?.name ?? 'Unknown beneficiary'}
                        </span>
                        <span className="text-text-secondary">{formatAmount(roundPayout.amount)}</span>
                      </div>
                    ) : (
                      !isClosed && beneficiary && (
                        <div className="space-y-2">
                          <p className="text-sm text-text-secondary">Beneficiary: {beneficiary.name}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="number"
                              min={1}
                              value={payoutAmountByRound[roundNumber] ?? String(roundCollected)}
                              onChange={(event) => {
                                setPayoutAmountByRound((prev) => ({
                                  ...prev,
                                  [roundNumber]: event.target.value,
                                }))
                              }}
                              className="px-3 py-2 border border-border rounded-lg text-sm"
                            />
                            <input
                              type="date"
                              value={payoutDateByRound[roundNumber] ?? todayISO()}
                              onChange={(event) => {
                                setPayoutDateByRound((prev) => ({
                                  ...prev,
                                  [roundNumber]: event.target.value,
                                }))
                              }}
                              className="px-3 py-2 border border-border rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              disabled={savingPayoutRound === roundNumber}
                              onClick={() => void handlePayout(roundNumber, beneficiary.id, roundCollected)}
                              className="px-3 py-2 rounded-lg border border-border text-sm text-text-primary disabled:opacity-50"
                            >
                              Record payout
                            </button>
                          </div>
                        </div>
                      )
                    )}

                    {!isClosed && (
                      <button
                        type="button"
                        disabled={closingRound === roundNumber}
                        onClick={() => void handleCloseRound(roundNumber)}
                        className="px-3 py-2 rounded-lg bg-text-primary text-white text-sm disabled:opacity-50"
                      >
                        Close month
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
    </section>
  )
}
