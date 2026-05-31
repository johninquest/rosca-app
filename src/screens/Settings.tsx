import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useAuthStore } from '../stores/useAuthStore'
import { APP_VERSION } from '../utils/version'

export default function Settings() {
  const { t, i18n: i18nInstance } = useTranslation()
  const { logout } = useAuthStore()
  const currentLanguage = i18nInstance.language

  const changeLanguage = (lang: string) => {
    localStorage.setItem('language', lang)
    void i18n.changeLanguage(lang)
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">{t('settings.title')}</h1>

      <div className="bg-white border border-border rounded-xl p-4 space-y-3">
        <label className="text-sm text-text-secondary">{t('settings.language')}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeLanguage('fr')}
            className={`px-3 py-2 rounded-lg border ${
              currentLanguage.startsWith('fr') ? 'bg-text-primary text-white border-text-primary' : 'border-border'
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => changeLanguage('en')}
            className={`px-3 py-2 rounded-lg border ${
              currentLanguage.startsWith('en') ? 'bg-text-primary text-white border-text-primary' : 'border-border'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          void logout()
        }}
        className="w-full py-3 rounded-xl bg-text-primary text-white"
      >
        {t('settings.logout')}
      </button>

      <p className="pt-2 text-xs text-text-secondary/80 text-center">v{APP_VERSION}</p>
    </section>
  )
}
