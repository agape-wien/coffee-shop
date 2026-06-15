// Order history — filterable by date+time range.
// Defaults to today 00:00–23:59 UTC. Each row is expandable to show item detail.
// Summary cards (collapsible, closed by default) show totals for non-cancelled orders only.
// Rows can be multi-selected for bulk hard-delete.
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
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CoffeeIcon from '@mui/icons-material/Coffee'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FastfoodIcon from '@mui/icons-material/Fastfood'
import RefreshIcon from '@mui/icons-material/Refresh'
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
            {/* Header */}
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
  const [fromDate, setFromDate] = useState(today)
  const [fromTime, setFromTime] = useState('00:00')
  const [toDate, setToDate] = useState(today)
  const [toTime, setToTime] = useState('23:59')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSelected([])
    try {
      const from = `${fromDate}T${fromTime}:00.000Z`
      const to = `${toDate}T${toTime}:59.999Z`
      const params = new URLSearchParams({ from, to })
      const res = await apiFetch(token, `/api/v1/management/orders?${params}`)
      const json = await res.json() as { data?: OrderRow[] }
      if (json.data) setOrders(json.data)
    } finally {
      setLoading(false)
    }
  }, [token, fromDate, fromTime, toDate, toTime])

  useEffect(() => { void load() }, [load])

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

  const toggleAll = () => {
    setSelected(allSelected ? [] : orders.map((o) => o.id))
  }

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

  const summary = computeSummary(orders)

  return (
    <Box>
      {/* Toolbar: date+time filter, refresh, bulk-delete */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 1 }}>{t('management.orders.title')}</Typography>
        <TextField
          label={t('management.orders.from')} type="date" size="small" value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
        />
        <TextField
          label={t('management.orders.fromTime')} type="time" size="small" value={fromTime}
          onChange={(e) => setFromTime(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
        />
        <TextField
          label={t('management.orders.to')} type="date" size="small" value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
        />
        <TextField
          label={t('management.orders.toTime')} type="time" size="small" value={toTime}
          onChange={(e) => setToTime(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
        />
        <Tooltip title={t('management.orders.refresh')}>
          <span>
            <IconButton size="small" onClick={() => void load()} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        {selected.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            {t('management.orders.deleteSelected', { count: selected.length })}
          </Button>
        )}
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
              {/* Collapsible summary header — closed by default */}
              <Box
                onClick={() => setSummaryOpen((v) => !v)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 1,
                  px: 0.5,
                  userSelect: 'none',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <ExpandMoreIcon
                  sx={{
                    mr: 0.5,
                    transition: 'transform 0.2s',
                    transform: summaryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
                <Typography variant="subtitle2">{t('management.orders.summary')}</Typography>
              </Box>
              <Collapse in={summaryOpen}>
                <SummaryCards summary={summary} />
              </Collapse>
            </>
          )}

          {/* Select-all row */}
          {orders.length > 0 && !loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, pl: 0.5 }}>
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
                sx={{ p: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {t('management.orders.selectAll')}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {orders.map((order) => (
              <Box
                key={order.id}
                sx={{
                  border: 1,
                  borderColor: selected.includes(order.id) ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  {/* Checkbox click is stopped from bubbling so it doesn't toggle expansion */}
                  <Checkbox
                    size="small"
                    checked={selected.includes(order.id)}
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
                  <Typography variant="caption" color="text.secondary">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
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

      {/* Bulk-delete confirmation dialog */}
      <Dialog open={deleteOpen} onClose={() => { if (!deleting) setDeleteOpen(false) }}>
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
          <Button onClick={() => void confirmDelete()} color="error" disabled={deleting} variant="contained">
            {deleting ? <CircularProgress size={18} color="inherit" /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
