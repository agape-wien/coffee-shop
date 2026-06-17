// Order history — filterable by date+time range.
// Defaults to today 00:00–23:59 UTC. Each row is expandable to show item detail.
// Summary cards (collapsible, closed by default) show totals for non-cancelled orders only.
// Rows can be multi-selected for bulk hard-delete.
// Events are named time-range presets: selecting one from the dropdown applies its
// from/to timestamps to the filter fields so staff can quickly re-filter to a known window.
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
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
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CoffeeIcon from '@mui/icons-material/Coffee'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FastfoodIcon from '@mui/icons-material/Fastfood'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker'
import dayjs from 'dayjs'
import { apiFetch } from './apiHelper.js'

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  menuItem: { id: string; name: string; type: string; ee: number; me: number }
}

interface OrderRow {
  id: string
  number: number
  coffeeStatus: string | null
  otherStatus: string | null
  createdAt: string
  table: { id: string; number: number; label: string | null }
  items: OrderItem[]
}

interface EventRow {
  id: string
  name: string
  fromTime: string  // ISO datetime string (UTC)
  toTime: string    // ISO datetime string (UTC)
}

interface ItemSummary {
  id: string
  name: string
  quantity: number
  totalEe: number
  totalMe: number
}

interface Summary {
  orderCount: number
  totalEe: number
  totalMeL: number
  items: ItemSummary[]
}

// Excluded from all totals: orders where every present part is CANCELLED.
function isCancelled(order: OrderRow): boolean {
  return (
    (order.coffeeStatus === null || order.coffeeStatus === 'CANCELLED') &&
    (order.otherStatus === null || order.otherStatus === 'CANCELLED')
  )
}

function computeSummary(orders: OrderRow[]): Summary {
  const active = orders.filter((o) => !isCancelled(o))
  const itemMap = new Map<string, ItemSummary>()
  let totalEe = 0
  let totalMe = 0

  for (const order of active) {
    for (const item of order.items) {
      const qty = item.quantity
      const ee = item.menuItem.ee * qty
      const me = item.menuItem.me * qty
      const existing = itemMap.get(item.menuItem.id)
      if (existing) {
        existing.quantity += qty
        existing.totalEe += ee
        existing.totalMe += me
      } else {
        itemMap.set(item.menuItem.id, {
          id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: qty,
          totalEe: ee,
          totalMe: me,
        })
      }
      totalEe += ee
      totalMe += me
    }
  }

  return {
    orderCount: active.length,
    totalEe,
    totalMeL: totalMe / 1000,
    items: [...itemMap.values()].sort((a, b) => b.quantity - a.quantity),
  }
}

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  PENDING: 'primary',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  PICKED_UP: 'default',
  CANCELLED: 'error',
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

// Extracts local-time YYYY-MM-DD and HH:MM from a UTC ISO string.
// Date-time strings without a timezone designator are parsed as local time by the JS engine,
// so we use Date methods to pull the local fields rather than slicing the UTC string.
function isoToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

// Constructs a UTC ISO string from local date (YYYY-MM-DD) and time (HH:MM).
// Omitting the timezone designator makes the JS engine treat the string as local time,
// so new Date(...).toISOString() correctly converts to UTC for the server query.
function localPartsToIso(date: string, time: string, endOfMinute = false): string {
  const suffix = endOfMinute ? ':59.999' : ':00.000'
  return new Date(`${date}T${time}${suffix}`).toISOString()
}

