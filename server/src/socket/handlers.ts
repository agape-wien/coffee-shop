import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@coffee/shared'
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

export function registerOrderHandlers(io: IoServer, socket: IoSocket): void {
  socket.on('order:part:start', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.startPart(r.data.orderId, r.data.part)
    if (!order) return
    io.to('kitchen').emit('order:updated', order)
    io.to(`table:${order.tableId}`).emit('order:updated', order)
    io.to(`order:${order.id}`).emit('order:updated', order)
  })

  socket.on('order:part:done', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.donePart(r.data.orderId, r.data.part)
    if (!order) return
    io.to('kitchen').emit('order:updated', order)
    io.to('display').emit('order:updated', order)
    io.to(`table:${order.tableId}`).emit('order:updated', order)
    io.to(`order:${order.id}`).emit('order:updated', order)
  })

  socket.on('order:part:picked_up', async (payload) => {
    const r = OrderPartSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.pickedUpPart(r.data.orderId, r.data.part)
    if (!order) return
    io.to('kitchen').emit('order:updated', order)
    io.to(`table:${order.tableId}`).emit('order:updated', order)
    io.to(`order:${order.id}`).emit('order:updated', order)
    if (order.coffeeStatus !== 'DONE' && order.otherStatus !== 'DONE') {
      io.to('display').emit('order:removed', { orderId: order.id })
    } else {
      io.to('display').emit('order:updated', order)
    }
  })

  socket.on('order:cancel', async (payload) => {
    const r = OrderCancelSchema.safeParse(payload)
    if (!r.success) return
    const order = await orderService.cancelOrder(r.data.orderId)
    if (!order) return
    io.to('kitchen').emit('order:updated', order)
    io.to(`table:${order.tableId}`).emit('order:updated', order)
    io.to(`order:${order.id}`).emit('order:updated', order)
    io.to('display').emit('order:removed', { orderId: order.id })
  })
}
