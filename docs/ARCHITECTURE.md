# Architecture

## Communication model

```
Customer / Kiosk      Barista view (/barista)   Counter view (/counter)   Pickup display (/pickup)
     │                      │                          │                        │
     │  REST POST /orders    │                          │                        │
     ├──────────────────────►│  (server receives)       │                        │
     │                      │                          │                        │
     │◄─ order:placed ───────┤──── order:placed ────────┤                        │
     │   (order:{id} room)   │    (kitchen room)        │    (kitchen room)      │
     │                      │                          │                        │
     │                      │  order:part:start {coffee}                        │
     │                      │◄── prep person taps PENDING card                  │
     │                      │  (PENDING → IN_PROGRESS on left panel)            │
     │                      │                          │                        │
     │                      │  order:part:done {coffee}                         │
     │                      │◄── barista taps IN_PROGRESS card                  │
     │                      │  (IN_PROGRESS → DONE; card appears on display)    │
     │                      │                          │                        │
     │                      │           order:part:start/done {other}           │
     │                      │           ◄── counter taps other items             │
     │                      │                          │                        │
     │                      │                 order:part:picked_up              │
     │                      │                 ◄── counter taps DONE card        │
     │                      │                          │                        │
     │◄─ order:updated ──────┤─────── order:updated ───┤──── order:updated ─────┤
     │   (order:{id} room)   │       (kitchen room)     │   (kitchen room)       │  (display room)
```

Management screens use **REST only** — no Socket.io needed for CRUD. However, the server broadcasts `menu:updated` on the `management` socket room after any menu change so ordering screens can refresh without polling.

---

## Database schema (Prisma)

Source of truth: `server/prisma/schema.prisma`

### Design decisions baked into the schema

- **No price field (v1)** — the shop isn't charging for orders yet. Price will be added as a `Decimal` on `MenuItem` when payment is in scope.
- **`ee` / `me` on MenuItem** — espresso-equivalent portions and milk-equivalent ml per serving. Used for supply tracking and reporting, not pricing.
- **`type` on MenuItem is intentionally redundant** — it duplicates the category grouping but enables efficient single-index queries for "all coffee items across today's orders" without a join to `Category`.
- **Events removed** — `createdAt` on `Order` is sufficient for date-based grouping and reporting.
- **`tableId` NOT NULL** — every order belongs to a table. Bar orders use the well-known Bar table (`id = 'bar'`). A `null` `tableId` is a data integrity bug, never a valid state. There is no separate kiosk concept — staff use the same ordering view and select the Bar table by default.
- **PICKED_UP is per-part, not per-order** — a `coffeeStatus: PICKED_UP` order stays on the display if `otherStatus` is still `DONE`. Live queries filter on individual part statuses, not an order-level flag.

### Core tables

```prisma
model Category {
  id        String     @id @default(cuid())
  name      String
  sortOrder Int        @default(0)
  items     MenuItem[]
}

model MenuItem {
  id          String      @id @default(cuid())
  name        String
  description String?
  imageUrl    String?
  available   Boolean     @default(true)
  sortOrder   Int         @default(0)
  type        ItemType                    // COFFEE | OTHER
  ee          Float       @default(0)    // espresso-equivalent portions
  me          Float       @default(0)    // milk-equivalent ml
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
}

enum ItemType {
  COFFEE
  OTHER
}

model Table {
  id      String  @id @default(cuid())  // 'bar' for the Bar table; CUID for all others
  number  Int     @unique
  label   String?
  qrToken String  @unique  // rotatable token embedded in QR URL; 'bar' for the Bar table (no QR)
  orders  Order[]
}

// Tracks the running order number per calendar date (YYYY-MM-DD).
// Numbers run 1–999 and reset on a new date.
model DailyCounter {
  date    String @id
  counter Int    @default(0)
}

model Order {
  id           String      @id @default(cuid())
  number       Int         // human-readable 1–999, daily reset
  tableId      String      // NOT NULL — 'bar' for bar orders, table CUID for table orders
  table        Table       @relation(fields: [tableId], references: [id])
  // One status field per item type. Null when the order contains no items of that type.
  // There is no order-level status — everything is expressed through these two fields.
  coffeeStatus PartStatus? @default(PENDING)
  otherStatus  PartStatus? @default(PENDING)
  notes        String?
  items        OrderItem[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model OrderItem {
  id         String    @id @default(cuid())
  orderId    String
  order      Order     @relation(fields: [orderId], references: [id])
  menuItemId String
  menuItem   MenuItem  @relation(fields: [menuItemId], references: [id])
  quantity   Int       @default(1)
  notes      String?   // free-text modifiers for v1
  // No status field — status is tracked at the part level on Order, not per item.
}

// Lifecycle of one part (coffee or other) of an order.
// Cancelling an order sets all non-null parts to CANCELLED in one operation.
// A part moves off the pickup display once it reaches PICKED_UP.
enum PartStatus {
  PENDING      // submitted, not yet started
  IN_PROGRESS  // barista is working on this part
  DONE         // ready for pickup — appears on pickup display
  PICKED_UP    // collected — removed from pickup display
  CANCELLED
}
```

