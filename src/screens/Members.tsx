import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCycleStore } from '../stores/useCycleStore'

export default function Members() {
  const { t } = useTranslation()
  const { members, loadAll, addMember } = useCycleStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const joinDate = useMemo(() => new Date(), [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !phone.trim()) return

    await addMember({
      name: name.trim(),
      phone: phone.trim(),
      joinDate,
    })

    setName('')
    setPhone('')
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('members.title')}</h1>

      <form onSubmit={(e) => void onSubmit(e)} className="bg-white border border-border rounded-xl p-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          required
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237..."
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          required
        />
        <button type="submit" className="w-full py-2.5 rounded-lg bg-text-primary text-white">
          {t('members.add')}
        </button>
      </form>

      <div className="bg-white border border-border rounded-xl p-4">
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{member.name}</span>
              <span className="text-text-secondary">{member.phone}</span>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-text-secondary">{t('members.empty')}</p>}
        </div>
      </div>
    </section>
  )
}
