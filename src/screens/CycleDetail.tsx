import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'wouter'
import ConfirmDialog from '../components/ConfirmDialog'
import ContributionDialog from '../components/ContributionDialog'
import CycleForm, { type CycleFormValues } from '../components/CycleForm'
import CycleMemberForm, { type CycleMemberFormValues } from '../components/CycleMemberForm'
import { pb } from '../services/pocketbase'
import { useCycleStore } from '../stores/useCycleStore'
import { exportCycleContributionsCSV, exportCycleContributionsPDF } from '../utils/export'
import { formatAmount, todayISO } from '../utils/format'
import { buildRoscaWhatsAppUrl } from '../utils/whatsapp'
import type { Contribution, ContributionMode, CycleMember, PaymentMethod } from '../types'

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
    updateCycle,
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
  const [savingMemberKey, setSavingMemberKey] = useState<string | null>(null)
  const [savingPayoutRound, setSavingPayoutRound] = useState<number | null>(null)
  const [closingRound, setClosingRound] = useState<number | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeletePayoutId, setConfirmDeletePayoutId] = useState<string | null>(null)
  const [isDeletingCycle, setIsDeletingCycle] = useState(false)
  const [payoutAmountByRound, setPayoutAmountByRound] = useState<Record<number, string>>({})
  const [payoutDateByRound, setPayoutDateByRound] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [editingCycle, setEditingCycle] = useState(false)
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false)
  const [contributionDialogMember, setContributionDialogMember] = useState<CycleMember | null>(null)
  const [contributionDialogRound, setContributionDialogRound] = useState<number | null>(null)
  const [contributionDialogExisting, setContributionDialogExisting] = useState<Contribution | null>(null)
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
        {t('cycle.notFound')}
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

  const openContributionDialog = (member: CycleMember, roundNumber: number, existing?: Contribution | null) => {
    setContributionDialogMember(member)
    setContributionDialogRound(roundNumber)
    setContributionDialogExisting(existing ?? null)
    setContributionDialogOpen(true)
  }

  const closeContributionDialog = () => {
    setContributionDialogOpen(false)
    setContributionDialogMember(null)
    setContributionDialogRound(null)
    setContributionDialogExisting(null)
  }

  const handleContributionSave = async (data: {
    amount: number
    method: PaymentMethod
    date: Date
    notes: string
  }) => {
    if (!contributionDialogMember || contributionDialogRound === null) return

    setError(null)
    try {
      if (contributionDialogExisting) {
        await updateContribution(contributionDialogExisting.id, {
          amount: data.amount,
          method: data.method,
          date: data.date,
          notes: data.notes,
        })
      } else {
        await addContribution({
          cycleId: cycle.id,
          memberId: contributionDialogMember.id,
          amount: data.amount,
          date: data.date,
          roundNumber: contributionDialogRound,
          method: data.method,
          notes: data.notes,
        })
      }
      closeContributionDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contribution.')
    }
  }

  const handleUpdateCycle = async (values: CycleFormValues) => {
    setError(null)
    try {
      await updateCycle(cycle.id, {
        startDate: new Date(values.startDate),
        defaultPaymentMethod: values.defaultPaymentMethod,
        fixedAmountPerPerson: values.fixedAmountPerPerson,
      })
      setEditingCycle(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cycleForm.updateError'))
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
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-[#F0F0F0] text-text-secondary">
              {cycle.status}
            </span>
            {!editingCycle && (
              <button
                type="button"
                onClick={() => setEditingCycle(true)}
                className="text-xs px-2 py-1 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors"
              >
                {t('cycle.edit')}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          {t(`frequency.${cycle.frequency}`)} — {cycle.totalRounds} {t('cycle.round').toLowerCase()}
        </p>
        <p className="text-sm text-text-secondary">
          {t('cycle.total')}: {formatAmount(getCycleTotal(cycle.id))}
        </p>
        <p className="text-sm text-text-secondary">
          {t('cycle.roundsClosed')}: {cycle.closedRounds.length} / {cycle.totalRounds}
        </p>
        {cycle.contributionMode === 'fixed' && cycle.fixedAmountPerPerson && (
          <p className="text-sm text-text-secondary">
            {t('cycle.fixedAmount')}: {formatAmount(cycle.fixedAmountPerPerson)}
          </p>
        )}
        {cycle.contributionMode === 'flex' && (
          <p className="text-sm text-text-secondary">{t('cycle.flexibleContributions')}</p>
        )}
        {cycle.terms.latePaymentPolicy && (
          <p className="text-xs text-text-secondary mt-1">
            {t('cycle.latePolicy')}: {cycle.terms.latePaymentPolicy}
          </p>
        )}
        {typeof cycle.terms.fineAmount === 'number' && cycle.terms.fineAmount > 0 && (
          <p className="text-xs text-text-secondary">
            {t('cycle.fine')}: {formatAmount(cycle.terms.fineAmount)}
          </p>
        )}
      </div>

      {editingCycle && (
        <div className="bg-white border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">{t('cycle.edit')}</h2>
          <CycleForm
            editMode
            defaultValues={{
              name: cycle.name,
              contributionMode: cycle.contributionMode,
              fixedAmountPerPerson: cycle.fixedAmountPerPerson,
              frequency: cycle.frequency,
              startDate: cycle.startDate.toISOString().slice(0, 10),
              totalRounds: cycle.totalRounds,
              defaultPaymentMethod: cycle.defaultPaymentMethod,
              termsLatePaymentPolicy: cycle.terms.latePaymentPolicy,
              termsFineAmount: cycle.terms.fineAmount,
              termsOtherRules: cycle.terms.otherRules,
            }}
            onSubmit={handleUpdateCycle}
          />
          <button
            type="button"
            onClick={() => setEditingCycle(false)}
            className="w-full py-2 rounded-lg border border-border text-sm text-text-secondary"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[
          { key: 'rounds' as const, label: t('cycle.tab.rounds') },
          { key: 'members' as const, label: t('cycle.tab.members', { count: cycleMembersList.length }) },
          { key: 'payouts' as const, label: t('cycle.tab.payouts') },
          { key: 'audit' as const, label: t('cycle.tab.history') },
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
            const isPaid = Boolean(roundPayout)

            const cardClass = isPaid
              ? 'bg-teal-light border-teal-border'
              : isClosed
                ? 'bg-closed-bg border-closed-border'
                : 'bg-white border-border'

            return (
              <div key={roundNumber} className={`${cardClass} border rounded-xl`}>
                <button
                  type="button"
                  onClick={() => toggleRound(roundNumber)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-text-primary">
                    {t('cycle.round')} {roundNumber}
                  </span>
                  <span className="text-text-secondary">
                    {isClosed ? t('cycle.round.closed') : t('cycle.round.open')}
                  </span>
                </button>

                {isRoundExpanded(roundNumber) && (
                  <div className="border-t border-border p-4 space-y-3">
                    <p className="text-sm text-text-secondary">
                      {t('cycle.round.collected')}: {formatAmount(roundCollected)} / {formatAmount(roundExpectedTotal)}
                    </p>

                    <div className="space-y-2">
                      {cycleMembersList.map((member) => {
                        const contribution = getRoundContribution(member.id, roundNumber)
                        const hasContribution = Boolean(contribution)

                        return (
                          <div key={member.id} className="border border-border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-text-primary font-medium">{member.name}</span>
                              <span className="text-text-secondary">{formatAmount(member.contributionAmount)}</span>
                            </div>

                            {hasContribution && contribution && (
                              <div className="text-xs text-text-secondary space-y-1">
                                <div className="flex items-center justify-between">
                                  <span>{t('cycle.round.method')}: {t(`payment.${contribution.method}`)}</span>
                                  <span>{contribution.date.toLocaleDateString()}</span>
                                </div>
                                {!isClosed && (
                                  <button
                                    type="button"
                                    onClick={() => openContributionDialog(member, roundNumber, contribution)}
                                    className="underline text-text-primary"
                                  >
                                    {t('cycle.round.editContribution')}
                                  </button>
                                )}
                              </div>
                            )}

                            {!hasContribution && !isClosed && (
                              <button
                                type="button"
                                onClick={() => openContributionDialog(member, roundNumber)}
                                className="w-full py-2 rounded-lg bg-text-primary text-white text-xs"
                              >
                                {t('cycle.round.makeContribution')}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="border-t border-border pt-3 space-y-3">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        {t('cycle.round.payout')}
                      </p>
                      {roundPayout ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-primary">
                              {beneficiary?.name ?? t('cycle.payout.unknown')}
                            </span>
                            <span className="text-text-secondary">{formatAmount(roundPayout.amount)}</span>
                          </div>
                          <p className="text-xs text-text-secondary text-right">
                            {t('cycle.round.paidOn')}: {roundPayout.date.toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        !isClosed && beneficiary && (
                          <div className="space-y-2">
                            <p className="text-sm text-text-secondary">
                              {t('cycle.round.beneficiary')}: {beneficiary.name}
                            </p>
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
                                {t('cycle.round.recordPayout')}
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
                          {t('cycle.round.closeRound')}
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
              {t('members.noMembers')}
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
                      <p className="text-sm text-text-secondary">{member.phone || t('members.noPhone')}</p>
                      <p className="text-sm text-text-secondary">
                        {t('members.contribution')}: {formatAmount(member.contributionAmount)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {t('members.totalContributed')}: {formatAmount(totalContributed)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          netPosition >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {t('members.netPosition')}: {netPosition >= 0 ? '+' : ''}
                        {formatAmount(netPosition)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(member.id)}
                        className="text-xs text-text-secondary underline"
                      >
                        {t('common.edit')}
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
                      submitLabel={t('memberForm.update')}
                      onSubmit={(values) => void onUpdateMember(member.id, values)}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="w-full py-2 rounded-lg border border-border text-sm text-text-secondary"
                    >
                      {t('common.cancel')}
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
              {t('cycle.round.addMember')}
            </button>
          ) : (
            <div className="bg-white border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-text-primary text-sm">{t('members.addTitle')}</h3>
              <CycleMemberForm
                defaultAmount={cycle.fixedAmountPerPerson}
                defaultJoinDate={cycle.startDate.toISOString().slice(0, 10)}
                submitLabel={t('memberForm.addMember')}
                onSubmit={(values) => void onAddMember(values)}
              />
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="w-full py-2 rounded-lg border border-border text-sm text-text-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white border border-border rounded-xl divide-y divide-border">
          {cyclePayouts.length === 0 && (
            <p className="text-sm text-text-secondary p-4">{t('cycle.payout.empty')}</p>
          )}
          {cyclePayouts.map((payout) => {
            const beneficiary = cycleMembersList.find((m) => m.id === payout.memberId)
            return (
              <div key={payout.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    {t('cycle.round')} {payout.roundNumber}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {beneficiary?.name ?? t('cycle.payout.unknown')} — {formatAmount(payout.amount)}
                  </p>
                  <p className="text-xs text-text-secondary">{payout.date.toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDeletePayoutId(payout.id)}
                  className="text-xs text-red-700 underline shrink-0"
                >
                  {t('common.delete')}
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
            <p className="text-sm text-text-secondary p-4">{t('cycle.audit.empty')}</p>
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
                  <summary className="text-text-secondary cursor-pointer">{t('cycle.audit.oldValues')}</summary>
                  <pre className="mt-1 p-2 bg-[#F7F7F7] rounded overflow-x-auto">
                    {JSON.stringify(log.oldValues, null, 2)}
                  </pre>
                </details>
              )}
              {log.newValues && (
                <details className="text-xs">
                  <summary className="text-text-secondary cursor-pointer">{t('cycle.audit.newValues')}</summary>
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
        title={t('cycle.payout.deleteTitle')}
        message={t('cycle.payout.deleteMessage')}
        onCancel={() => setConfirmDeletePayoutId(null)}
        onConfirm={() => void handleDeletePayout()}
        danger
      />

      {contributionDialogMember && contributionDialogRound !== null && (
        <ContributionDialog
          open={contributionDialogOpen}
          cycle={cycle}
          member={contributionDialogMember}
          roundNumber={contributionDialogRound}
          existingContribution={contributionDialogExisting}
          onSave={handleContributionSave}
          onCancel={closeContributionDialog}
        />
      )}
    </section>
  )
}
