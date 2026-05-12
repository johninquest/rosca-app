/**
 * Top navigation bar shown on authenticated pages.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

const IconLogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

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
            <div className="flex items-center gap-1">
              <Link
                to="/profile"
                aria-label="My profile"
                title="My profile"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <IconUser />
                )}
              </Link>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
              >
                <IconLogOut />
              </button>
            </div>
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
