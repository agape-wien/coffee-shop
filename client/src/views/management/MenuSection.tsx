// Menu management — categories and items.
//
// Displays all categories as an accordion. Each category shows all its items (including
// unavailable ones). The availability toggle is a single-tap action; all other mutations
// go through add/edit dialogs. Deletions require confirmation.
//
// After any mutation the section re-fetches from the server. The server also broadcasts
// menu:updated to all management room subscribers, but the local re-fetch is the source
// of truth for this view — it avoids depending on the socket state being set up.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import { apiFetch } from './apiHelper.js'

interface Category {
  id: string
  name: string
  sortOrder: number
  paused: boolean
  items: Item[]
}

interface ItemTranslation {
  language: string
  description: string | null
  composition: string | null
}

interface Item {
  id: string
  name: string
  description: string | null
  composition: string | null
  imageUrl: string | null
  available: boolean
  sortOrder: number
  type: 'COFFEE' | 'OTHER'
  ee: number
  me: number
  categoryId: string
  translations: ItemTranslation[]
}

// sortOrder starts at 1, not 0 — non-technical staff expect counting to start at 1.
const EMPTY_ITEM: Omit<Item, 'id' | 'categoryId'> = {
  name: '', description: '', composition: '', imageUrl: '', available: true,
  sortOrder: 1, type: 'COFFEE', ee: 0, me: 0, translations: [],
}

type TranslationMap = Record<string, { description: string; composition: string }>
const EMPTY_TRANSLATIONS: TranslationMap = { de: { description: '', composition: '' }, ro: { description: '', composition: '' } }

