import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

type Method = 'cash' | 'mtn' | 'orange' | 'other'

export default function AddContribution() {
  const { t } = useTranslation()
  const { selectedCycleId, goDashboard } = useAppStore()
  const { cycles, members, addContribution } = useCycleStore()

  const cycle = useMemo(
    () => cycles.find((item) => item.id === selectedCycleId) || null,
    [cycles, selectedCycleId],
  )

  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<Method>('cash')
  const [notes, setNotes] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cycle || !memberId || !amount) return

    await addContribution({
      cycleId: cycle.id,
      memberId,
      amount: Number(amount),
      date: new Date(date),
      method,
      notes,
    })

    goDashboard()
  }

  if (!cycle) {
    return <p className="text-sm text-text-secondary">Cycle introuvable.</p>
  }

  const cycleMembers = members.filter((member) => cycle.memberIds.includes(member.id))

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('cycle.addContribution')}</h1>

      <form onSubmit={(e) => void onSubmit(e)} className="bg-white border border-border rounded-xl p-4 space-y-3">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          required
        >
          <option value="">Choisir un membre</option>
          {cycleMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Montant (XAF)"
          required
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          required
        />

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        >
          <option value="cash">Cash</option>
          <option value="mtn">MTN</option>
          <option value="orange">Orange</option>
          <option value="other">Other</option>
        </select>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Note (optionnel)"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={goDashboard}
            className="flex-1 py-2.5 border border-border rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button type="submit" className="flex-1 py-2.5 rounded-lg bg-text-primary text-white">
            {t('common.save')}
          </button>
        </div>
      </form>
    </section>
  )
}
