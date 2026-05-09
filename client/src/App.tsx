import { useEffect } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import OrderView from './views/OrderView.js'
import BaristaView from './views/BaristaView.js'
import CounterView from './views/CounterView.js'
import PickupView from './views/PickupView.js'
import ManagementView from './views/ManagementView.js'

// Fetches the shop-wide language from the DB on startup and syncs i18next to it.
// i18next-browser-languagedetector serves the localStorage-cached language for the
// initial render (no flash), then this effect overrides it with the authoritative DB value.
function LanguageSync() {
  const { i18n } = useTranslation()
  useEffect(() => {
    fetch('/api/v1/auth/language')
      .then((r) => r.json())
      .then((json: { data?: { language: string } }) => {
        const lang = json.data?.language
        if (lang && lang !== i18n.language) {
          void i18n.changeLanguage(lang)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function App() {
  return (
    <>
    <CssBaseline />
    <LanguageSync />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/order" element={<OrderView />} />
        <Route path="/barista" element={<BaristaView />} />
        <Route path="/counter" element={<CounterView />} />
        <Route path="/pickup" element={<PickupView />} />
        <Route path="/management" element={<ManagementView />} />
        <Route path="/" element={<Navigate to="/order" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}
