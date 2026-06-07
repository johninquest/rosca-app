import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/useAuthStore'
import { APP_VERSION } from '../utils/version'

export default function Auth() {
  const { t } = useTranslation()
  const { login, loginWithGoogle, register } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-border">
        <h1 className="text-2xl font-bold text-center mb-1 text-text-primary">{t('auth.title')}</h1>
        <p className="text-text-secondary text-center text-sm mb-6">{t('auth.subtitle')}</p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-text-primary outline-none"
              placeholder="user@email.cm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-text-primary outline-none"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-text-primary text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : isLogin ? t('auth.signIn') : t('auth.signUp')}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-text-secondary">{t('auth.or')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-semibold border border-[#dadce0] bg-white text-[#3c4043] disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm hover:shadow"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.26-2.08 3.57-5.14 3.57-8.66Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3.01c-1.07.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.98H1.26v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.25A7.21 7.21 0 0 1 4.87 12c0-.78.13-1.53.38-2.25v-3.1H1.26A12 12 0 0 0 0 12c0 1.93.46 3.75 1.26 5.35l3.99-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.35.6 4.6 1.78l3.45-3.45C17.95 1.14 15.23 0 12 0A12 12 0 0 0 1.26 6.65l3.99 3.1c.95-2.86 3.61-4.98 6.75-4.98Z"
              />
            </svg>
            <span>{t('auth.signInWithGoogle')}</span>
          </button>
        </form>

        {/*
        <button
          type="button"
          onClick={() => setIsLogin((value) => !value)}
          className="w-full text-center text-text-primary text-sm mt-4"
        >
          {isLogin ? t('auth.toggleToSignup') : t('auth.toggleToSignin')}
        </button>
        */}
      </div>
      <p className="mt-4 text-xs text-text-secondary/80 text-center">v{APP_VERSION}</p>
    </div>
  )
}
