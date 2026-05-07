// Two-tab panel on the right/bottom of the ordering view.
//
// Tab 1 — Order: the editable cart and Place Order button. After a successful submit the cart
//   clears immediately so staff can start the next order without waiting for anything.
//
// Tab 2 — Open: live list of all active orders for the selected table (any part still PENDING,
//   IN_PROGRESS, or DONE). Updates arrive via the table:{tableId} socket room. Each order card
//   shows the item list, part status chips, and a "Delivered" button when a part is DONE.
//
// Table selector sits above both tabs and drives both: the cart's tableId and the Open tab's
// filter are the same value. In staff mode it's an unlocked dropdown defaulting to the Bar
// table. In QR mode the table is resolved from the URL token and locked.
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
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
import type { Table, Order } from '@coffee/shared'
import { BAR_TABLE_ID } from '@coffee/shared'
import { useOrderStore } from '../../stores/orderStore.js'
import { getSocket } from '../../hooks/useSocket.js'

interface Props {
  tableFromToken: Table | null
  isTokenMode: boolean
}

export default function CartPanel({ tableFromToken, isTokenMode }: Props) {
  const { tableId, setTableId } = useOrderStore()
  // Bar is hardcoded as the first entry so the Select always has a valid option on first render,
  // before the async table fetch completes. API results are filtered to avoid a duplicate Bar row.
  const [tables, setTables] = useState<Table[]>([{ id: BAR_TABLE_ID, number: 0, label: 'Bar' }])
  const [tab, setTab] = useState(0)
  const [openOrders, setOpenOrders] = useState<Order[]>([])

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Table selector — above tabs, visible in both modes */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        {isTokenMode && tableFromToken ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1.2rem' }}>
            Table {tableFromToken.number}{tableFromToken.label ? ` — ${tableFromToken.label}` : ''}
          </Typography>
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '1.2rem' }}>Table</InputLabel>
            <Select
              value={tableId}
              label="Table"
              onChange={(e) => setTableId(e.target.value as string)}
              sx={{ fontSize: '1.2rem' }}
            >
              {tables.map((t) => (
                <MuiMenuItem key={t.id} value={t.id} sx={{ fontSize: '1.2rem' }}>
                  {t.id === BAR_TABLE_ID ? 'Bar' : `Table ${t.number}${t.label ? ` — ${t.label}` : ''}`}
                </MuiMenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ flexShrink: 0, px: 1 }}>
        <Tab label="Order" sx={{ fontSize: '1.2rem' }} />
        <Tab
          sx={{ fontSize: '1.2rem' }}
          label={
            <Badge badgeContent={pendingCount} color="primary" max={99}>
              <Box sx={{ pr: pendingCount > 0 ? 1.5 : 0 }}>Open</Box>
            </Badge>
          }
        />
      </Tabs>
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
  const {
    cart, tableId, orderNotes, orderNumber, submitting, submitError,
    setOrderNotes, setOrderNumber, setQuantity, setItemNotes, removeItem, submit,
  } = useOrderStore()

  const [numberLoading, setNumberLoading] = useState(true)
  const isBar = tableId === BAR_TABLE_ID

  // Pre-fill the order number field with the next auto number (bar orders only)
  useEffect(() => {
    if (!isBar) { setNumberLoading(false); return }
    fetch('/api/v1/orders/next-number')
      .then((r) => r.json())
      .then((json: { data?: { number: number } }) => {
        if (json.data) setOrderNumber(String(json.data.number))
      })
      .catch(() => {})
      .finally(() => setNumberLoading(false))
  }, [isBar]) // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = cart.length === 0
  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0)

  const trimmed = orderNumber.trim()
  const parsedNumber = trimmed !== '' ? parseInt(trimmed, 10) : undefined
  const numberError = parsedNumber !== undefined && (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 999)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1, flexShrink: 0 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: '1.5rem' }}>Your Order</Typography>
        {totalItems > 0 && (
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.4rem' }}>
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      {isEmpty ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.disabled" sx={{ fontSize: '1.4rem' }}>Add items from the menu</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto', mb: 1 }}>
          <List disablePadding>
            {cart.map((l) => (
              <ListItem
                key={l.lineId}
                disableGutters
                sx={{ flexDirection: 'column', alignItems: 'stretch', pb: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ flex: 1, fontSize: '1.7rem' }}>{l.menuItem.name}</Typography>
                  <Button
                    variant="outlined" size="small"
                    onClick={() => setQuantity(l.lineId, l.quantity - 1)}
                    sx={{ minWidth: 48, minHeight: 48, px: 0, fontSize: '1.4rem' }}
                  >−</Button>
                  <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 'bold', fontSize: '1.4rem' }}>
                    {l.quantity}
                  </Typography>
                  <Button
                    variant="outlined" size="small"
                    onClick={() => setQuantity(l.lineId, l.quantity + 1)}
                    sx={{ minWidth: 48, minHeight: 48, px: 0, fontSize: '1.4rem' }}
                  >+</Button>
                  <Button
                    size="small" color="error"
                    onClick={() => removeItem(l.lineId)}
                    sx={{ minHeight: 48, px: 1, fontSize: '1.2rem' }}
                  >Remove</Button>
                </Box>
                <TextField
                  size="small"
                  placeholder="Notes (e.g. oat milk, no sugar)"
                  value={l.notes}
                  onChange={(e) => setItemNotes(l.lineId, e.target.value)}
                  inputProps={{ maxLength: 200, style: { fontSize: '1.2rem' } }}
                  sx={{ mt: 0.5 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Divider sx={{ my: 1, flexShrink: 0 }} />

      <TextField
        size="small"
        label="Order notes"
        placeholder="Anything else we should know?"
        multiline
        rows={2}
        value={orderNotes}
        onChange={(e) => setOrderNotes(e.target.value)}
        inputProps={{ maxLength: 500, style: { fontSize: '1.2rem' } }}
        InputLabelProps={{ style: { fontSize: '1.2rem' } }}
        sx={{ mb: 1.5, flexShrink: 0 }}
      />

      {/* Order number — bar orders only */}
      {isBar && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'nowrap', fontSize: '1.4rem' }}>Order number</Typography>
          <TextField
            size="small"
            type="number"
            placeholder={numberLoading ? 'Loading…' : 'Enter number'}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            error={numberError}
            helperText={numberError ? '1 – 999' : undefined}
            disabled={numberLoading}
            inputProps={{ min: 1, max: 999, step: 1, style: { fontSize: '1.2rem' } }}
            sx={{ width: 120 }}
          />
        </Box>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0, fontSize: '1.2rem' }}>{submitError}</Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={isEmpty || submitting || numberError}
        onClick={() => { void submit() }}
        sx={{ minHeight: 56, flexShrink: 0, fontSize: '1.3rem' }}
      >
        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
      </Button>
    </Box>
  )
}

// ─── Open orders view ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Waiting',
  IN_PROGRESS: 'Preparing…',
  DONE: 'Ready!',
  PICKED_UP: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  PICKED_UP: 'default',
  CANCELLED: 'error',
}

