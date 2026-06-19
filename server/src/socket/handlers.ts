// Socket.io event handlers for order state transitions.
// Each handler validates its payload with Zod, delegates to the order service,
// and broadcasts the updated order to all relevant rooms. Invalid payloads and
// failed transitions (e.g. wrong precondition) are silently dropped — the
// clients are always the source of user intent, not acknowledgement listeners.
import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, Order } from '@coffee/shared'
import { z } from 'zod'
import * as orderService from '../services/order.service.js'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>

const OrderPartSchema = z.object({
  orderId: z.string().cuid(),
  part: z.enum(['coffee', 'other']),
})

const OrderCancelSchema = z.object({
  orderId: z.string().cuid(),
})

async function emitSnapshots(io: IoServer, tableId: string, orderId: string, order: Order): Promise<void> {
  const [kitchenSnap, tableSnap] = await Promise.all([
    orderService.getKitchenSnapshot(),
    orderService.getTableSnapshot(tableId),
  ])
  io.to('kitchen').to('display').emit('kitchen:snapshot', kitchenSnap)
  io.to(`table:${tableId}`).emit('table:snapshot', tableSnap)
  io.to(`order:${orderId}`).emit('order:updated', order)
}

export function registerOrderHandlers(io: IoServer, socket: IoSocket): void {
  socket.on('order:part:start', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.startPart(r.data.orderId, r.data.part)
    if (!order) return
    await emitSnapshots(io, order.tableId, order.id, order)
  })

  socket.on('order:part:done', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.donePart(r.data.orderId, r.data.part)
    if (!order) return
    await emitSnapshots(io, order.tableId, order.id, order)
  })

  socket.on('order:part:picked_up', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.pickedUpPart(r.data.orderId, r.data.part)
    if (!order) return
    await emitSnapshots(io, order.tableId, order.id, order)
  })

  socket.on('order:cancel', async (payload) => {
    const r = OrderCancelSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.cancelOrder(r.data.orderId)
    if (!order) return
    await emitSnapshots(io, order.tableId, order.id, order)
  })
}
