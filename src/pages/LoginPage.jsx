import { useState } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
  </svg>
)

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  if (user === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F9F9F9]">
        <div className="w-8 h-8 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    )
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
  }

  async function handleGoogle() {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      setError(err?.response?.message || (mode === 'signup' ? 'Sign-up failed. Please try again.' : 'Incorrect email or password.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F9F9F9] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">Mocotr</h1>
          <p className="mt-2 text-[#555555] text-base">Money Contribution Tracker</p>
          <p className="mt-1 text-[#555555] text-sm">
            Track and share family fundraising rounds — funerals, celebrations, and more.
          </p>
        </div>

        <div className="bg-white border border-[#E0E0E0] rounded-lg p-8 shadow-sm space-y-4">
          {/* Email / password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A1A1A]"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A1A1A]"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A1A1A]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* <p className="text-center text-xs text-[#555555]">
            {mode === 'signin' ? (
              <>No account?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="underline text-[#1A1A1A]">
                  Sign up
                </button>
              </>
            ) : (
              <>Have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="underline text-[#1A1A1A]">
                  Sign in
                </button>
              </>
            )}
          </p> */}

          {error && (
            <p className="text-sm text-center text-[#1A1A1A]" role="alert">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-[#E0E0E0]" />
            <span className="text-xs text-[#555555]">or</span>
            <hr className="flex-1 border-[#E0E0E0]" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E0E0E0] rounded-md text-[#1A1A1A] font-medium hover:bg-[#F9F9F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#E0E0E0] border-t-[#1A1A1A] rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
