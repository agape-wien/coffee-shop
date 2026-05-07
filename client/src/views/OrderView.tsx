import { useEffect } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useMenuStore, retryMenu } from '../stores/menuStore.js'
import { useOrderStore } from '../stores/orderStore.js'
import { useTable } from '../hooks/useTable.js'
import { getSocket } from '../hooks/useSocket.js'
import MenuPanel from './order/MenuPanel.js'
import CartPanel from './order/CartPanel.js'

export default function OrderView() {
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const { snapshot, loading: menuLoading, error: menuError, fetch: fetchMenu } = useMenuStore()
  const { placedOrder, updatePlacedOrder, setTableId } = useOrderStore()
  const { table, loading: tableLoading, error: tableError, isTokenMode } = useTable()

  // Fetch menu once on mount
  useEffect(() => { void fetchMenu() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Token mode: sync resolved table into the order store
  useEffect(() => {
    if (table) setTableId(table.id)
  }, [table?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // After order is placed: join the order socket room and subscribe to status updates.
  // The cleanup removes the listener when the order changes (e.g. after reset).
  useEffect(() => {
    if (!placedOrder) return
    const socket = getSocket()
    socket.emit('view:join', { room: `order:${placedOrder.id}` })
    socket.on('order:updated', updatePlacedOrder)
    return () => { socket.off('order:updated', updatePlacedOrder) }
  }, [placedOrder?.id, updatePlacedOrder])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (menuLoading || tableLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Table token was present but invalid — block ordering rather than silently ignore
  if (tableError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2, p: 4 }}>
        <Typography variant="h6" color="error">{tableError}</Typography>
        <Typography color="text.secondary" textAlign="center">
          The QR code link may have expired. Ask a staff member to rescan your table.
        </Typography>
      </Box>
    )
  }

  // Menu failed — show retry rather than a dead screen
  if (menuError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2, p: 4 }}>
        <Typography variant="h6" color="error">Menu unavailable</Typography>
        <Typography color="text.secondary">{menuError}</Typography>
        <Button variant="contained" onClick={() => void retryMenu()} sx={{ minHeight: 48 }}>
          Try again
        </Button>
      </Box>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Menu panel — left in landscape, top in portrait */}
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {snapshot && <MenuPanel />}
      </Box>

      {/* Cart / order status panel — right in landscape, bottom in portrait */}
      <Box
        sx={{
          flexShrink: 0,
          width: isLandscape ? 360 : '100%',
          height: isLandscape ? '100%' : '45%',
          overflow: 'hidden',
          borderLeft: isLandscape ? 1 : 0,
          borderTop: isLandscape ? 0 : 1,
          borderColor: 'divider',
        }}
      >
        <CartPanel tableFromToken={table} isTokenMode={isTokenMode} />
      </Box>
    </Box>
  )
}
