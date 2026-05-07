import { useState, useEffect } from 'react'
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
import type { Table, Order } from '@coffee/shared'
import { useOrderStore } from '../../stores/orderStore.js'

interface Props {
  /** Resolved table when in QR/token mode; null otherwise. */
  tableFromToken: Table | null
  /** When true, the QR param was present — hide the table picker. */
  isTokenMode: boolean
}

// Switches between two states based on whether an order has been placed:
//   CartView — staff build the order and submit it.
//   OrderStatusView — displays the order number and live part statuses after submission.
// The switch is driven by placedOrder in the store; reset() returns to CartView.
export default function CartPanel({ tableFromToken, isTokenMode }: Props) {
  const { placedOrder } = useOrderStore()
  return placedOrder
    ? <OrderStatusView order={placedOrder} />
    : <CartView tableFromToken={tableFromToken} isTokenMode={isTokenMode} />
}

// ─── Cart view ────────────────────────────────────────────────────────────────

// Renders the editable cart and the Place Order button. On mount it fires two fetches:
//   1. Table list (kiosk mode only) — populates the optional table picker.
//   2. Next order number preview — pre-fills the number field so staff can verify the
//      sequence before submitting. If the fetch fails the field is left empty for manual entry.
// Each cart line is independently editable: quantity controls, a notes field, and a remove
// button. The same menu item can appear on multiple lines with different notes.
function CartView({ tableFromToken, isTokenMode }: Props) {
  const {
    cart, tableId, orderNotes, orderNumber, submitting, submitError,
    setTableId, setOrderNotes, setOrderNumber, setQuantity, setItemNotes, removeItem, submit,
  } = useOrderStore()

  const [tables, setTables] = useState<Table[]>([])
  const [numberLoading, setNumberLoading] = useState(true)

  // Kiosk mode: fetch table list to populate the picker
  useEffect(() => {
    if (isTokenMode) return
    fetch('/api/v1/tables')
      .then((r) => r.json())
      .then((json: { data?: Table[] }) => { if (json.data) setTables(json.data) })
      .catch(() => { /* non-critical, picker just won't show */ })
  }, [isTokenMode])

  // Pre-fill the order number field with the next auto number so staff can see and verify it.
  useEffect(() => {
    fetch('/api/v1/orders/next-number')
      .then((r) => r.json())
      .then((json: { data?: { number: number } }) => {
        if (json.data) setOrderNumber(String(json.data.number))
      })
      .catch(() => { /* field stays empty; staff can type manually */ })
      .finally(() => setNumberLoading(false))
  }, [])

  const isEmpty = cart.length === 0
  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0)

  const trimmed = orderNumber.trim()
  const parsedNumber = trimmed !== '' ? parseInt(trimmed, 10) : undefined
  const numberError = parsedNumber !== undefined && (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 999)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1, flexShrink: 0 }}>
        <Typography variant="h5" fontWeight="bold">Your Order</Typography>
        {totalItems > 0 && (
          <Typography variant="body1" color="text.secondary">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      {isTokenMode && tableFromToken && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1, flexShrink: 0 }}>
          Table {tableFromToken.number}{tableFromToken.label ? ` — ${tableFromToken.label}` : ''}
        </Typography>
      )}

      {/* Cart items or empty state */}
      {isEmpty ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.disabled">Add items from the menu</Typography>
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
                  <Typography variant="h6" sx={{ flex: 1 }}>
                    {l.menuItem.name}
                  </Typography>
                  {/* Quantity controls — 48px touch targets */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setQuantity(l.lineId, l.quantity - 1)}
                    sx={{ minWidth: 48, minHeight: 48, px: 0 }}
                  >
                    −
                  </Button>
                  <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 'bold' }}>
                    {l.quantity}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setQuantity(l.lineId, l.quantity + 1)}
                    sx={{ minWidth: 48, minHeight: 48, px: 0 }}
                  >
                    +
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeItem(l.lineId)}
                    sx={{ minHeight: 48, px: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
                <TextField
                  size="small"
                  placeholder="Notes (e.g. oat milk, no sugar)"
                  value={l.notes}
                  onChange={(e) => setItemNotes(l.lineId, e.target.value)}
                  inputProps={{ maxLength: 200 }}
                  sx={{ mt: 0.5 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Divider sx={{ my: 1, flexShrink: 0 }} />

      {/* Table picker — kiosk mode only, shown when tables are available */}
      {!isTokenMode && tables.length > 0 && (
        <FormControl fullWidth size="small" sx={{ mb: 1.5, flexShrink: 0 }}>
          <InputLabel>Table (optional)</InputLabel>
          <Select
            value={tableId ?? ''}
            label="Table (optional)"
            onChange={(e) => setTableId((e.target.value as string) || null)}
          >
            <MuiMenuItem value=""><em>No table</em></MuiMenuItem>
            {tables.map((t) => (
              <MuiMenuItem key={t.id} value={t.id}>
                Table {t.number}{t.label ? ` — ${t.label}` : ''}
              </MuiMenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        size="small"
        label="Order notes"
        placeholder="Anything else we should know?"
        multiline
        rows={2}
        value={orderNotes}
        onChange={(e) => setOrderNotes(e.target.value)}
        inputProps={{ maxLength: 500 }}
        sx={{ mb: 1.5, flexShrink: 0 }}
      />

      {/* Order number — always shown so staff can verify before placing */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
          Order number
        </Typography>
        <TextField
          size="small"
          type="number"
          placeholder={numberLoading ? 'Loading…' : 'Enter number'}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          error={numberError}
          helperText={numberError ? '1 – 999' : undefined}
          disabled={numberLoading}
          inputProps={{ min: 1, max: 999, step: 1 }}
          sx={{ width: 120 }}
        />
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>{submitError}</Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={isEmpty || submitting || numberError}
        onClick={() => { void submit() }}
        sx={{ minHeight: 56, flexShrink: 0 }}
      >
        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
      </Button>
    </Box>
  )
}

// ─── Order status view ────────────────────────────────────────────────────────

// Displays the order number prominently and the live status of each part (coffee / other).
// Parts that were null at creation time (order had no coffee / no other items) are omitted.
// "New order" only appears once all non-null parts have reached a terminal state
// (PICKED_UP or CANCELLED) — it would be confusing to clear the screen while the barista
// is still working on an in-progress part.
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Waiting',
  IN_PROGRESS: 'Being prepared…',
  DONE: 'Ready for pickup!',
  PICKED_UP: 'Collected ✓',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  PICKED_UP: 'default',
  CANCELLED: 'error',
}

function OrderStatusView({ order }: { order: Order }) {
  const { reset } = useOrderStore()

  const allSettled =
    (order.coffeeStatus == null || order.coffeeStatus === 'PICKED_UP' || order.coffeeStatus === 'CANCELLED') &&
    (order.otherStatus == null || order.otherStatus === 'PICKED_UP' || order.otherStatus === 'CANCELLED')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 3,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        textAlign: 'center',
      }}
    >
      <Box>
        <Typography variant="h6" color="text.secondary" display="block">
          Order number
        </Typography>
        <Typography variant="h1" fontWeight="bold" lineHeight={1}>
          {order.number}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 280 }}>
        {order.coffeeStatus && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">☕ Coffee</Typography>
            <Chip
              label={STATUS_LABEL[order.coffeeStatus] ?? order.coffeeStatus}
              color={STATUS_COLOR[order.coffeeStatus] ?? 'default'}
              size="medium"
              sx={{ fontSize: '1rem' }}
            />
          </Box>
        )}
        {order.otherStatus && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">🛍 Other items</Typography>
            <Chip
              label={STATUS_LABEL[order.otherStatus] ?? order.otherStatus}
              color={STATUS_COLOR[order.otherStatus] ?? 'default'}
              size="medium"
              sx={{ fontSize: '1rem' }}
            />
          </Box>
        )}
      </Box>

      {allSettled && (
        <Button variant="outlined" size="large" onClick={reset} sx={{ minHeight: 48 }}>
          New order
        </Button>
      )}
    </Box>
  )
}
