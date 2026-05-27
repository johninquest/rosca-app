import { useAuthStore } from '../stores/useAuthStore'
import { useCycleStore } from '../stores/useCycleStore'
import { useAppStore } from '../stores/useAppStore'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const IconUser = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

const IconLogOut = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconChevronLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

interface NavbarProps {
  showBack?: boolean
}

export default function Navbar({ showBack = false }: NavbarProps) {
  const isOnline = useOnlineStatus()
  const { user, logout } = useAuthStore()
  const { pendingCount } = useCycleStore()
  const { goDashboard, setScreen } = useAppStore()

  const onBack = () => goDashboard()

  return (
    <>
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-[#F0F0F0] transition-colors -ml-2 mr-1"
                aria-label="Go back"
              >
                <IconChevronLeft />
              </button>
            )}
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="font-semibold text-text-primary tracking-tight"
            >
              Tontine Manager
            </button>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                {pendingCount} pending
              </span>
            )}

            {user && (
              <button
                type="button"
                onClick={() => setScreen('settings')}
                aria-label="Open settings"
                title="Open settings"
                className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-[#F0F0F0] transition-colors"
              >
                <IconUser />
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => {
                  void logout()
                }}
                aria-label="Sign out"
                title="Sign out"
                className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-[#F0F0F0] transition-colors"
              >
                <IconLogOut />
              </button>
            )}
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-text-primary text-white text-xs text-center py-1.5 px-4" role="status">
          You are offline. Changes will sync when reconnected.
        </div>
      )}
    </>
  )
}