---

## Socket.io events

### Rooms
| Room | Subscribers |
|------|-------------|
| `kitchen` | Barista view (`/barista`), Counter view (`/counter`) |
| `display` | Pickup display (`/pickup`), Counter view (`/counter`) |
| `table:{tableId}` | Ordering view (`/order`) — Open tab for that table. `table:bar` for bar orders. |
| `order:{id}` | Reserved for future per-order subscribers (e.g. customer-facing status) |
| `management` | Management screens |

Note: Counter view joins both `kitchen` (to receive incoming orders and track other-part status) and `display` (to see and manage the pickup display panel).

Note: The ordering view joins `table:{tableId}` to receive all order events for the selected table in real time, avoiding per-order room subscriptions.

### Events: Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `order:part:start` | `{ orderId, part }` | Barista starts a part (`coffee` or `other`) |
| `order:part:done` | `{ orderId, part }` | Barista marks a part complete |
| `order:part:picked_up` | `{ orderId, part }` | One part collected — removed from display |
| `order:cancel` | `{ orderId }` | Cancel order — sets all non-null parts to CANCELLED |
| `view:join` | `{ room }` | Client joins a socket room on connect |

### Events: Server → Client
| Event | Payload | Rooms |
|-------|---------|-------|
| `order:placed` | `Order` (full) | `kitchen`, `table:{tableId}`, `order:{id}` |
| `order:updated` | `Order` (full) | `kitchen`, `table:{tableId}`, `display` (on done/picked_up), `order:{id}` |
| `order:removed` | `{ orderId }` | `display` |
| `menu:updated` | `MenuSnapshot` | `management` |

**Rule:** Server always re-emits the full object, not a diff. Simpler client logic, acceptable payload size for a coffee shop.

---

## REST API endpoints

### Public (no auth)
```
POST   /api/v1/orders                        Place an order (tableId required)
GET    /api/v1/orders/open?tableId={id}      Open orders for a table (any part still active)
GET    /api/v1/orders/next-number            Preview next auto-assigned order number (bar only)
GET    /api/v1/orders/:id                    Poll order status (fallback, primary is Socket)
GET    /api/v1/menu                          Full menu snapshot for ordering screen
GET    /api/v1/tables                        All tables for the staff table picker
GET    /api/v1/tables/:token                 Resolve QR token → table info
```

### Protected (Bearer JWT)
```
# Menu management
GET    /api/v1/management/categories
POST   /api/v1/management/categories
PUT    /api/v1/management/categories/:id
DELETE /api/v1/management/categories/:id

GET    /api/v1/management/items
POST   /api/v1/management/items
PUT    /api/v1/management/items/:id
DELETE /api/v1/management/items/:id
PATCH  /api/v1/management/items/:id/availability   { available: boolean }

# Tables & QR
GET    /api/v1/management/tables
POST   /api/v1/management/tables
DELETE /api/v1/management/tables/:id
POST   /api/v1/management/tables/:id/rotate-qr     Generate new QR token

# Orders (read-only for management)
GET    /api/v1/management/orders                   Filter by status, date
GET    /api/v1/management/orders/:id

# Auth
POST   /api/v1/auth/login          { password } → { token }
```

---

## Order number strategy

Daily counter reset (1–999), stored in the `DailyCounter` table keyed on `YYYY-MM-DD`. Readable and speakable: "Your order is **42**". Wraps to 1 after 999 or on a new date. UUID as `id` handles uniqueness; the number is display-only.

---

## Module system

All code uses **ESM** (`import` / `export`). Every `package.json` has `"type": "module"`. Local TypeScript imports use the `.js` extension — TypeScript resolves `.js` → `.ts`; tsx and Node.js need the `.js` at runtime. Node built-ins are imported with the `node:` prefix.

---

## QR code flow

1. Management creates a table, server generates a unique `qrToken` (UUID).
2. Management page renders `GET /api/v1/management/tables/:id/qr` as a downloadable PNG (use `qrcode` npm package server-side).
3. QR encodes: `https://{APP_URL}/order?table={qrToken}`
4. Client resolves token → table ID before displaying the ordering UI.

---

## Frontend state management

Use **Zustand** stores per domain:
- `useOrderStore` — current order being built, submission state
- `useMenuStore` — cached menu data
- `useSocketStore` — socket connection status, reconnection handling

Avoid putting socket listeners in components directly — use a custom `useSocket` hook that wraps the store updates.

---

## Docker services

```yaml
services:
  db:      postgres:16-alpine
  server:  Node.js backend — serves API + frontend from a single port (3001)
           Dev:  tsx watch + Vite middleware (HMR, same origin)
           Prod: tsx + express.static(client/dist)
```

There is no separate client container. Vite runs as Express middleware in dev (`middlewareMode: true`), so frontend and API share the same origin and port. No CORS needed for the browser client.
