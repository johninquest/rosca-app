import { useNavigate } from 'react-router-dom'
import pb from '../lib/pocketbase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function getLastSignedIn() {
  try {
    const token = pb.authStore.token
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.iat ? new Date(payload.iat * 1000) : null
  } catch {
    return null
  }
}

export default function ProfilePage() {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const lastSignedIn = getLastSignedIn()

  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-[#F9F9F9]">
      <Navbar backTo="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">My Profile</h1>

        <div className="bg-white border border-[#E0E0E0] rounded-lg p-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#1A1A1A] text-white text-lg font-semibold flex items-center justify-center shrink-0 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                getInitials(user.displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1A1A1A] truncate">{user.displayName}</p>
              <p className="text-sm text-[#555555] truncate">{user.email}</p>
            </div>
          </div>

          {/* Info rows */}
          <dl className="flex flex-col gap-4 border-t border-[#E0E0E0] pt-5">
            <div>
              <dt className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-0.5">Name</dt>
              <dd className="text-sm text-[#1A1A1A]">{user.displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-0.5">Email</dt>
              <dd className="text-sm text-[#1A1A1A]">{user.email}</dd>
            </div>
            {lastSignedIn && (
              <div>
                <dt className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-0.5">Last signed in</dt>
                <dd className="text-sm text-[#1A1A1A]">
                  {lastSignedIn.toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 border border-[#E0E0E0] rounded-md text-sm text-[#555555] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  )
}
