import type { Order, MenuSnapshot, OrderPart } from './types.js'

// Typed event maps for Socket.io.
// Import on both client and server to get end-to-end type safety on all event names and payloads.

export interface ServerToClientEvents {
  'order:placed': (order: Order) => void
  'order:updated': (order: Order) => void
  // Emitted to the display room when an order should be removed from the pickup screen entirely —
  // fired when all DONE parts are PICKED_UP, or when the order is CANCELLED.
  'order:removed': (payload: { orderId: string }) => void
  'menu:updated': (menu: MenuSnapshot) => void
}

export interface ClientToServerEvents {
  'view:join': (payload: { room: string }) => void
  'order:part:start': (payload: { orderId: string; part: OrderPart }) => void
  'order:part:done': (payload: { orderId: string; part: OrderPart }) => void
  'order:part:picked_up': (payload: { orderId: string; part: OrderPart }) => void
  'order:cancel': (payload: { orderId: string }) => void
}
