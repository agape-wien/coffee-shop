import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// Returns all tables for the kiosk table picker. No auth required — table numbers are not sensitive.
router.get('/', async (_req, res) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      select: { id: true, number: true, label: true },
    })
    res.json({ data: tables })
  } catch {
    res.status(500).json({ error: 'Internal server error', code: 'DB_ERROR' })
  }
})

// Resolves a QR token to table info for the ordering screen.
// Returns 404 if the token has been rotated or never existed.
router.get('/:token', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { qrToken: req.params.token },
      select: { id: true, number: true, label: true },
    })
    if (!table) {
      res.status(404).json({ error: 'Table not found', code: 'NOT_FOUND' })
      return
    }
    res.json({ data: table })
  } catch {
    res.status(500).json({ error: 'Internal server error', code: 'DB_ERROR' })
  }
})

export default router
