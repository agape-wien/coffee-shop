import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useThemeStore } from '../../stores/themeStore.js'
import { useMenuDisplayStore } from '../../stores/menuDisplayStore.js'
import { useFontSizeStore } from '../../stores/fontSizeStore.js'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ro', label: 'Română' },
]

export default function SettingsSection({ token }: { token: string }) {
  const { t, i18n } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [language, setLanguage] = useState(i18n.language.slice(0, 2))
  const [langSaving, setLangSaving] = useState(false)
  const [langError, setLangError] = useState('')
  const [pickupLanguage, setPickupLanguage] = useState('en')
  const [pickupLangSaving, setPickupLangSaving] = useState(false)
  const [pickupLangError, setPickupLangError] = useState('')
  const [qrBaseUrl, setQrBaseUrl] = useState('')
  const [qrUrlSaving, setQrUrlSaving] = useState(false)
  const [qrUrlError, setQrUrlError] = useState('')
  const [qrUrlSuccess, setQrUrlSuccess] = useState(false)
  const darkMode = useThemeStore((s) => s.darkMode)
  const setDarkMode = useThemeStore((s) => s.setDarkMode)
  const [darkSaving, setDarkSaving] = useState(false)
  const showDescription = useMenuDisplayStore((s) => s.showDescription)
  const setShowDescription = useMenuDisplayStore((s) => s.setShowDescription)
  const showComposition = useMenuDisplayStore((s) => s.showComposition)
  const setShowComposition = useMenuDisplayStore((s) => s.setShowComposition)
  const showImage = useMenuDisplayStore((s) => s.showImage)
  const setShowImage = useMenuDisplayStore((s) => s.setShowImage)
  const [descSaving, setDescSaving] = useState(false)
  const [compSaving, setCompSaving] = useState(false)
  const [imageSaving, setImageSaving] = useState(false)
  const { fsPrimary, fsSecondary, fsSmall, setFontSizes } = useFontSizeStore()
  const [fsPrimaryInput, setFsPrimaryInput] = useState(String(fsPrimary))
  const [fsSecondaryInput, setFsSecondaryInput] = useState(String(fsSecondary))
  const [fsSmallInput, setFsSmallInput] = useState(String(fsSmall))
  const [fontSaving, setFontSaving] = useState(false)
  const [fontSaved, setFontSaved] = useState(false)
  const [fontError, setFontError] = useState('')

  // Fetch both language settings on mount so the pickers reflect the stored values.
  useEffect(() => {
    fetch('/api/v1/auth/language')
      .then((r) => r.json())
      .then((json: { data?: { language: string } }) => {
        if (json.data?.language) setLanguage(json.data.language)
      })
      .catch(() => {})
    fetch('/api/v1/auth/pickup-language')
      .then((r) => r.json())
      .then((json: { data?: { pickupLanguage: string } }) => {
        if (json.data?.pickupLanguage) setPickupLanguage(json.data.pickupLanguage)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/v1/management/settings/qr-base-url', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json: { data?: { qrBaseUrl: string } }) => {
        if (json.data !== undefined) setQrBaseUrl(json.data.qrBaseUrl)
      })
      .catch(() => {})
  }, [token])

  const saveQrBaseUrl = async () => {
    const trimmed = qrBaseUrl.trim()
    if (trimmed !== '' && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setQrUrlError(t('management.settings.qrBaseUrlInvalid'))
      return
    }
    setQrUrlSaving(true)
    setQrUrlError('')
    setQrUrlSuccess(false)
    try {
      const res = await fetch('/api/v1/management/settings/qr-base-url', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrBaseUrl: qrBaseUrl.trim() }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setQrUrlError(json.error ?? t('common.serverError'))
        return
      }
      setQrUrlSuccess(true)
    } catch {
      setQrUrlError(t('common.serverError'))
    } finally {
      setQrUrlSaving(false)
    }
  }

  const saveLanguage = async (lang: string) => {
    setLangSaving(true)
    setLangError('')
    try {
      const res = await fetch('/api/v1/management/settings/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: lang }),
      })
      if (!res.ok) {
        setLangError(t('common.serverError'))
        return
      }
      setLanguage(lang)
      void i18n.changeLanguage(lang)
    } catch {
      setLangError(t('common.serverError'))
    } finally {
      setLangSaving(false)
    }
  }

  const savePickupLanguage = async (lang: string) => {
    setPickupLangSaving(true)
    setPickupLangError('')
    try {
      const res = await fetch('/api/v1/management/settings/pickup-language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: lang }),
      })
      if (!res.ok) {
        setPickupLangError(t('common.serverError'))
        return
      }
      setPickupLanguage(lang)
    } catch {
      setPickupLangError(t('common.serverError'))
    } finally {
      setPickupLangSaving(false)
    }
  }

  const saveDarkMode = async (dark: boolean) => {
    setDarkMode(dark)
    setDarkSaving(true)
    try {
      await fetch('/api/v1/management/settings/dark-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ darkMode: dark }),
      })
    } catch {
      // Best-effort: local state already updated, DB sync is fire-and-forget
    } finally {
      setDarkSaving(false)
    }
  }

  const saveShowDescription = async (v: boolean) => {
    setShowDescription(v)
    setDescSaving(true)
    try {
      await fetch('/api/v1/management/settings/show-description', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showDescription: v }),
      })
    } catch {
      // Best-effort: local state already updated, DB sync is fire-and-forget
    } finally {
      setDescSaving(false)
    }
  }

  const saveShowComposition = async (v: boolean) => {
    setShowComposition(v)
    setCompSaving(true)
    try {
      await fetch('/api/v1/management/settings/show-composition', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showComposition: v }),
      })
    } catch {
      // Best-effort: local state already updated, DB sync is fire-and-forget
    } finally {
      setCompSaving(false)
    }
  }

  const saveShowImage = async (v: boolean) => {
    setShowImage(v)
    setImageSaving(true)
    try {
      await fetch('/api/v1/management/settings/show-image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showImage: v }),
      })
    } catch {
      // Best-effort: local state already updated, DB sync is fire-and-forget
    } finally {
      setImageSaving(false)
    }
  }

  const saveFontSizes = async () => {
    const primary = parseInt(fsPrimaryInput, 10)
    const secondary = parseInt(fsSecondaryInput, 10)
    const small = parseInt(fsSmallInput, 10)
    if ([primary, secondary, small].some((v) => isNaN(v) || v < 8 || v > 120)) {
      setFontError(t('management.settings.fontSizeInvalid'))
      return
    }
    setFontSaving(true)
    setFontError('')
    setFontSaved(false)
    try {
      const res = await fetch('/api/v1/management/settings/font-sizes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fsPrimary: primary, fsSecondary: secondary, fsSmall: small }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setFontError(json.error ?? t('common.serverError'))
        return
      }
      setFontSizes(primary, secondary, small)
      setFontSaved(true)
    } catch {
      setFontError(t('common.serverError'))
    } finally {
      setFontSaving(false)
    }
  }

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !loading

  const submit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const json = await res.json() as { data?: { ok: boolean }; error?: string }
      if (!res.ok || !json.data) {
        setError(json.error ?? t('management.settings.failedMessage'))
        return
      }
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch {
      setError(t('common.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{t('management.settings.title')}</Typography>
      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{t('management.settings.changePassword')}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
        <TextField
          label={t('management.settings.currentPassword')}
          type="password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); setError(''); setSuccess(false) }}
          autoComplete="current-password"
          fullWidth
        />
        <TextField
          label={t('management.settings.newPassword')}
          type="password"
          value={next}
          onChange={(e) => { setNext(e.target.value); setError(''); setSuccess(false) }}
          error={tooShort}
          helperText={tooShort ? t('management.settings.minLength') : ''}
          autoComplete="new-password"
          fullWidth
        />
        <TextField
          label={t('management.settings.confirmPassword')}
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); setSuccess(false) }}
          error={mismatch}
          helperText={mismatch ? t('management.settings.passwordMismatch') : ''}
          autoComplete="new-password"
          fullWidth
        />

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{t('management.settings.successMessage')}</Alert>}

        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!canSubmit}
          sx={{ alignSelf: 'flex-start' }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : t('management.settings.submitButton')}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('management.settings.language')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 400 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('management.settings.language')}</InputLabel>
          <Select
            value={language}
            label={t('management.settings.language')}
            onChange={(e) => void saveLanguage(e.target.value)}
            disabled={langSaving}
          >
            {LANGUAGES.map((l) => (
              <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {langSaving && <CircularProgress size={20} />}
        {langError && <Alert severity="error" sx={{ py: 0 }}>{langError}</Alert>}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('management.settings.pickupLanguage')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 400 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('management.settings.pickupLanguage')}</InputLabel>
            <Select
              value={pickupLanguage}
              label={t('management.settings.pickupLanguage')}
              onChange={(e) => void savePickupLanguage(e.target.value)}
              disabled={pickupLangSaving}
            >
              {LANGUAGES.map((l) => (
                <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {pickupLangSaving && <CircularProgress size={20} />}
          {pickupLangError && <Alert severity="error" sx={{ py: 0 }}>{pickupLangError}</Alert>}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('management.settings.qrBaseUrl')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('management.settings.qrBaseUrlHint')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, maxWidth: 400 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="http://192.168.1.100:3001"
          value={qrBaseUrl}
          onChange={(e) => { setQrBaseUrl(e.target.value); setQrUrlSuccess(false); setQrUrlError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') void saveQrBaseUrl() }}
          error={!!qrUrlError}
          helperText={qrUrlError || ''}
        />
        <Button
          variant="contained"
          size="small"
          onClick={() => void saveQrBaseUrl()}
          disabled={qrUrlSaving}
          sx={{ whiteSpace: 'nowrap', mt: 0.125 }}
        >
          {qrUrlSaving ? <CircularProgress size={18} color="inherit" /> : t('common.save')}
        </Button>
      </Box>
      {qrUrlSuccess && <Alert severity="success" sx={{ mt: 1.5, maxWidth: 400 }}>{t('management.settings.qrBaseUrlSaved')}</Alert>}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('management.settings.appearance')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={(e) => void saveDarkMode(e.target.checked)}
              disabled={darkSaving}
            />
          }
          label={t('management.settings.darkMode')}
        />
        {darkSaving && <CircularProgress size={18} />}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('management.settings.menuDisplay')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showDescription}
                onChange={(e) => void saveShowDescription(e.target.checked)}
                disabled={descSaving}
              />
            }
            label={t('management.settings.showDescription')}
          />
          {descSaving && <CircularProgress size={18} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showComposition}
                onChange={(e) => void saveShowComposition(e.target.checked)}
                disabled={compSaving}
              />
            }
            label={t('management.settings.showComposition')}
          />
          {compSaving && <CircularProgress size={18} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showImage}
                onChange={(e) => void saveShowImage(e.target.checked)}
                disabled={imageSaving}
              />
            }
            label={t('management.settings.showImage')}
          />
          {imageSaving && <CircularProgress size={18} />}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('management.settings.fontSizes')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: 480 }}>
        <TextField
          label={t('management.settings.fontSizePrimary')}
          type="number"
          size="small"
          value={fsPrimaryInput}
          onChange={(e) => { setFsPrimaryInput(e.target.value); setFontSaved(false); setFontError('') }}
          inputProps={{ min: 8, max: 120 }}
          sx={{ width: 140 }}
        />
        <TextField
          label={t('management.settings.fontSizeSecondary')}
          type="number"
          size="small"
          value={fsSecondaryInput}
          onChange={(e) => { setFsSecondaryInput(e.target.value); setFontSaved(false); setFontError('') }}
          inputProps={{ min: 8, max: 120 }}
          sx={{ width: 140 }}
        />
        <TextField
          label={t('management.settings.fontSizeSmall')}
          type="number"
          size="small"
          value={fsSmallInput}
          onChange={(e) => { setFsSmallInput(e.target.value); setFontSaved(false); setFontError('') }}
          inputProps={{ min: 8, max: 120 }}
          sx={{ width: 140 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={() => void saveFontSizes()}
          disabled={fontSaving}
          sx={{ mb: 0.125 }}
        >
          {fontSaving ? <CircularProgress size={18} color="inherit" /> : t('common.save')}
        </Button>
      </Box>
      {fontError && <Alert severity="error" sx={{ mt: 1.5, maxWidth: 480 }}>{fontError}</Alert>}
      {fontSaved && <Alert severity="success" sx={{ mt: 1.5, maxWidth: 480 }}>{t('management.settings.fontSizesSaved')}</Alert>}
    </Box>
  )
}
