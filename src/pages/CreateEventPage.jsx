import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import EventForm from '../components/EventForm'

export default function CreateEventPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(data) {
    const doc = await addDoc(collection(db, 'events'), {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      currency: data.currency,
      targetAmount: data.targetAmount || null,
      deadline: data.deadline || null,
      status: 'open',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    navigate(`/event/${doc.id}`)
  }

  return (
    <div className="min-h-dvh bg-[#F9F9F9]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">New Event</h1>
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-6">
          <EventForm onSubmit={handleSubmit} submitLabel="Create Event" />
        </div>
      </main>
    </div>
  )
}
