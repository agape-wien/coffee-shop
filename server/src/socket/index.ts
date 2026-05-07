import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import type { ServerToClientEvents, ClientToServerEvents } from '@coffee/shared'
import { registerOrderHandlers } from './handlers.js'

export function initSocket(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' },
  })

  io.on('connection', (socket) => {
    // view:join is the entry point for all named rooms.
    // Kitchen, barista, display, and management screens call this on mount.
    // Customer devices join order:{id} after an order is placed.
    socket.on('view:join', ({ room }) => {
      socket.join(room)
    })
    registerOrderHandlers(io, socket)
  })

  return io
}
