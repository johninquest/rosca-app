import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import pb from '../lib/pocketbase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import EventForm from '../components/EventForm'

export default function EditEventPage() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    pb.collection('mocotr_events').getOne(eventId).then((record) => {
      if (!active) return
      if (record.owner !== user?.uid) { setError('Not authorized.'); return }
      setEvent(record)
    }).catch(() => { if (active) setError('Event not found.') })
    return () => { active = false }
  }, [eventId, user])

  async function handleSubmit(data) {
    await pb.collection('mocotr_events').update(eventId, {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      currency: data.currency,
      targetAmount: data.targetAmount || null,
      deadline: data.deadline || null,
    })
    navigate(`/event/${eventId}`)
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-[#F9F9F9]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-[#555555]">{error}</p>
        </main>
      </div>
    )
  }

  if (event === undefined) {
    return (
      <div className="min-h-dvh bg-[#F9F9F9]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  const defaultValues = {
    title: event.title,
    description: event.description,
    currency: event.currency,
    targetAmount: event.targetAmount ?? '',
    deadline: event.deadline ? event.deadline.slice(0, 10) : '',
  }

  return (
    <div className="min-h-dvh bg-[#F9F9F9]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">Edit Event</h1>
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-6">
          <EventForm defaultValues={defaultValues} onSubmit={handleSubmit} submitLabel="Save Changes" />
        </div>
      </main>
    </div>
  )
}
