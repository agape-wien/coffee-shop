import type { Order, MenuSnapshot, OrderPart } from './types.js'

// Typed event maps for Socket.io.
// Import on both client and server to get end-to-end type safety on all event names and payloads.

export interface ServerToClientEvents {
  // Emitted to kitchen + display rooms after any order state change.
  // Contains all orders with at least one active part (PENDING, IN_PROGRESS, or DONE).
  // Each view filters for what it needs: barista takes coffee PENDING/IN_PROGRESS,
  // counter takes other PENDING/IN_PROGRESS + any DONE, pickup takes any DONE.
  'kitchen:snapshot': (orders: Order[]) => void
  // Emitted to table:{id} room after any change affecting that table's orders.
  // Contains all open orders for that table (at least one part PENDING/IN_PROGRESS/DONE).
  'table:snapshot': (orders: Order[]) => void
  // Still emitted to order:{id} room for individual order subscribers.
  'order:updated': (order: Order) => void
  'menu:updated': (menu: MenuSnapshot) => void
}

export interface ClientToServerEvents {
  'view:join': (payload: { room: string }) => void
  'view:leave': (payload: { room: string }) => void
  'order:part:start': (payload: { orderId: string; part: OrderPart }) => void
  'order:part:done': (payload: { orderId: string; part: OrderPart }) => void
  'order:part:picked_up': (payload: { orderId: string; part: OrderPart }) => void
  'order:cancel': (payload: { orderId: string }) => void
}
