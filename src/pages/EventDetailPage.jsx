import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import {
  doc, getDoc, onSnapshot, collection, query, where,
  orderBy, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ConfirmDialog from '../components/ConfirmDialog'
import ContributionForm from '../components/ContributionForm'
import { formatAmount, formatDate, todayISO } from '../utils/format'
import { buildWhatsAppUrl } from '../utils/whatsapp'
import { exportPDF, exportCSV } from '../utils/export'

export default function EventDetailPage() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [event, setEvent] = useState(undefined)
  const [contributions, setContributions] = useState(undefined)
  const [eventError, setEventError] = useState(null)

  // Dialogs
  const [showDeleteEvent, setShowDeleteEvent] = useState(false)
  const [showAddContrib, setShowAddContrib] = useState(false)
  const [editingContrib, setEditingContrib] = useState(null)
  const [deletingContribId, setDeletingContribId] = useState(null)

  const isOwner = user && event && user.uid === event.ownerId

  // Load event
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'events', eventId),
      (snap) => {
        if (!snap.exists()) { setEventError('Event not found.'); return }
        setEvent({ id: snap.id, ...snap.data() })
      },
      () => setEventError('Failed to load event.')
    )
    return unsub
  }, [eventId])

  // Load contributions
  useEffect(() => {
    const q = query(
      collection(db, 'contributions'),
      where('eventId', '==', eventId),
      orderBy('date', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setContributions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, () => setContributions([]))
    return unsub
  }, [eventId])

  // --- Derived totals ---
  const total = contributions != null
    ? contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
    : null
  const hasTarget = event?.targetAmount != null && event.targetAmount > 0
  const pct = hasTarget && total != null && total > 0
    ? Math.round((total / event.targetAmount) * 100)
    : 0

  // --- Event actions ---
  async function handleToggleStatus() {
    await updateDoc(doc(db, 'events', eventId), {
      status: event.status === 'open' ? 'closed' : 'open',
      updatedAt: serverTimestamp(),
    })
  }

  async function handleDeleteEvent() {
    // Cascade delete contributions first
    if (contributions && contributions.length > 0) {
      const batch = writeBatch(db)
      contributions.forEach((c) => batch.delete(doc(db, 'contributions', c.id)))
      await batch.commit()
    }
    await deleteDoc(doc(db, 'events', eventId))
    navigate('/dashboard')
  }

  // --- Contribution actions ---
  async function handleAddContribution(data) {
    await addDoc(collection(db, 'contributions'), {
      eventId,
      contributorName: data.contributorName.trim(),
      amount: data.amount,
      date: data.date,
      note: data.note?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setShowAddContrib(false)
  }

  async function handleEditContribution(data) {
    await updateDoc(doc(db, 'contributions', editingContrib.id), {
      contributorName: data.contributorName.trim(),
      amount: data.amount,
      date: data.date,
      note: data.note?.trim() || '',
      updatedAt: serverTimestamp(),
    })
    setEditingContrib(null)
  }

  async function handleDeleteContribution() {
    await deleteDoc(doc(db, 'contributions', deletingContribId))
    setDeletingContribId(null)
  }

  // --- Share ---
  function handleWhatsApp() {
    const url = buildWhatsAppUrl(event, contributions ?? [], window.location.href)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // --- Loading / error states ---
  if (eventError) {
    return (
      <div className="min-h-dvh bg-[#F9F9F9]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-[#555555]">{eventError}</p>
        </main>
      </div>
    )
  }

  if (event === undefined) {
    return (
      <div className="min-h-dvh bg-[#F9F9F9]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6 flex justify-center pt-16">
          <div className="w-8 h-8 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F9F9F9]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Summary card */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#1A1A1A] leading-snug">{event.title}</h1>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
                event.status === 'open'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-[#E0E0E0] text-[#555555]'
              }`}
            >
              {event.status}
            </span>
          </div>

          {event.description && (
            <p className="text-[#555555] text-sm mt-2 mb-3">{event.description}</p>
          )}

          <div className="mt-4 space-y-1 text-sm text-[#555555]">
            <div className="flex gap-2">
              <span className="w-24 shrink-0">Currency</span>
              <span className="font-medium text-[#1A1A1A]">{event.currency}</span>
            </div>
            {hasTarget && (
              <div className="flex gap-2">
                <span className="w-24 shrink-0">Target</span>
                <span className="font-medium text-[#1A1A1A]">{formatAmount(event.targetAmount, event.currency)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="w-24 shrink-0">Collected</span>
              <span className="font-bold text-[#1A1A1A] text-base">
                {contributions === undefined ? '…' : total === null ? 'N/A' : formatAmount(total, event.currency)}
              </span>
            </div>
            {hasTarget && total != null && (
              <div className="flex gap-2">
                <span className="w-24 shrink-0">Remaining</span>
                <span className="font-medium text-[#1A1A1A]">
                  {formatAmount(Math.max(0, event.targetAmount - total), event.currency)}
                </span>
              </div>
            )}
            {event.deadline && (
              <div className="flex gap-2">
                <span className="w-24 shrink-0">Deadline</span>
                <span className="font-medium text-[#1A1A1A]">{event.deadline}</span>
              </div>
            )}
          </div>

          {hasTarget && (
            <div className="mt-4">
              <div className="h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A1A1A] rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[#555555] mt-1">{pct}% of target</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            {/* WhatsApp — visible to everyone */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Share to WhatsApp
            </button>

            {/* Owner-only actions */}
            {isOwner && (
              <>
                {event.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => setShowAddContrib(true)}
                    className="px-3 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-[#3A3A3A] transition-colors"
                  >
                    + Add Contribution
                  </button>
                )}
                <Link
                  to={`/event/${eventId}/edit`}
                  className="px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
                >
                  {event.status === 'open' ? 'Close Event' : 'Reopen Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteEvent(true)}
                  className="px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
                >
                  Delete
                </button>
                {contributions && contributions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportPDF(event, contributions)}
                      className="px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCSV(event, contributions)}
                      className="px-3 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors"
                    >
                      Export CSV
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Contributions list */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg">
          <div className="px-5 py-4 border-b border-[#E0E0E0]">
            <h2 className="font-semibold text-[#1A1A1A]">Contributions</h2>
          </div>

          {contributions === undefined && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
            </div>
          )}

          {contributions !== undefined && contributions.length === 0 && (
            <p className="px-5 py-8 text-[#555555] text-sm text-center">N/A — no contributions yet.</p>
          )}

          {contributions && contributions.length > 0 && (
            <ul className="divide-y divide-[#E0E0E0]">
              {contributions.map((c) => (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1A1A1A] truncate">{c.contributorName}</p>
                      <p className="text-xl font-bold text-[#1A1A1A] mt-0.5">
                        {formatAmount(c.amount, event.currency)}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-[#555555]">
                        <span>{formatDate(c.date)}</span>
                        {c.note && <span>· {c.note}</span>}
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingContrib(c)}
                          className="text-xs text-[#555555] hover:text-[#1A1A1A] transition-colors px-2 py-1 border border-[#E0E0E0] rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingContribId(c.id)}
                          className="text-xs text-[#555555] hover:text-[#1A1A1A] transition-colors px-2 py-1 border border-[#E0E0E0] rounded"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Add Contribution modal */}
      {showAddContrib && (
        <ContributionForm
          onSubmit={handleAddContribution}
          onCancel={() => setShowAddContrib(false)}
        />
      )}

      {/* Edit Contribution modal */}
      {editingContrib && (
        <ContributionForm
          defaultValues={{
            contributorName: editingContrib.contributorName,
            amount: editingContrib.amount,
            date: editingContrib.date ?? todayISO(),
            note: editingContrib.note ?? '',
          }}
          onSubmit={handleEditContribution}
          onCancel={() => setEditingContrib(null)}
        />
      )}

      {/* Delete event confirmation */}
      <ConfirmDialog
        open={showDeleteEvent}
        title="Delete this event?"
        message="This will permanently delete the event and all its contributions. This action cannot be undone."
        onConfirm={handleDeleteEvent}
        onCancel={() => setShowDeleteEvent(false)}
        danger
      />

      {/* Delete contribution confirmation */}
      <ConfirmDialog
        open={!!deletingContribId}
        title="Delete this contribution?"
        message="This contribution will be permanently removed."
        onConfirm={handleDeleteContribution}
        onCancel={() => setDeletingContribId(null)}
        danger
      />
    </div>
  )
}
