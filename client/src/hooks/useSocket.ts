import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@coffee/shared'

// Module-level singleton: all views share one socket connection to the same origin.
// Socket.io-client handles reconnection automatically.
let _socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!_socket) {
    _socket = io({ autoConnect: true })
  }
  return _socket
}
