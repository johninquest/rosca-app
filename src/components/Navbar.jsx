/**
 * Top navigation bar shown on authenticated pages.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Navbar() {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  return (
    <>
      <header className="bg-white border-b border-[#E0E0E0] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="font-semibold text-[#1A1A1A] tracking-tight">
            Mocotr
          </Link>
          {user && (
            <button
              onClick={handleSignOut}
              className="text-sm text-[#555555] hover:text-[#1A1A1A] transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      {!isOnline && (
        <div className="bg-[#1A1A1A] text-white text-xs text-center py-1.5 px-4" role="status">
          You're offline — changes will sync when reconnected
        </div>
      )}
    </>
  )
}
