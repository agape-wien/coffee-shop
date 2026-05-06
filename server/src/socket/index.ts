import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' },
  })

  io.on('connection', (socket) => {
    // view:join is the entry point for all named rooms.
    // Kitchen, coordinator, display, and management screens call this on mount.
    // Customer devices join order:{id} after an order is placed.
    socket.on('view:join', ({ room }: { room: string }) => {
      socket.join(room)
    })
  })

  return io
}
