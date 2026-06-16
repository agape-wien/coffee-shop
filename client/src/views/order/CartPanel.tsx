// Two-tab panel on the right/bottom of the ordering view.
//
// Tab 1 — Order: the editable cart and Place Order button. After a successful submit the cart
//   clears immediately so staff can start the next order without waiting for anything.
//   Cart lines show item name (left) and quantity controls (right). Tapping an item name
//   reveals a collapsible notes field; it collapses again on blur if left empty.
//
// Tab 2 — Open: live list of all active orders for the selected table (any part still PENDING,
//   IN_PROGRESS, or DONE). Updates arrive via the table:{tableId} socket room. Each order card
//   shows the item list, part status chips, and a "Delivered" button when a part is DONE.
//
// Table selector sits above both tabs and drives both: the cart's tableId and the Open tab's
// filter are the same value. In staff mode it's an unlocked dropdown defaulting to the Bar
// table. In QR mode the table is resolved from the URL token and locked.
//
// Order number field: rendered to the right of the tab bar, visible only when the Bar table
// is selected. Pre-filled from GET /api/v1/orders/next-number on mount and re-fetched after
// every successful submit so the field always shows the next number. Staff can override it
// to sync with a new paper block; overriding also resets the daily counter on the server.
import { useState, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MuiMenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Badge from '@mui/material/Badge'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import AddIcon from '@mui/icons-material/Add'
import CoffeeIcon from '@mui/icons-material/Coffee'
import FastfoodIcon from '@mui/icons-material/Fastfood'
import RemoveIcon from '@mui/icons-material/Remove'
import { useTranslation } from 'react-i18next'
import type { Table, Order } from '@coffee/shared'
import { BAR_TABLE_ID } from '@coffee/shared'
import { useOrderStore } from '../../stores/orderStore.js'
import { getSocket } from '../../hooks/useSocket.js'

interface Props {
  tableFromToken: Table | null
  isTokenMode: boolean
}

export default function CartPanel({ tableFromToken, isTokenMode }: Props) {
  const { t } = useTranslation()
  const { tableId, setTableId, orderNumber, setOrderNumber, submitting, submitError } = useOrderStore()
  const isBar = tableId === BAR_TABLE_ID
  const prevSubmittingRef = useRef(submitting)
  // Bar is hardcoded as the first entry so the Select always has a valid option on first render,
  // before the async table fetch completes. API results are filtered to avoid a duplicate Bar row.
  const [tables, setTables] = useState<Table[]>([{ id: BAR_TABLE_ID, number: 0, label: 'Bar' }])
  const [tab, setTab] = useState(0)
  const [openOrders, setOpenOrders] = useState<Order[]>([])
  const [numberLoading, setNumberLoading] = useState(true)

  // Pre-fill the order number field with the next auto number (bar orders only).
  // Also re-fetches after a successful submit (detected by submitting going true→false
  // with no error) so the field always shows the next number rather than clearing.
  const fetchNextNumber = useCallback(() => {
    if (!isBar) { setNumberLoading(false); return }
    setNumberLoading(true)
    fetch('/api/v1/orders/next-number')
      .then((r) => r.json())
      .then((json: { data?: { number: number } }) => {
        if (json.data) setOrderNumber(String(json.data.number))
      })
      .catch(() => {})
      .finally(() => setNumberLoading(false))
  }, [isBar, setOrderNumber])

  useEffect(() => { fetchNextNumber() }, [fetchNextNumber])

  useEffect(() => {
    const wasSubmitting = prevSubmittingRef.current
    prevSubmittingRef.current = submitting
    if (wasSubmitting && !submitting && !submitError && isBar) {
      fetchNextNumber()
    }
  }, [submitting, submitError, isBar, fetchNextNumber])

  // Fetch table list (staff mode only — QR mode locks to the token table)
  useEffect(() => {
    if (isTokenMode) return
    fetch('/api/v1/tables')
      .then((r) => r.json())
      .then((json: { data?: Table[] }) => {
        if (json.data) setTables([
          { id: BAR_TABLE_ID, number: 0, label: 'Bar' },
          ...json.data.filter((t) => t.id !== BAR_TABLE_ID),
        ])
      })
      .catch(() => {})
  }, [isTokenMode])

  // Fetch open orders whenever the selected table changes
  const fetchOpenOrders = useCallback(() => {
    fetch(`/api/v1/orders/open?tableId=${encodeURIComponent(tableId)}`)
      .then((r) => r.json())
      .then((json: { data?: Order[] }) => { if (json.data) setOpenOrders(json.data) })
      .catch(() => {})
  }, [tableId])

  useEffect(() => { fetchOpenOrders() }, [fetchOpenOrders])

  // Join the table socket room and keep open orders live
  useEffect(() => {
    const socket = getSocket()
    const room = `table:${tableId}`
    socket.emit('view:join', { room })

    const handlePlaced = (order: Order) => {
      if (order.tableId === tableId) {
        setOpenOrders((prev) => [...prev, order])
      }
    }

    const handleUpdated = (order: Order) => {
      if (order.tableId !== tableId) return
      const settled = isSettled(order)
      setOpenOrders((prev) =>
        settled
          ? prev.filter((o) => o.id !== order.id)
          : prev.map((o) => o.id === order.id ? order : o)
      )
    }

    socket.on('order:placed', handlePlaced)
    socket.on('order:updated', handleUpdated)
    return () => {
      socket.off('order:placed', handlePlaced)
      socket.off('order:updated', handleUpdated)
    }
  }, [tableId])

  const pendingCount = openOrders.length

  return (
    <Box data-testid="cart-panel" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Table selector — above tabs, visible in both modes */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0, bgcolor: 'background.paper', position: 'relative', zIndex: 1 }}>
        {isTokenMode && tableFromToken ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 'var(--fs-secondary)' }}>
            {tableFromToken.label
              ? t('common.tableWithLabel', { number: tableFromToken.number, label: tableFromToken.label })
              : t('common.table', { number: tableFromToken.number })}
          </Typography>
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: 'var(--fs-small)' }}>{t('order.tableLabel')}</InputLabel>
            <Select
              value={tableId}
              label={t('order.tableLabel')}
              onChange={(e) => setTableId(e.target.value as string)}
              sx={{ fontSize: 'var(--fs-secondary)' }}
            >
              {tables.map((tbl) => (
                <MuiMenuItem key={tbl.id} value={tbl.id} sx={{ fontSize: 'var(--fs-secondary)' }}>
                  {tbl.id === BAR_TABLE_ID
                    ? t('common.bar')
                    : tbl.label
                      ? t('common.tableWithLabel', { number: tbl.number, label: tbl.label })
                      : t('common.table', { number: tbl.number })}
                </MuiMenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, px: 1, bgcolor: 'background.paper', position: 'relative', zIndex: 1 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ flex: 1 }}>
          <Tab label={t('order.orderTab')} sx={{ fontSize: 'var(--fs-primary)' }} />
          <Tab
            sx={{ fontSize: 'var(--fs-primary)' }}
            label={
              <Badge badgeContent={pendingCount} color="primary" max={99}>
                <Box sx={{ pr: pendingCount > 0 ? 1.5 : 0 }}>{t('order.openTab')}</Box>
              </Badge>
            }
          />
        </Tabs>
        {isBar && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 1 }}>
            <Typography fontWeight="bold" sx={{ fontSize: 'var(--fs-primary)' }}>#</Typography>
            <TextField
              size="small"
              type="number"
              placeholder={numberLoading ? '…' : ''}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              error={
                orderNumber.trim() !== '' &&
                (isNaN(parseInt(orderNumber, 10)) || parseInt(orderNumber, 10) < 1 || parseInt(orderNumber, 10) > 999)
              }
              disabled={numberLoading}
              inputProps={{ min: 1, max: 999, step: 1, 'data-testid': 'order-number-input', style: { fontSize: 'var(--fs-primary)', paddingLeft: 7, paddingRight: 7 } }}
              sx={{ width: 60 }}
            />
          </Box>
        )}
      </Box>
      <Divider sx={{ flexShrink: 0 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 0 && <CartView />}
        {tab === 1 && <OpenOrdersView orders={openOrders} />}
      </Box>
    </Box>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSettled(order: Order): boolean {
  const terminal = (s: Order['coffeeStatus']) => s == null || s === 'PICKED_UP' || s === 'CANCELLED'
  return terminal(order.coffeeStatus) && terminal(order.otherStatus)
}

// ─── Cart view ────────────────────────────────────────────────────────────────

function CartView() {
  const { t } = useTranslation()
  const {
    cart, orderNumber, submitting, submitError,
    setQuantity, setItemNotes, submit,
  } = useOrderStore()

  const isEmpty = cart.length === 0
  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0)

  const trimmed = orderNumber.trim()
  const parsedNumber = trimmed !== '' ? parseInt(trimmed, 10) : undefined
  const numberError = parsedNumber !== undefined && (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 999)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
        <Typography fontWeight="bold" sx={{ fontSize: 'var(--fs-primary)' }}>{t('order.yourOrder')}</Typography>
        {totalItems > 0 && (
          <Typography sx={{ fontSize: 'var(--fs-primary)' }}>
            {t('order.itemCount', { count: totalItems })}
          </Typography>
        )}
      </Box>

      {isEmpty ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.disabled" sx={{ fontSize: 'var(--fs-secondary)' }}>{t('order.addItems')}</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto', mb: 1 }}>
          <List disablePadding>
            {cart.map((l) => (
              <CartLineItem
                key={l.lineId}
                line={l}
                onQuantity={(qty) => setQuantity(l.lineId, qty)}
                onNotes={(notes) => setItemNotes(l.lineId, notes)}
              />
            ))}
          </List>
        </Box>
      )}

      <Divider sx={{ my: 1, flexShrink: 0 }} />

      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0, fontSize: 'var(--fs-secondary)' }}>{submitError}</Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        data-testid="place-order-btn"
        disabled={isEmpty || submitting || numberError}
        onClick={() => { void submit() }}
        sx={{ minHeight: 56, flexShrink: 0, fontSize: 'var(--fs-primary)' }}
      >
        {submitting ? <CircularProgress size={24} color="inherit" /> : t('order.placeOrder')}
      </Button>
    </Box>
  )
}

