import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'wouter'
import ConfirmDialog from '../components/ConfirmDialog'
import CycleMemberForm, { type CycleMemberFormValues } from '../components/CycleMemberForm'
import { pb } from '../services/pocketbase'
import { useCycleStore } from '../stores/useCycleStore'
import { exportCycleContributionsCSV, exportCycleContributionsPDF } from '../utils/export'
import { formatAmount, todayISO } from '../utils/format'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'
import type { ContributionMode, PaymentMethod } from '../types'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  mobile_money: 'Mobile money',
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

export default function CycleDetail() {
  const { t, i18n } = useTranslation()
  const { cycleId } = useParams<{ cycleId: string }>()
  const [, navigate] = useLocation()
  const {
    cycles,
    cycleMembers,
    contributions,
    payouts,
    auditLogs,
    getMemberTotal,
    getCycleTotal,
    getMemberNetPosition,
    getRoundExpectedTotal,
    addCycleMember,
    updateCycleMember,
    deleteCycleMember,
    addContribution,
    updateContribution,
    deleteContribution,
    addPayout,
    deletePayout,
    closeRound,
    deleteCycle,
    loadAuditLogs,
  } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === cycleId) ?? null,
    [cycles, cycleId],
  )

  const [activeTab, setActiveTab] = useState<'rounds' | 'members' | 'payouts' | 'audit'>('rounds')
  const [showAddMember, setShowAddMember] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({})
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null)
  const [editMethod, setEditMethod] = useState<PaymentMethod>('cash')
  const [editNotes, setEditNotes] = useState('')
  const [savingMemberKey, setSavingMemberKey] = useState<string | null>(null)
  const [savingPayoutRound, setSavingPayoutRound] = useState<number | null>(null)
  const [closingRound, setClosingRound] = useState<number | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeletePayoutId, setConfirmDeletePayoutId] = useState<string | null>(null)
  const [isDeletingCycle, setIsDeletingCycle] = useState(false)
  const [payoutAmountByRound, setPayoutAmountByRound] = useState<Record<number, string>>({})
  const [payoutDateByRound, setPayoutDateByRound] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const pendingToggleKeysRef = useRef<Set<string>>(new Set())

  const cycleMembersList = useMemo(
    () => (cycle ? cycleMembers.filter((m) => m.cycleId === cycle.id) : []),
    [cycle, cycleMembers],
  )

  const cycleContributions = useMemo(
    () => (cycle ? contributions.filter((c) => c.cycleId === cycle.id) : []),
    [contributions, cycle],
  )

  const cyclePayouts = useMemo(
    () => (cycle ? payouts.filter((p) => p.cycleId === cycle.id) : []),
    [payouts, cycle],
  )

  useEffect(() => {
    if (cycle) {
      void loadAuditLogs(cycle.id)
    }
  }, [cycle, loadAuditLogs])

  if (!cycle) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 text-text-secondary">
        Cycle not found.
      </div>
    )
  }

  const canDeleteCycle = Boolean(cycle.owner && cycle.owner === pb.authStore.record?.id)
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
      (item) => item.memberId === memberId && Number(item.roundNumber) === roundNumber,
    )
  }

  const getRoundContribution = (memberId: string, roundNumber: number) => {
    return getRoundContributions(memberId, roundNumber)[0]
  }

  const roundBeneficiary = (roundNumber: number) => {
    if (cycle.payoutOrder.length === 0) return null
    const idx = (roundNumber - 1) % cycle.payoutOrder.length
    const memberId = cycle.payoutOrder[idx]
    return cycleMembersList.find((m) => m.id === memberId) ?? null
  }

  const roundExpectedTotal = getRoundExpectedTotal(cycle.id)

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
    if (cycle.closedRounds.map(Number).includes(roundNumber)) return

    const member = cycleMembersList.find((m) => m.id === memberId)
    if (!member) return

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
          amount: member.contributionAmount,
          date: new Date(),
          roundNumber,
          method: cycle.defaultPaymentMethod,
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

  const handleDeleteCycle = async () => {
    setError(null)
    setIsDeletingCycle(true)
    try {
      await deleteCycle(cycle.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cycle.deleteError'))
    } finally {
      setIsDeletingCycle(false)
      setConfirmDeleteOpen(false)
    }
  }

  const handleDeletePayout = async () => {
    if (!confirmDeletePayoutId) return
    setError(null)
    try {
      await deletePayout(confirmDeletePayoutId)
      setConfirmDeletePayoutId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payout.')
    }
  }

  const onAddMember = async (values: CycleMemberFormValues) => {
    setError(null)
    try {
      await addCycleMember({
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
        contributionAmount: values.contributionAmount,
        cycleId: cycle.id,
      })
      setShowAddMember(false)
      setEditingMemberId(null)
      setActiveTab('members')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member.')
    }
  }

  const onUpdateMember = async (id: string, values: CycleMemberFormValues) => {
    setError(null)
    try {
      await updateCycleMember(id, {
        name: values.name.trim(),
        phone: (values.phone ?? '').trim(),
        joinDate: new Date(values.joinDate),
        contributionAmount: values.contributionAmount,
      })
      setEditingMemberId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-4 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text-primary">{cycle.name}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-[#F0F0F0] text-text-secondary">
            {cycle.status}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          {frequencyLabels[cycle.frequency] ?? cycle.frequency} — {cycle.totalRounds} rounds
        </p>
        <p className="text-sm text-text-secondary">
          {t('cycle.total')}: {formatAmount(getCycleTotal(cycle.id))}
        </p>
        <p className="text-sm text-text-secondary">
          Rounds closed: {cycle.closedRounds.length} / {cycle.totalRounds}
        </p>
        {cycle.contributionMode === 'fixed' && cycle.fixedAmountPerPerson && (
          <p className="text-sm text-text-secondary">
            Fixed amount: {formatAmount(cycle.fixedAmountPerPerson)}
          </p>
        )}
        {cycle.contributionMode === 'flex' && (
          <p className="text-sm text-text-secondary">Flexible contributions</p>
        )}
        {cycle.terms.latePaymentPolicy && (
          <p className="text-xs text-text-secondary mt-1">
            Late policy: {cycle.terms.latePaymentPolicy}
          </p>
        )}
        {typeof cycle.terms.fineAmount === 'number' && cycle.terms.fineAmount > 0 && (
          <p className="text-xs text-text-secondary">
            Fine: {formatAmount(cycle.terms.fineAmount)}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[
          { key: 'rounds' as const, label: 'Rounds' },
          { key: 'members' as const, label: `Members (${cycleMembersList.length})` },
          { key: 'payouts' as const, label: 'Payouts' },
          { key: 'audit' as const, label: 'History' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-text-primary text-white'
                : 'border border-border text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rounds Tab */}
      {activeTab === 'rounds' && (
        <div className="space-y-2">
          {rounds.map((roundNumber) => {
            const roundContributions = cycleContributions.filter(
              (c) => Number(c.roundNumber) === roundNumber,
            )
            const contributionsByMember = new Map<string, (typeof roundContributions)[number]>()
            roundContributions.forEach((item) => {
              if (!contributionsByMember.has(item.memberId)) {
                contributionsByMember.set(item.memberId, item)
              }
            })
            const uniqueRoundContributions = Array.from(contributionsByMember.values())
            const roundCollected = uniqueRoundContributions.reduce((sum, item) => sum + item.amount, 0)
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
                    Round {roundNumber}
                  </span>
                  <span className="text-text-secondary">
                    {isClosed ? 'Closed' : 'Open'}
                  </span>
                </button>

                {isRoundExpanded(roundNumber) && (
                  <div className="border-t border-border p-4 space-y-3">
                    <p className="text-sm text-text-secondary">
                      Collected: {formatAmount(roundCollected)} / {formatAmount(roundExpectedTotal)}
                    </p>

                    <div className="space-y-2">
                      {cycleMembersList.map((member) => {
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
                              <span className="text-text-secondary">{formatAmount(member.contributionAmount)}</span>
                            </div>

                            {isPaid && contribution && (
                              <div className="text-xs text-text-secondary flex items-center justify-between gap-2">
                                <span>Method: {paymentMethodLabels[contribution.method]}</span>
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
                                      setEditMethod(event.target.value as PaymentMethod)
                                    }}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank transfer</option>
                                    <option value="mobile_money">Mobile money</option>
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
                                value={payoutAmountByRound[roundNumber] ?? String(roundExpectedTotal)}
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
                                onClick={() => void handlePayout(roundNumber, beneficiary.id, roundExpectedTotal)}
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
                          Close round
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {cycleMembersList.length === 0 && (
            <div className="bg-white border border-border rounded-xl p-4 text-text-secondary text-sm">
              No members yet. Add members to start tracking contributions.
            </div>
          )}

          {cycleMembersList.map((member) => {
            const netPosition = getMemberNetPosition(member.id, cycle.id)
            const totalContributed = getMemberTotal(member.id, cycle.id)
            const isEditing = editingMemberId === member.id

            return (
              <div key={member.id} className="bg-white border border-border rounded-xl p-4 space-y-2">
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">{member.name}</p>
                      <p className="text-sm text-text-secondary">{member.phone || 'No phone'}</p>
                      <p className="text-sm text-text-secondary">
                        Contribution: {formatAmount(member.contributionAmount)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Total contributed: {formatAmount(totalContributed)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          netPosition >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        Net position: {netPosition >= 0 ? '+' : ''}
                        {formatAmount(netPosition)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(member.id)}
                        className="text-xs text-text-secondary underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CycleMemberForm
                      defaultValues={{
                        name: member.name,
                        phone: member.phone,
                        joinDate: member.joinDate.toISOString().slice(0, 10),
                        contributionAmount: member.contributionAmount,
                      }}
                      defaultAmount={cycle.fixedAmountPerPerson}
                      submitLabel="Update"
                      onSubmit={(values) => void onUpdateMember(member.id, values)}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="w-full py-2 rounded-lg border border-border text-sm text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {!showAddMember ? (
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="w-full py-2.5 rounded-lg border border-border text-sm text-text-primary"
            >
              + Add member
            </button>
          ) : (
            <div className="bg-white border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-text-primary text-sm">Add member</h3>
              <CycleMemberForm
                defaultAmount={cycle.fixedAmountPerPerson}
                submitLabel="Add member"
                onSubmit={(values) => void onAddMember(values)}
              />
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="w-full py-2 rounded-lg border border-border text-sm text-text-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white border border-border rounded-xl divide-y divide-border">
          {cyclePayouts.length === 0 && (
            <p className="text-sm text-text-secondary p-4">No payouts recorded yet.</p>
          )}
          {cyclePayouts.map((payout) => {
            const beneficiary = cycleMembersList.find((m) => m.id === payout.memberId)
            return (
              <div key={payout.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    Round {payout.roundNumber}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {beneficiary?.name ?? 'Unknown'} — {formatAmount(payout.amount)}
                  </p>
                  <p className="text-xs text-text-secondary">{formatAmount(payout.amount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDeletePayoutId(payout.id)}
                  className="text-xs text-red-700 underline shrink-0"
                >
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-border rounded-xl divide-y divide-border">
          {auditLogs.length === 0 && (
            <p className="text-sm text-text-secondary p-4">No history yet.</p>
          )}
          {auditLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-text-primary capitalize">
                  {log.action} {log.tableName.replace('_', ' ')}
                </span>
                <span className="text-xs text-text-secondary">
                  {log.performedAt.toLocaleDateString()}
                </span>
              </div>
              {log.notes && (
                <p className="text-xs text-text-secondary">{log.notes}</p>
              )}
              {log.oldValues && (
                <details className="text-xs">
                  <summary className="text-text-secondary cursor-pointer">Old values</summary>
                  <pre className="mt-1 p-2 bg-[#F7F7F7] rounded overflow-x-auto">
                    {JSON.stringify(log.oldValues, null, 2)}
                  </pre>
                </details>
              )}
              {log.newValues && (
                <details className="text-xs">
                  <summary className="text-text-secondary cursor-pointer">New values</summary>
                  <pre className="mt-1 p-2 bg-[#F7F7F7] rounded overflow-x-auto">
                    {JSON.stringify(log.newValues, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            const url = buildRoscaWhatsAppUrl({
              cycle,
              members: cycleMembersList,
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
          onClick={() => exportCycleContributionsCSV(cycle, cycleMembersList, cycleContributions)}
          className="py-2 border border-border rounded-xl text-xs text-text-primary"
        >
          {t('cycle.exportCSV')}
        </button>
        <button
          type="button"
          onClick={() => exportCycleContributionsPDF(cycle, cycleMembersList, cycleContributions)}
          className="py-2 border border-border rounded-xl text-xs text-text-primary"
        >
          {t('cycle.exportPDF')}
        </button>
        {canDeleteCycle && (
          <button
            type="button"
            disabled={isDeletingCycle}
            onClick={() => setConfirmDeleteOpen(true)}
            className="py-2 border border-red-300 text-red-700 rounded-xl text-xs disabled:opacity-50"
          >
            {isDeletingCycle ? t('common.loading') : t('cycle.delete')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('cycle.deleteConfirmTitle')}
        message={t('cycle.deleteConfirmMessage')}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteCycle()}
        danger
      />

      <ConfirmDialog
        open={confirmDeletePayoutId !== null}
        title="Delete payout"
        message="Are you sure you want to delete this payout?"
        onCancel={() => setConfirmDeletePayoutId(null)}
        onConfirm={() => void handleDeletePayout()}
        danger
      />
    </section>
  )
}
