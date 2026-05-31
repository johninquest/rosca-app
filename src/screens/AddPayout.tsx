import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'
import { todayISO } from '../utils/format'

export default function AddPayout() {
  const { t } = useTranslation()
  const { selectedCycleId, goDashboard, openCycleDetail } = useAppStore()
  const { cycles, members, addPayout } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId],
  )

  const defaultBeneficiaryId = useMemo(() => {
    if (!cycle || cycle.payoutOrder.length === 0) return ''
    const idx = (cycle.currentRound - 1) % cycle.payoutOrder.length
    return cycle.payoutOrder[idx] ?? ''
  }, [cycle])

  const defaultAmount = useMemo(
    () => (cycle ? String(cycle.amountPerPerson * cycle.memberIds.length) : ''),
    [cycle],
  )

  const [memberId, setMemberId] = useState(defaultBeneficiaryId)
  const [amount, setAmount] = useState(defaultAmount)
  const [date, setDate] = useState(todayISO())

  if (!cycle) {
    return <p className="text-sm text-text-secondary">Cycle introuvable.</p>
  }

  const cycleMembers = members.filter((m) => cycle.memberIds.includes(m.id))

  const [submitError, setSubmitError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memberId || !amount) return
    setSubmitError(null)
    try {
      await addPayout({
        cycleId: cycle.id,
        memberId,
        amount: Number(amount),
        roundNumber: cycle.currentRound,
        date: new Date(date),
      })
      openCycleDetail(cycle.id)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save payout. Please try again.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('payout.addTitle')}</h1>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="bg-white border border-border rounded-xl p-4 space-y-4"
      >
        <div>
          <label
            htmlFor="payout-member"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {t('payout.beneficiary')}
          </label>
          <select
            id="payout-member"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg"
            required
          >
            <option value="">---</option>
            {cycleMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="payout-amount"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {t('payout.amount')} (XAF)
          </label>
          <input
            id="payout-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg"
            required
          />
        </div>

        <div>
          <label
            htmlFor="payout-date"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {t('payout.date')}
          </label>
          <input
            id="payout-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg"
            required
          />
        </div>

        <p className="text-xs text-text-secondary">
          {t('cycle.round')} {cycle.currentRound} / {cycle.payoutOrder.length}
        </p>

        {submitError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{submitError}</p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-text-primary text-white font-semibold"
        >
          {t('common.save')}
        </button>
      </form>

      <button
        type="button"
        onClick={goDashboard}
        className="w-full py-2.5 border border-border rounded-xl text-sm"
      >
        {t('common.cancel')}
      </button>
    </section>
  )
}