function OpenOrdersView({ orders }: { orders: Order[] }) {
  const socket = getSocket()

  const deliver = (orderId: string, part: 'coffee' | 'other') => {
    socket.emit('order:part:picked_up', { orderId, part })
  }

  if (orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.disabled" sx={{ fontSize: '1.4rem' }}>No open orders</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ overflowY: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      {orders.map((order) => (
        <Card key={order.id} variant="outlined">
          <CardContent sx={{ pb: '12px !important' }}>
            {/* Header: order number (bar only) or just order indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '1.5rem' }}>
                #{order.number}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>

            {/* Items list */}
            <Box sx={{ mb: 1.5 }}>
              {order.items.map((item) => (
                <Typography key={item.id} variant="body2" color="text.secondary" sx={{ fontSize: '1.2rem' }}>
                  {item.quantity}× {item.menuItem.name}
                  {item.notes ? ` — ${item.notes}` : ''}
                </Typography>
              ))}
              {order.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '1.2rem' }}>
                  Note: {order.notes}
                </Typography>
              )}
            </Box>

            {/* Part statuses + deliver buttons.
                Button is always visible for active parts (not yet PICKED_UP/CANCELLED) so
                staff can see it's coming — it's just disabled until the barista marks DONE. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {order.coffeeStatus && order.coffeeStatus !== 'PICKED_UP' && order.coffeeStatus !== 'CANCELLED' && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '1.2rem' }}>☕ Coffee</Typography>
                    <Chip
                      label={STATUS_LABEL[order.coffeeStatus] ?? order.coffeeStatus}
                      color={STATUS_COLOR[order.coffeeStatus] ?? 'default'}
                      size="small"
                      sx={{ fontSize: '1.0rem' }}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={order.coffeeStatus !== 'DONE'}
                    onClick={() => deliver(order.id, 'coffee')}
                    sx={{ fontSize: '1.1rem' }}
                  >
                    Deliver
                  </Button>
                </Box>
              )}
              {order.otherStatus && order.otherStatus !== 'PICKED_UP' && order.otherStatus !== 'CANCELLED' && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '1.2rem' }}>🛍 Other</Typography>
                    <Chip
                      label={STATUS_LABEL[order.otherStatus] ?? order.otherStatus}
                      color={STATUS_COLOR[order.otherStatus] ?? 'default'}
                      size="small"
                      sx={{ fontSize: '1.0rem' }}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={order.otherStatus !== 'DONE'}
                    onClick={() => deliver(order.id, 'other')}
                    sx={{ fontSize: '1.1rem' }}
                  >
                    Deliver
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
