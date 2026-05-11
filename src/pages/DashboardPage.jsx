import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { formatAmount } from '../utils/format'

function EventCard({ event }) {
  const { id, title, currency, targetAmount, status, createdAt, deadline } = event
  const hasTarget = targetAmount != null && targetAmount > 0

  return (
    <Link
      to={`/event/${id}`}
      className="block bg-white border border-[#E0E0E0] rounded-lg p-5 hover:border-[#3A3A3A] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-semibold text-[#1A1A1A] text-base leading-snug">{title}</h2>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
            status === 'open'
              ? 'border-[#1A1A1A] text-[#1A1A1A]'
              : 'border-[#E0E0E0] text-[#555555]'
          }`}
        >
          {status}
        </span>
      </div>

      <TotalCollected eventId={id} currency={currency} targetAmount={hasTarget ? targetAmount : null} />

      <div className="mt-3 flex items-center gap-3 text-xs text-[#555555]">
        <span>{currency}</span>
        {deadline && <span>Deadline: {deadline}</span>}
        {createdAt && (
          <span className="ml-auto">
            {createdAt.toDate
              ? createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'N/A'}
          </span>
        )}
      </div>
    </Link>
  )
}

function TotalCollected({ eventId, currency, targetAmount }) {
  const [total, setTotal] = useState(undefined)

  useEffect(() => {
    const q = query(collection(db, 'contributions'), where('eventId', '==', eventId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sum = snap.docs.reduce((acc, d) => acc + (d.data().amount ?? 0), 0)
        setTotal(sum)
      },
      () => setTotal(null)
    )
    return unsub
  }, [eventId])

  const hasTarget = targetAmount != null && targetAmount > 0
  const pct = hasTarget && total != null && total > 0 ? Math.round((total / targetAmount) * 100) : 0

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-[#1A1A1A]">
          {total === undefined ? '…' : total === null ? 'N/A' : formatAmount(total, currency)}
        </span>
        {hasTarget && total != null && (
          <span className="text-sm text-[#555555]">of {formatAmount(targetAmount, currency)}</span>
        )}
      </div>
      {hasTarget && (
        <div className="mt-2 h-1.5 bg-[#E0E0E0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A1A] rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState(undefined)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'events'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, () => setEvents([]))
    return unsub
  }, [user])

  return (
    <div className="min-h-dvh bg-[#F9F9F9]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[#1A1A1A]">My Events</h1>
          <Link
            to="/event/new"
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-[#3A3A3A] transition-colors"
          >
            + New Event
          </Link>
        </div>

        {events === undefined && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
          </div>
        )}

        {events !== undefined && events.length === 0 && (
          <div className="text-center py-12 text-[#555555]">
            <p className="text-base">No events yet.</p>
            <p className="text-sm mt-1">Create your first contribution round to get started.</p>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="flex flex-col gap-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