export default function MenuSection({ token }: { token: string }) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // ── Category dialog ──
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })
  const [catName, setCatName] = useState('')
  const [catSort, setCatSort] = useState('0')

  // ── Item dialog ──
  const [itemDialog, setItemDialog] = useState<{ open: boolean; editing: Item | null; categoryId: string }>({
    open: false, editing: null, categoryId: '',
  })
  const [itemForm, setItemForm] = useState<typeof EMPTY_ITEM & { categoryId: string }>({ ...EMPTY_ITEM, categoryId: '' })
  const [itemTranslations, setItemTranslations] = useState<TranslationMap>({ ...EMPTY_TRANSLATIONS })
  // 'url' = manual text field; 'upload' = server-hosted file. Both write to itemForm.imageUrl.
  // Mode is auto-detected on dialog open: server-hosted URLs start with /uploads/.
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url')
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Confirm dialog ──
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; message: string; onConfirm: () => void; actionLabel: string; error: string; loading: boolean
  }>({ open: false, message: '', onConfirm: () => {}, actionLabel: '', error: '', loading: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(token, '/api/v1/management/categories')
      const json = await res.json() as { data?: Category[] }
      if (json.data) setCategories(json.data)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  // ── Category actions ──

  const openAddCategory = () => {
    setCatName('')
    setCatSort('1')
    setCatDialog({ open: true, editing: null })
  }

  const openEditCategory = (cat: Category) => {
    setCatName(cat.name)
    setCatSort(String(cat.sortOrder))
    setCatDialog({ open: true, editing: cat })
  }

  const saveCategory = async () => {
    const body = { name: catName.trim(), sortOrder: parseInt(catSort, 10) || 0 }
    if (!body.name) return
    if (catDialog.editing) {
      await apiFetch(token, `/api/v1/management/categories/${catDialog.editing.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      })
    } else {
      await apiFetch(token, '/api/v1/management/categories', {
        method: 'POST', body: JSON.stringify(body),
      })
    }
    setCatDialog({ open: false, editing: null })
    void load()
  }

  const pauseCategory = async (cat: Category) => {
    await apiFetch(token, `/api/v1/management/categories/${cat.id}/pause`, { method: 'PATCH' })
    void load()
  }

  const deleteCategory = (cat: Category) => {
    setConfirmDialog({
      open: true,
      message: t('management.menu.deleteCategoryConfirm', { name: cat.name }),
      actionLabel: t('common.delete'),
      error: '',
      loading: false,
      onConfirm: async () => {
        const res = await apiFetch(token, `/api/v1/management/categories/${cat.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const json = await res.json() as { error?: string }
          setConfirmDialog(d => ({ ...d, loading: false, error: json.error ?? t('management.menu.deleteFailed') }))
          return
        }
        setConfirmDialog(d => ({ ...d, open: false }))
        void load()
      },
    })
  }

  // ── Item actions ──

  const openAddItem = (categoryId: string) => {
    setItemForm({ ...EMPTY_ITEM, categoryId, sortOrder: 1 })
    setItemTranslations({ de: { description: '', composition: '' }, ro: { description: '', composition: '' } })
    setImageMode('url')
    setItemDialog({ open: true, editing: null, categoryId })
  }

  const openEditItem = (item: Item) => {
    setItemForm({ ...item })
    const trMap: TranslationMap = { de: { description: '', composition: '' }, ro: { description: '', composition: '' } }
    for (const tr of item.translations) {
      trMap[tr.language] = { description: tr.description ?? '', composition: tr.composition ?? '' }
    }
    setItemTranslations(trMap)
    setImageMode(item.imageUrl?.startsWith('/uploads/') ? 'upload' : 'url')
    setItemDialog({ open: true, editing: item, categoryId: item.categoryId })
  }

  const handleImageUpload = async (file: File) => {
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/v1/management/upload/menu-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const json = await res.json() as { data?: { url: string } }
      if (json.data?.url) setItemForm(f => ({ ...f, imageUrl: json.data!.url }))
    } catch {
      // upload failed — user can retry
    } finally {
      setImageUploading(false)
    }
  }

  const saveItem = async () => {
    if (!itemForm.name.trim()) return
    const body = {
      ...itemForm,
      name: itemForm.name.trim(),
      description: itemForm.description || null,
      composition: itemForm.composition || null,
      imageUrl: itemForm.imageUrl || null,
    }
    let itemId: string
    if (itemDialog.editing) {
      await apiFetch(token, `/api/v1/management/items/${itemDialog.editing.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      })
      itemId = itemDialog.editing.id
    } else {
      const res = await apiFetch(token, '/api/v1/management/items', {
        method: 'POST', body: JSON.stringify(body),
      })
      const json = await res.json() as { data?: { id: string } }
      itemId = json.data?.id ?? ''
    }
    // Save translations for each non-English language in parallel.
    // The endpoint deletes the row when both fields are null, so empty inputs clean up automatically.
    if (itemId) {
      await Promise.all(
        Object.entries(itemTranslations).map(([lang, tr]) =>
          apiFetch(token, `/api/v1/management/items/${itemId}/translations/${lang}`, {
            method: 'PUT',
            body: JSON.stringify({
              description: tr.description.trim() || null,
              composition: tr.composition.trim() || null,
            }),
          })
        )
      )
    }
    setItemDialog({ open: false, editing: null, categoryId: '' })
    void load()
  }

  const toggleAvailability = async (item: Item) => {
    await apiFetch(token, `/api/v1/management/items/${item.id}/availability`, {
      method: 'PATCH', body: JSON.stringify({ available: !item.available }),
    })
    void load()
  }

  const deleteItem = (item: Item) => {
    setConfirmDialog({
      open: true,
      message: t('management.menu.deleteItemConfirm', { name: item.name }),
      actionLabel: t('common.delete'),
      error: '',
      loading: false,
      onConfirm: async () => {
        await apiFetch(token, `/api/v1/management/items/${item.id}`, { method: 'DELETE' })
        setConfirmDialog(d => ({ ...d, open: false }))
        void load()
      },
    })
  }

  if (loading && categories.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('management.menu.title')}</Typography>
        <Button variant="contained" size="small" onClick={openAddCategory} startIcon={<AddIcon />}>{t('management.menu.addCategory')}</Button>
      </Box>

      {categories.map((cat) => (
        <Accordion key={cat.id} disableGutters>
          <AccordionSummary>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography fontWeight="bold" sx={{ opacity: cat.paused ? 0.5 : 1 }}>{cat.name}</Typography>
              {cat.paused && (
                <Chip label={t('management.menu.paused')} size="small" color="warning" variant="outlined" />
              )}
              <Typography variant="caption" color="text.secondary">
                {t('management.menu.itemCount', { count: cat.items.length })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mr: 1 }} onClick={(e) => e.stopPropagation()}>
              <Button
                component="div"
                size="small"
                color={cat.paused ? 'success' : 'warning'}
                variant={cat.paused ? 'contained' : 'outlined'}
                onClick={() => void pauseCategory(cat)}
              >
                {cat.paused ? t('management.menu.resumeCategory') : t('management.menu.pauseCategory')}
              </Button>
              <Button component="div" size="small" onClick={() => openEditCategory(cat)}>{t('common.edit')}</Button>
              <Button component="div" size="small" color="error" onClick={() => void deleteCategory(cat)}>{t('common.delete')}</Button>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0 }}>
            {cat.items.map((item, i) => (
              <Box key={item.id}>
                {i > 0 && <Divider />}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, gap: 1 }}>
                  <Switch
                    size="small"
                    checked={item.available}
                    onChange={() => void toggleAvailability(item)}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: item.available ? 1 : 0.5 }}>
                      {item.name}
                    </Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary" display="block">{item.description}</Typography>
                    )}
                    {item.composition && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>{item.composition}</Typography>
                    )}
                  </Box>
                  <Chip
                    label={item.type === 'COFFEE' ? t('common.coffee') : t('common.other')}
                    size="small"
                    color={item.type === 'COFFEE' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                  <IconButton size="small" onClick={() => openEditItem(item)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => void deleteItem(item)} color="error"><DeleteForeverIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
            ))}
            <Box sx={{ p: 1.5 }}>
              <Button size="small" onClick={() => openAddItem(cat.id)} startIcon={<AddIcon />}>{t('management.menu.addItem')}</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {categories.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          {t('management.menu.noCategories')}
        </Typography>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false, editing: null })} disableRestoreFocus fullWidth maxWidth="xs">
        <DialogTitle>{catDialog.editing ? t('management.menu.editCategory') : t('management.menu.addCategoryTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label={t('management.menu.name')} value={catName} onChange={(e) => setCatName(e.target.value)}
            autoFocus fullWidth size="small"
            onKeyDown={(e) => { if (e.key === 'Enter') void saveCategory() }}
          />
          <TextField
            label={t('management.menu.sortOrder')} type="number" value={catSort}
            onChange={(e) => setCatSort(e.target.value)} size="small" sx={{ width: 120 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialog({ open: false, editing: null })}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => void saveCategory()} disabled={!catName.trim()}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog.open} onClose={() => setItemDialog({ open: false, editing: null, categoryId: '' })} disableRestoreFocus fullWidth maxWidth="sm">
        <DialogTitle>{itemDialog.editing ? t('management.menu.editItem') : t('management.menu.addItemTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label={t('management.menu.name')} value={itemForm.name} onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))} fullWidth size="small" autoFocus />
          <TextField label={t('management.menu.description')} value={itemForm.description ?? ''} onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <TextField label={t('management.menu.composition')} value={itemForm.composition ?? ''} onChange={(e) => setItemForm(f => ({ ...f, composition: e.target.value }))} fullWidth size="small" placeholder="e.g. 1/3 espresso + 2/3 microfoam" />
          <Box>
            <ToggleButtonGroup
              value={imageMode}
              exclusive
              onChange={(_, v: 'url' | 'upload') => { if (v) setImageMode(v) }}
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="url" sx={{ textTransform: 'none', px: 2 }}>{t('management.menu.imageExternal')}</ToggleButton>
              <ToggleButton value="upload" sx={{ textTransform: 'none', px: 2 }}>{t('management.menu.imageUploadMode')}</ToggleButton>
            </ToggleButtonGroup>

            {imageMode === 'url' ? (
              <TextField
                label={t('management.menu.imageUrl')}
                value={itemForm.imageUrl ?? ''}
                onChange={(e) => setItemForm(f => ({ ...f, imageUrl: e.target.value }))}
                fullWidth size="small"
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImageUpload(file)
                    e.target.value = ''
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    startIcon={imageUploading ? <CircularProgress size={14} color="inherit" /> : undefined}
                  >
                    {t('management.menu.chooseImage')}
                  </Button>
                  {itemForm.imageUrl && (
                    <Button size="small" color="error" onClick={() => setItemForm(f => ({ ...f, imageUrl: '' }))}>
                      {t('management.menu.clearImage')}
                    </Button>
                  )}
                </Box>
                {itemForm.imageUrl && (
                  <Box
                    component="img"
                    src={itemForm.imageUrl}
                    alt="preview"
                    sx={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start', border: 1, borderColor: 'divider', borderRadius: 1, p: 0.5 }}
                  />
                )}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('management.menu.type')}</InputLabel>
              {/* onClose blurs before React's batched state flush applies aria-hidden to the portal, preventing the "Blocked aria-hidden on a focused element" warning */}
              <Select value={itemForm.type} label={t('management.menu.type')} onChange={(e) => setItemForm(f => ({ ...f, type: e.target.value as 'COFFEE' | 'OTHER' }))} MenuProps={{ onClose: () => { (document.activeElement as HTMLElement)?.blur() } }}>
                <MenuItem value="COFFEE">{t('common.coffee')}</MenuItem>
                <MenuItem value="OTHER">{t('common.other')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('management.menu.category')}</InputLabel>
              <Select value={itemForm.categoryId} label={t('management.menu.category')} onChange={(e) => setItemForm(f => ({ ...f, categoryId: e.target.value }))} MenuProps={{ onClose: () => { (document.activeElement as HTMLElement)?.blur() } }}>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label={t('management.menu.sortOrder')} type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} size="small" sx={{ width: 100 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label={t('management.menu.espressoPortions')} type="number" value={itemForm.ee} onChange={(e) => setItemForm(f => ({ ...f, ee: parseFloat(e.target.value) || 0 }))} size="small" sx={{ flex: 1 }} />
            <TextField label={t('management.menu.milkMl')} type="number" value={itemForm.me} onChange={(e) => setItemForm(f => ({ ...f, me: parseFloat(e.target.value) || 0 }))} size="small" sx={{ flex: 1 }} />
          </Box>

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">{t('management.menu.translations')}</Typography>

          {/* Deutsch */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: -1 }}>Deutsch</Typography>
          <TextField
            label={t('management.menu.description')}
            value={itemTranslations.de?.description ?? ''}
            onChange={(e) => setItemTranslations(m => ({ ...m, de: { description: e.target.value, composition: m.de?.composition ?? '' } }))}
            fullWidth size="small" multiline rows={2}
          />
          <TextField
            label={t('management.menu.composition')}
            value={itemTranslations.de?.composition ?? ''}
            onChange={(e) => setItemTranslations(m => ({ ...m, de: { description: m.de?.description ?? '', composition: e.target.value } }))}
            fullWidth size="small"
          />

          {/* Română */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: -1 }}>Română</Typography>
          <TextField
            label={t('management.menu.description')}
            value={itemTranslations.ro?.description ?? ''}
            onChange={(e) => setItemTranslations(m => ({ ...m, ro: { description: e.target.value, composition: m.ro?.composition ?? '' } }))}
            fullWidth size="small" multiline rows={2}
          />
          <TextField
            label={t('management.menu.composition')}
            value={itemTranslations.ro?.composition ?? ''}
            onChange={(e) => setItemTranslations(m => ({ ...m, ro: { description: m.ro?.description ?? '', composition: e.target.value } }))}
            fullWidth size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog({ open: false, editing: null, categoryId: '' })}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => void saveItem()} disabled={!itemForm.name.trim() || !itemForm.categoryId}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Generic confirm dialog ───────────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => { if (!confirmDialog.loading) setConfirmDialog(d => ({ ...d, open: false })) }}
        disableRestoreFocus
      >
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
          {confirmDialog.error && <Alert severity="error" sx={{ mt: 1 }}>{confirmDialog.error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog(d => ({ ...d, open: false }))}
            disabled={confirmDialog.loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            color="error" variant="contained"
            disabled={confirmDialog.loading}
            onClick={() => {
              setConfirmDialog(d => ({ ...d, loading: true, error: '' }))
              void confirmDialog.onConfirm()
            }}
          >
            {confirmDialog.loading ? <CircularProgress size={18} color="inherit" /> : confirmDialog.actionLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
