// Customer-facing pickup display — the big screen people watch while waiting for their order.
//
// Shows one badge per DONE part: "42 C" (coffee ready) or "42 O" (other ready).
// Badge letters vary by pickupLanguage (fetched from /api/v1/auth/pickup-language on mount),
// which is configured independently of the general app language in Management → Settings.
// EN: C / O — DE: K (Kaffee) / A (Andere) — RO: C (Cafea) / A (Altele)
//
// Parts are dismissed independently by the counter person from /counter; nothing here
// is interactive. Sorted by order number ascending so customers can scan quickly.
//
// New badges animate in (fade + scale) to draw the eye. Badges for picked-up or cancelled
// parts disappear immediately via order:updated / order:removed socket events.
//
// Joins only the display socket room. The display room receives order:updated when any part
// becomes DONE or transitions out of DONE, and order:removed when no DONE parts remain.
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { Order } from '@coffee/shared'
import { getSocket } from '../hooks/useSocket.js'

const fadeScaleIn = keyframes`
  from { opacity: 0; transform: scale(0.75); }
  to   { opacity: 1; transform: scale(1); }
`

// Badge letter lookup per pickup language. Kept here alongside the view that renders them.
// EN: C/O — DE: K (Kaffee) / A (Andere) — RO: C (Cafea) / A (Altele)
const BADGE_LETTERS: Record<string, { coffee: string; other: string }> = {
  en: { coffee: 'C', other: 'O' },
  de: { coffee: 'K', other: 'A' },
  ro: { coffee: 'C', other: 'A' },
}
const DEFAULT_LETTERS = { coffee: 'C', other: 'O' }
const getLetters = (lang: string): { coffee: string; other: string } => BADGE_LETTERS[lang] ?? DEFAULT_LETTERS

interface DonePart {
  orderId: string
  number: number
  part: 'coffee' | 'other'
}

function extractDoneParts(order: Order): DonePart[] {
  return [
    ...(order.coffeeStatus === 'DONE' ? [{ orderId: order.id, number: order.number, part: 'coffee' as const }] : []),
    ...(order.otherStatus === 'DONE' ? [{ orderId: order.id, number: order.number, part: 'other' as const }] : []),
  ]
}

export default function PickupView() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [pickupLetters, setPickupLetters] = useState(DEFAULT_LETTERS)

  // Fetch pickup-specific language to resolve badge letters. Independent of app language.
  useEffect(() => {
    fetch('/api/v1/auth/pickup-language')
      .then((r) => r.json())
      .then((json: { data?: { pickupLanguage: string } }) => {
        if (json.data?.pickupLanguage) setPickupLetters(getLetters(json.data.pickupLanguage))
      })
      .catch(() => {})
  }, [])

  // Hydrate from REST on mount — covers any DONE parts that existed before the page opened.
  useEffect(() => {
    fetch('/api/v1/orders/display')
      .then((r) => r.json())
      .then((json: { data?: Order[] }) => { if (json.data) setOrders(json.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.emit('view:join', { room: 'display' })

    const handleUpdated = (order: Order) => {
      const hasDone = order.coffeeStatus === 'DONE' || order.otherStatus === 'DONE'
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === order.id)
        if (!hasDone) return exists ? prev.filter((o) => o.id !== order.id) : prev
        return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [...prev, order]
      })
    }

    const handleRemoved = ({ orderId }: { orderId: string }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    }

    socket.on('order:updated', handleUpdated)
    socket.on('order:removed', handleRemoved)
    return () => {
      socket.off('order:updated', handleUpdated)
      socket.off('order:removed', handleRemoved)
    }
  }, [])

  const doneParts = orders
    .flatMap(extractDoneParts)
    .sort((a, b) => a.number - b.number)

  return (
    <Box
      sx={{
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        alignItems: doneParts.length === 0 ? 'center' : 'flex-start',
        justifyContent: doneParts.length === 0 ? 'center' : 'flex-start',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 3,
        p: 3,
      }}
    >
      {doneParts.length === 0 ? (
        <Typography color="text.disabled" sx={{ fontSize: '1.25rem' }}>
          {t('pickup.noOrders')}
        </Typography>
      ) : (
        doneParts.map((badge) => (
          <Box
            key={`${badge.orderId}-${badge.part}`}
            sx={{
              border: 2,
              borderColor: 'divider',
              borderRadius: 2,
              // Width is exactly 1/5 of screen. Formula: 5 cards + 6 equal gaps (left padding,
              // 4 inter-card gaps, right padding). Gap and container padding both use MUI spacing
              // 3 = 24 px so they match. Font scales proportionally via vw units.
              width: 'calc((100vw - 6 * 24px) / 5)',
              aspectRatio: '3 / 2',
              p: 2,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `${fadeScaleIn} 0.35s ease-out`,
              boxSizing: 'border-box',
            }}
          >
            <Typography fontWeight="bold" sx={{ fontSize: '5vw', lineHeight: 1 }}>
              {badge.number} {badge.part === 'coffee' ? pickupLetters.coffee : pickupLetters.other}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  )
}