// ─── Cart line item ───────────────────────────────────────────────────────────

interface CartLineItemProps {
  line: import('../../stores/orderStore.js').CartLine
  onQuantity: (qty: number) => void
  onNotes: (notes: string) => void
}

// Notes are edited in a modal dialog that opens above the on-screen keyboard on mobile.
// The inline expand/collapse approach was replaced because the keyboard pushed the field
// offscreen when it appeared. The dialog mounts above the keyboard regardless of scroll
// position. A local draft state lets the user cancel without saving.
// The cart line still shows any saved notes as a summary line so staff can see them at a glance.
function CartLineItem({ line: l, onQuantity, onNotes }: CartLineItemProps) {
  const { t } = useTranslation()
  const [notesOpen, setNotesOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const openNotes = () => {
    setDraft(l.notes)
    setNotesOpen(true)
  }

  const saveNotes = () => {
    onNotes(draft)
    setNotesOpen(false)
  }

  return (
    <>
      <ListItem data-testid="cart-line" disableGutters sx={{ flexDirection: 'column', alignItems: 'stretch', pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            onClick={openNotes}
            sx={{ fontSize: 'var(--fs-primary)', cursor: 'pointer' }}
          >
            {l.menuItem.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined" size="small"
              onClick={() => onQuantity(l.quantity - 1)}
              sx={{ minWidth: 48, minHeight: 48, px: 0 }}
            ><RemoveIcon /></Button>
            <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 'bold', fontSize: 'var(--fs-primary)' }}>
              {l.quantity}
            </Typography>
            <Button
              variant="outlined" size="small"
              onClick={() => onQuantity(l.quantity + 1)}
              sx={{ minWidth: 48, minHeight: 48, px: 0 }}
            ><AddIcon /></Button>
          </Box>
        </Box>
        {l.notes && (
          <Typography
            variant="body2"
            color="text.secondary"
            onClick={openNotes}
            sx={{ fontSize: 'var(--fs-small)', mt: 0.25, cursor: 'pointer' }}
          >
            {l.notes}
          </Typography>
        )}
      </ListItem>

      <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontSize: 'var(--fs-primary)', pb: 1 }}>{l.menuItem.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder={t('order.notesPlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputProps={{ maxLength: 200, style: { fontSize: 'var(--fs-secondary)' } }}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesOpen(false)} sx={{ fontSize: 'var(--fs-secondary)' }}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={saveNotes} sx={{ fontSize: 'var(--fs-secondary)' }}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Open orders view ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  PICKED_UP: 'default',
  CANCELLED: 'error',
}

function OpenOrdersView({ orders }: { orders: Order[] }) {
  const { t } = useTranslation()
  const socket = getSocket()

  const deliver = (orderId: string, part: 'coffee' | 'other') => {
    socket.emit('order:part:picked_up', { orderId, part })
  }

  if (orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.disabled" sx={{ fontSize: 'var(--fs-secondary)' }}>{t('order.noOpenOrders')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ overflowY: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      {orders.map((order) => (
        <Card key={order.id} data-testid="open-order-card" data-orderid={order.id} variant="outlined">
          <CardContent sx={{ pb: '12px !important' }}>
            {/* Header: order number (bar only) or just order indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: 'var(--fs-primary)' }}>
                #{order.number}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 'var(--fs-secondary)' }}>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </Typography>
            </Box>

            {/* Items list */}
            <Box sx={{ mb: 1.5 }}>
              {order.items.map((item) => (
                <Typography key={item.id} variant="body2" color="text.secondary" sx={{ fontSize: 'var(--fs-secondary)' }}>
                  {item.quantity}× {item.menuItem.name}
                  {item.notes ? ` — ${item.notes}` : ''}
                </Typography>
              ))}
            </Box>

            {/* Part statuses + deliver buttons.
                Button is always visible for active parts (not yet PICKED_UP/CANCELLED) so
                staff can see it's coming — it's just disabled until the barista marks DONE. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {order.coffeeStatus && order.coffeeStatus !== 'PICKED_UP' && order.coffeeStatus !== 'CANCELLED' && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CoffeeIcon sx={{ fontSize: 'var(--fs-secondary)' }} />
                    <Typography variant="body2" sx={{ fontSize: 'var(--fs-secondary)' }}>{t('common.coffee')}</Typography>
                    <Chip
                      label={t(`status.${order.coffeeStatus}`, order.coffeeStatus)}
                      color={STATUS_COLOR[order.coffeeStatus] ?? 'default'}
                      size="small"
                      sx={{ fontSize: 'var(--fs-secondary)' }}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={order.coffeeStatus !== 'DONE'}
                    onClick={() => deliver(order.id, 'coffee')}
                    sx={{ fontSize: 'var(--fs-secondary)' }}
                  >
                    {t('order.deliver')}
                  </Button>
                </Box>
              )}
              {order.otherStatus && order.otherStatus !== 'PICKED_UP' && order.otherStatus !== 'CANCELLED' && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FastfoodIcon sx={{ fontSize: 'var(--fs-secondary)' }} />
                    <Typography variant="body2" sx={{ fontSize: 'var(--fs-secondary)' }}>{t('common.other')}</Typography>
                    <Chip
                      label={t(`status.${order.otherStatus}`, order.otherStatus)}
                      color={STATUS_COLOR[order.otherStatus] ?? 'default'}
                      size="small"
                      sx={{ fontSize: 'var(--fs-secondary)' }}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={order.otherStatus !== 'DONE'}
                    onClick={() => deliver(order.id, 'other')}
                    sx={{ fontSize: 'var(--fs-secondary)' }}
                  >
                    {t('order.deliver')}
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
      </Box>
    </Box>
  )
}
