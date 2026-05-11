import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
    } catch {
      // User closed the popup — do nothing
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F9F9F9] px-4">
      <div className="w-full max-w-sm">
        {/* App name */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">Mocotr</h1>
          <p className="mt-2 text-[#555555] text-base">
            Community Money Contribution Tracker
          </p>
          <p className="mt-1 text-[#555555] text-sm">
            Track and share family fundraising rounds — funerals, celebrations, and more.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-8 shadow-sm">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E0E0E0] rounded-md text-[#1A1A1A] font-medium hover:bg-[#F9F9F9] transition-colors"
          >
            {/* Google "G" SVG icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
