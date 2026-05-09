// Initialises i18next for the app. Imported once in main.tsx (side-effect import).
//
// Language resolution order on startup:
//   1. localStorage['language'] — set by LanguageSync or a prior settings change (fast, no flash)
//   2. browser navigator.language — fallback for first-ever visit
//   3. 'en' — hardcoded fallback if neither is a supported locale
//
// The DB is the authoritative source; LanguageSync in App.tsx syncs it after the first render.
// The localStorage cache means returning devices show the correct language immediately.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import de from './locales/de.json'
import ro from './locales/ro.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      ro: { translation: ro },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'ro'],
    interpolation: { escapeValue: false },
    detection: {
      // Check localStorage first, then browser Accept-Language header.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  })

export default i18n
