// Orders REST API — POST /api/v1/orders (place order) and GET /api/v1/orders/:id (poll status).
// Also exposes GET /api/v1/orders/next-number as a read-only preview of the next auto-number.
//
// After a successful POST, order:placed is emitted to two rooms:
//   kitchen — so barista screens receive the order immediately.
//   order:{id} — so the placing client's status view updates without polling.
//
// The router is created via a factory so it can hold a reference to the io instance
// without making io a module-level singleton (which would complicate testing later).
import { Router } from 'express'
import { z } from 'zod'
import type { Server as IoServer } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@coffee/shared'
import * as orderService from '../services/order.service.js'

const PlaceOrderSchema = z.object({
  tableId: z.string().cuid().optional(),
  // number overrides the daily counter — used when switching paper blocks mid-shift.
  number: z.number().int().min(1).max(999).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().cuid(),
        quantity: z.number().int().min(1).max(20),
        notes: z.string().max(200).optional(),
      })
    )
    .min(1),
  notes: z.string().max(500).optional(),
})

export function createOrdersRouter(io: IoServer<ClientToServerEvents, ServerToClientEvents>) {
  const router = Router()

  router.post('/', async (req, res) => {
    const result = PlaceOrderSchema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'Invalid body', code: 'VALIDATION_ERROR' })
      return
    }
    try {
      const order = await orderService.placeOrder(result.data)
      io.to('kitchen').emit('order:placed', order)
      io.to(`order:${order.id}`).emit('order:placed', order)
      res.status(201).json({ data: order })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Distinguish client errors (unavailable item, bad table) from server faults.
      // 422 tells the client the request was understood but rejected due to business rules;
      // 500 means something unexpected went wrong on our end.
      const isInputError = message.includes('unavailable') || message.includes('Table not found')
      res
        .status(isInputError ? 422 : 500)
        .json({ error: message, code: isInputError ? 'INVALID_INPUT' : 'DB_ERROR' })
    }
  })

  // Must be before /:id so Express doesn't swallow "next-number" as an order ID.
  router.get('/next-number', async (_req, res) => {
    try {
      const number = await orderService.peekNextNumber()
      res.json({ data: { number } })
    } catch {
      res.status(500).json({ error: 'Internal error', code: 'DB_ERROR' })
    }
  })

  router.get('/:id', async (req, res) => {
    try {
      const order = await orderService.getOrder(req.params.id)
      if (!order) {
        res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' })
        return
      }
      res.json({ data: order })
    } catch {
      res.status(500).json({ error: 'Internal error', code: 'DB_ERROR' })
    }
  })

  return router
}
