import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/useAuthStore'

export default function Auth() {
  const { t } = useTranslation()
  const { login, register } = useAuthStore()
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

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
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
              placeholder="admin@email.com"
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
        </form>

        <button
          type="button"
          onClick={() => setIsLogin((value) => !value)}
          className="w-full text-center text-text-primary text-sm mt-4"
        >
          {isLogin ? t('auth.toggleToSignup') : t('auth.toggleToSignin')}
        </button>
      </div>
    </div>
  )
}
