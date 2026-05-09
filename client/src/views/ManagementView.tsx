// Management view — protected by JWT.
//
// Auth flow: checks localStorage for 'management_token'. If absent, shows the login page.
// After login, the JWT is stored in localStorage and the shell renders. The token is
// validated implicitly — if any management API call returns 401, apiHelper.ts clears
// the token and redirects back here (which then shows the login page again).
//
// The shell has three tabs: Menu, Tables, Orders. Each tab is a self-contained section
// component that fetches its own data and handles its own mutations.
import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import MenuSection from './management/MenuSection.js'
import TablesSection from './management/TablesSection.js'
import OrdersSection from './management/OrdersSection.js'
import SettingsSection from './management/SettingsSection.js'

export default function ManagementView() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('management_token'))

  if (!token) {
    return <LoginPage onLogin={(t) => { localStorage.setItem('management_token', t); setToken(t) }} />
  }

  return <ManagementShell token={token} onLogout={() => { localStorage.removeItem('management_token'); setToken(null) }} />
}

// ─── Login page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json() as { data?: { token: string }; error?: string }
      if (!res.ok || !json.data) {
        setError(json.error ?? t('management.loginFailed'))
        return
      }
      onLogin(json.data.token)
    } catch {
      setError(t('common.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold" textAlign="center">{t('management.title')}</Typography>
        <TextField
          label={t('management.password')} type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
          error={!!error} helperText={error} autoFocus fullWidth
        />
        <Button
          variant="contained" size="large" fullWidth
          onClick={() => void submit()} disabled={loading || !password}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t('management.signIn')}
        </Button>
      </Box>
    </Box>
  )
}

// ─── Management shell ─────────────────────────────────────────────────────────

type Section = 'menu' | 'tables' | 'orders' | 'settings'

function ManagementShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('menu')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography fontWeight="bold" sx={{ mr: 3 }}>{t('management.title')}</Typography>
          <Tabs value={section} onChange={(_, v: Section) => setSection(v)} sx={{ flex: 1 }}>
            <Tab label={t('management.tabs.menu')} value="menu" />
            <Tab label={t('management.tabs.tables')} value="tables" />
            <Tab label={t('management.tabs.orders')} value="orders" />
            <Tab label={t('management.tabs.settings')} value="settings" />
          </Tabs>
          <Button size="small" onClick={onLogout} color="inherit">{t('management.signOut')}</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, maxWidth: 960, width: '100%', mx: 'auto' }}>
        {section === 'menu' && <MenuSection token={token} />}
        {section === 'tables' && <TablesSection token={token} />}
        {section === 'orders' && <OrdersSection token={token} />}
        {section === 'settings' && <SettingsSection token={token} />}
      </Box>
    </Box>
  )
}
