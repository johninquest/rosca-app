import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { useCycleStore } from '../stores/useCycleStore'

type Frequency = 'weekly' | 'monthly'

export default function AddCycle() {
  const { t } = useTranslation()
  const { goDashboard } = useAppStore()
  const { members, addCycle } = useCycleStore()

  const [name, setName] = useState('')
  const [amountPerPerson, setAmountPerPerson] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const payoutOrder = useMemo(() => selectedMemberIds, [selectedMemberIds])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    )
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !amountPerPerson || selectedMemberIds.length === 0) return

    await addCycle({
      name: name.trim(),
      amountPerPerson: Number(amountPerPerson),
      frequency,
      startDate: new Date(startDate),
      status: 'active',
      memberIds: selectedMemberIds,
      payoutOrder,
      endDate: undefined,
    })

    goDashboard()
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('dashboard.newCycle')}</h1>

      <form onSubmit={(e) => void onSubmit(e)} className="bg-white border border-border rounded-xl p-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Nom du cycle"
          required
        />

        <input
          type="number"
          min={1}
          value={amountPerPerson}
          onChange={(e) => setAmountPerPerson(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Montant par personne (XAF)"
          required
        />

        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          required
        />

        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="text-sm text-text-secondary">{t('cycle.members')}</p>
          {members.length === 0 && (
            <p className="text-sm text-text-secondary">{t('members.empty')}</p>
          )}
          {members.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={selectedMemberIds.includes(member.id)}
                onChange={() => toggleMember(member.id)}
              />
              {member.name} ({member.phone})
            </label>
          ))}
        </div>

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