// Formats stored UTC event timestamps as a human-readable range in local time.
function formatEventRange(event: EventRow): string {
  const { date: fd, time: ft } = isoToLocalParts(event.fromTime)
  const { date: td, time: tt } = isoToLocalParts(event.toTime)
  return fd === td
    ? `${fd} ${ft} – ${tt}`     // same day: "2026-06-15 08:00 – 23:59"
    : `${fd} ${ft} – ${td} ${tt}` // different days: full both sides
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Paper variant="outlined" sx={{ px: 2.5, py: 2, minWidth: 140, flex: '1 1 140px' }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="h5" fontWeight="bold" component="span">{value}</Typography>
      {unit && (
        <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 0.5 }}>{unit}</Typography>
      )}
    </Paper>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: Summary }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard label={t('management.orders.statOrders')} value={String(summary.orderCount)} unit="" />
        <StatCard label={t('management.orders.statCoffeeEq')} value={summary.totalEe.toFixed(1)} unit={t('management.orders.portions')} />
        <StatCard label={t('management.orders.statMilk')} value={summary.totalMeL.toFixed(2)} unit="L" />
      </Box>

      <Paper variant="outlined" sx={{ px: 2.5, py: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          {t('management.orders.perItem')}
        </Typography>
        {summary.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('management.orders.noItems')}</Typography>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, pb: 0.5, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{t('management.orders.colItem')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 48, textAlign: 'right' }}>{t('management.orders.colQty')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 80, textAlign: 'right' }}>{t('management.orders.colCoffeeEq')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 64, textAlign: 'right' }}>{t('management.orders.colMilk')}</Typography>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
            {summary.items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', gap: 2, py: 0.25 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>{item.name}</Typography>
                <Typography variant="body2" sx={{ width: 48, textAlign: 'right' }}>×{item.quantity}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80, textAlign: 'right' }}>
                  {item.totalEe > 0 ? `${item.totalEe.toFixed(1)} ${t('management.orders.portions')}` : '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ width: 64, textAlign: 'right' }}>
                  {item.totalMe > 0 ? `${(item.totalMe / 1000).toFixed(2)} L` : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function OrdersSection({ token }: { token: string }) {
  const { t } = useTranslation()
  const today = todayString()

  // ── Filter state ──────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState(today)
  const [fromTime, setFromTime] = useState('00:00')
  const [toDate, setToDate] = useState(today)
  const [toTime, setToTime] = useState('23:59')

  // ── Order list state ──────────────────────────────────────────────────────
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Event state ───────────────────────────────────────────────────────────
  const [events, setEvents] = useState<EventRow[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [eventName, setEventName] = useState('')
  const [eventFromDate, setEventFromDate] = useState('')
  const [eventFromTime, setEventFromTime] = useState('00:00')
  const [eventToDate, setEventToDate] = useState('')
  const [eventToTime, setEventToTime] = useState('23:59')
  const [eventSaving, setEventSaving] = useState(false)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)

  // ── Load orders ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setSelected([])
    try {
      const from = localPartsToIso(fromDate, fromTime)
      const to = localPartsToIso(toDate, toTime, true)
      const params = new URLSearchParams({ from, to })
      const res = await apiFetch(token, `/api/v1/management/orders?${params}`)
      const json = await res.json() as { data?: OrderRow[] }
      if (json.data) setOrders(json.data)
    } finally {
      setLoading(false)
    }
  }, [token, fromDate, fromTime, toDate, toTime])

  useEffect(() => { void load() }, [load])

  // ── Load events (once on mount) ───────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    try {
      const res = await apiFetch(token, '/api/v1/management/events')
      const json = await res.json() as { data?: EventRow[] }
      if (json.data) setEvents(json.data)
    } catch {
      // Non-critical — events list stays empty if the fetch fails
    }
  }, [token])

  useEffect(() => { void loadEvents() }, [loadEvents])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const tableLabel = (order: OrderRow) => {
    const tbl = order.table
    if (tbl.id === 'bar') return t('common.bar')
    return tbl.label
      ? t('common.tableWithLabel', { number: tbl.number, label: tbl.label })
      : t('common.table', { number: tbl.number })
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const allSelected = orders.length > 0 && selected.length === orders.length
  const someSelected = selected.length > 0 && selected.length < orders.length
  const toggleAll = () => { setSelected(allSelected ? [] : orders.map((o) => o.id)) }

  // Applying a filter input manually deselects the active event — the stored
  // timestamps no longer match what the user has typed.
  const handleFromDate = (v: string) => { setFromDate(v); setSelectedEventId('') }
  const handleFromTime = (v: string) => { setFromTime(v); setSelectedEventId('') }
  const handleToDate = (v: string) => { setToDate(v); setSelectedEventId('') }
  const handleToTime = (v: string) => { setToTime(v); setSelectedEventId('') }

  // ── Bulk delete orders ────────────────────────────────────────────────────

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await apiFetch(token, '/api/v1/management/orders', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selected }),
      })
      setDeleteOpen(false)
      setSelected([])
      void load()
    } finally {
      setDeleting(false)
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  // Applying an event populates the filter inputs with its stored timestamps,
  // which triggers the orders useEffect to reload with the new range.
  const applyEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    if (!eventId) return
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return
    const { date: fd, time: ft } = isoToLocalParts(ev.fromTime)
    const { date: td, time: tt } = isoToLocalParts(ev.toTime)
    setFromDate(fd)
    setFromTime(ft)
    setToDate(td)
    setToTime(tt)
  }

  // Opens the add dialog pre-filled with the current filter values so staff can
  // quickly save an active filter range as a named event in one click.
  const openAddEvent = () => {
    setEditingEvent(null)
    setEventName('')
    setEventFromDate(fromDate)
    setEventFromTime(fromTime)
    setEventToDate(toDate)
    setEventToTime(toTime)
    setEventDialogOpen(true)
  }

  const openEditEvent = () => {
    const ev = events.find((e) => e.id === selectedEventId)
    if (!ev) return
    setEditingEvent(ev)
    setEventName(ev.name)
    const { date: fd, time: ft } = isoToLocalParts(ev.fromTime)
    const { date: td, time: tt } = isoToLocalParts(ev.toTime)
    setEventFromDate(fd)
    setEventFromTime(ft)
    setEventToDate(td)
    setEventToTime(tt)
    setEventDialogOpen(true)
  }

  const saveEvent = async () => {
    if (!eventName.trim() || !eventFromDate || !eventToDate) return
    setEventSaving(true)
    try {
      const body = {
        name: eventName.trim(),
        fromTime: localPartsToIso(eventFromDate, eventFromTime),
        toTime: localPartsToIso(eventToDate, eventToTime, true),
      }
      let savedId = editingEvent?.id ?? ''
      if (editingEvent) {
        await apiFetch(token, `/api/v1/management/events/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        const res = await apiFetch(token, '/api/v1/management/events', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json() as { data?: EventRow }
        savedId = json.data?.id ?? ''
      }
      setEventDialogOpen(false)
      await loadEvents()
      // Auto-select the saved event so the filter reflects it immediately.
      if (savedId) applyEvent(savedId)
    } finally {
      setEventSaving(false)
    }
  }

  const confirmDeleteEvent = async () => {
    if (!selectedEventId) return
    setDeletingEvent(true)
    try {
      await apiFetch(token, `/api/v1/management/events/${selectedEventId}`, { method: 'DELETE' })
      setSelectedEventId('')
      setDeleteEventOpen(false)
      await loadEvents()
    } finally {
      setDeletingEvent(false)
    }
  }

  const summary = computeSummary(orders)

  return (
    <Box>
      {/* ── Events row ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel shrink>{t('management.orders.event')}</InputLabel>
          <Select
            value={selectedEventId}
            label={t('management.orders.event')}
            notched
            displayEmpty
            onChange={(e) => applyEvent(String(e.target.value))}
            renderValue={(val) => {
              if (!val) return <em style={{ fontStyle: 'normal', color: 'inherit' }}>{t('management.orders.noEvent')}</em>
              const ev = events.find((e) => e.id === val)
              return ev ? ev.name : ''
            }}
          >
            <MenuItem value=""><em>{t('management.orders.noEvent')}</em></MenuItem>
            {events.length === 0 && (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">{t('management.orders.noEventsDefined')}</Typography>
              </MenuItem>
            )}
            {events.map((ev) => (
              <MenuItem key={ev.id} value={ev.id}>
                <Box>
                  <Typography variant="body2">{ev.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatEventRange(ev)}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title={t('management.orders.editEvent')}>
          <span>
            <IconButton size="small" onClick={openEditEvent} disabled={!selectedEventId}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('management.orders.deleteEvent')}>
          <span>
            <IconButton size="small" onClick={() => setDeleteEventOpen(true)} disabled={!selectedEventId} color="error">
              <DeleteForeverIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('management.orders.addEvent')}>
          <IconButton size="small" onClick={openAddEvent} color="primary">
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Filter toolbar ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 1 }}>{t('management.orders.title')}</Typography>
        <DesktopDatePicker
          label={t('management.orders.from')} format="DD.MM.YYYY"
          value={dayjs(fromDate)}
          onChange={(v) => { if (v?.isValid()) handleFromDate(v.format('YYYY-MM-DD')) }}
          slots={{ openPickerIcon: CalendarTodayIcon }}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <DesktopTimePicker
          label={t('management.orders.fromTime')} ampm={false}
          value={dayjs(`2000-01-01T${fromTime}:00`)}
          onChange={(v) => { if (v?.isValid()) handleFromTime(v.format('HH:mm')) }}
          slots={{ openPickerIcon: AccessTimeIcon }}
          slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
        />
        <DesktopDatePicker
          label={t('management.orders.to')} format="DD.MM.YYYY"
          value={dayjs(toDate)}
          onChange={(v) => { if (v?.isValid()) handleToDate(v.format('YYYY-MM-DD')) }}
          slots={{ openPickerIcon: CalendarTodayIcon }}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <DesktopTimePicker
          label={t('management.orders.toTime')} ampm={false}
          value={dayjs(`2000-01-01T${toTime}:00`)}
          onChange={(v) => { if (v?.isValid()) handleToTime(v.format('HH:mm')) }}
          slots={{ openPickerIcon: AccessTimeIcon }}
          slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
        />
        <Tooltip title={t('management.orders.refresh')}>
          <span>
            <IconButton size="small" onClick={() => void load()} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        {loading && <CircularProgress size={20} />}
      </Box>

      {orders.length === 0 && !loading ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          {t('management.orders.noOrders')}
        </Typography>
      ) : (
        <>
          {!loading && (
            <>
              {/* Collapsible summary — closed by default */}
              <Box
                onClick={() => setSummaryOpen((v) => !v)}
                sx={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1, px: 0.5,
                  userSelect: 'none', '&:hover': { color: 'primary.main' },
                }}
              >
                <ExpandMoreIcon
                  sx={{ mr: 0.5, transition: 'transform 0.2s', transform: summaryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
                <Typography variant="subtitle2">{t('management.orders.summary')}</Typography>
              </Box>
              <Collapse in={summaryOpen}>
                <SummaryCards summary={summary} />
              </Collapse>
            </>
          )}

          {orders.length > 0 && !loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, pl: 0.5, gap: 1 }}>
              <Checkbox
                size="small" checked={allSelected} indeterminate={someSelected}
                onChange={toggleAll} sx={{ p: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {t('management.orders.selectAll')}
              </Typography>
              <Button
                variant="outlined" color="error" size="small"
                startIcon={<DeleteForeverIcon />}
                disabled={selected.length === 0}
                onClick={() => setDeleteOpen(true)}
                sx={{ ml: 1 }}
              >
                {t('management.orders.deleteSelected', { count: selected.length })}
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {orders.map((order) => (
              <Box
                key={order.id}
                sx={{
                  border: 1,
                  borderColor: selected.includes(order.id) ? 'primary.main' : 'divider',
                  borderRadius: 1, overflow: 'hidden',
                }}
              >
                <Box
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Checkbox
                    size="small" checked={selected.includes(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ p: 0.5 }}
                  />
                  <Typography fontWeight="bold" sx={{ minWidth: 40 }}>#{order.number}</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>{tableLabel(order)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {order.coffeeStatus && (
                      <Chip icon={<CoffeeIcon />} label={t(`status.${order.coffeeStatus}`)} size="small" color={STATUS_COLOR[order.coffeeStatus] ?? 'default'} />
                    )}
                    {order.otherStatus && (
                      <Chip icon={<FastfoodIcon />} label={t(`status.${order.otherStatus}`)} size="small" color={STATUS_COLOR[order.otherStatus] ?? 'default'} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(order.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </Typography>
                  </Box>
                </Box>

                <Collapse in={expanded === order.id}>
                  <Box sx={{ px: 2, pb: 1.5, borderTop: 1, borderColor: 'divider', pt: 1 }}>
                    {order.items.map((item) => (
                      <Typography key={item.id} variant="body2" color="text.secondary">
                        {item.quantity}× {item.menuItem.name}
                        {item.notes ? ` — ${item.notes}` : ''}
                      </Typography>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* ── Event add / edit dialog ─────────────────────────────────────────── */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => { if (!eventSaving) setEventDialogOpen(false) }}
        disableRestoreFocus
        fullWidth maxWidth="xs"
      >
        <DialogTitle>
          {editingEvent ? t('management.orders.editEventTitle') : t('management.orders.addEventTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('management.orders.eventName')}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              fullWidth autoFocus size="small"
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <DesktopDatePicker
                label={t('management.orders.from')} format="DD.MM.YYYY"
                value={dayjs(eventFromDate)}
                onChange={(v) => { if (v?.isValid()) setEventFromDate(v.format('YYYY-MM-DD')) }}
                slots={{ openPickerIcon: CalendarTodayIcon }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                sx={{ flex: 1 }}
              />
              <DesktopTimePicker
                label={t('management.orders.fromTime')} ampm={false}
                value={dayjs(`2000-01-01T${eventFromTime}:00`)}
                onChange={(v) => { if (v?.isValid()) setEventFromTime(v.format('HH:mm')) }}
                slots={{ openPickerIcon: AccessTimeIcon }}
                slotProps={{ textField: { size: 'small', sx: { width: 120 } } }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <DesktopDatePicker
                label={t('management.orders.to')} format="DD.MM.YYYY"
                value={dayjs(eventToDate)}
                onChange={(v) => { if (v?.isValid()) setEventToDate(v.format('YYYY-MM-DD')) }}
                slots={{ openPickerIcon: CalendarTodayIcon }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                sx={{ flex: 1 }}
              />
              <DesktopTimePicker
                label={t('management.orders.toTime')} ampm={false}
                value={dayjs(`2000-01-01T${eventToTime}:00`)}
                onChange={(v) => { if (v?.isValid()) setEventToTime(v.format('HH:mm')) }}
                slots={{ openPickerIcon: AccessTimeIcon }}
                slotProps={{ textField: { size: 'small', sx: { width: 120 } } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)} disabled={eventSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveEvent()}
            disabled={eventSaving || !eventName.trim() || !eventFromDate || !eventToDate}
          >
            {eventSaving ? <CircularProgress size={18} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Event delete confirmation ───────────────────────────────────────── */}
      <Dialog open={deleteEventOpen} onClose={() => { if (!deletingEvent) setDeleteEventOpen(false) }} disableRestoreFocus>
        <DialogTitle>{t('management.orders.deleteEventTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('management.orders.deleteEventMessage', {
              name: events.find((e) => e.id === selectedEventId)?.name ?? '',
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEventOpen(false)} disabled={deletingEvent}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void confirmDeleteEvent()} color="error" variant="contained" disabled={deletingEvent}>
            {deletingEvent ? <CircularProgress size={18} color="inherit" /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk-delete orders confirmation ────────────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => { if (!deleting) setDeleteOpen(false) }} disableRestoreFocus>
        <DialogTitle>{t('management.orders.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('management.orders.deleteConfirmMessage', { count: selected.length })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void confirmDelete()} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={18} color="inherit" /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
