# Project Tracker

> This is the first file to read at the start of any session.
> It reflects the current state of the project. Update it whenever tasks are completed or decisions are made.

---

## Current status

**Phase:** Between Phase 1 and Phase 3 — scaffold done, client missing, backend bare-bones  
**Last updated:** 2026-05-06  
**Active work:** Nothing in progress — session closed cleanly.

> **Schema note (revised this session):** Order status is now tracked per-part (`coffeeStatus` / `otherStatus` on `Order`) using a single `PartStatus` enum. `OrderItem` has no status field. See decision log.

---

## Completed

### Planning
- [x] Design principles and vision — `docs/SOUL.md`
- [x] Architecture document (DB schema, Socket.io events, REST API) — `docs/ARCHITECTURE.md`
- [x] 11-phase implementation roadmap — `docs/PLANNING.md`
- [x] Claude reference guide (tech stack, conventions, coding rules) — `CLAUDE.md`
- [x] Project tracker (this file) — `docs/TRACKER.md`

### Phase 1 — Docker + monorepo scaffold (partial)
- [x] Root `package.json` with npm workspaces (`client`, `server`, `packages/shared`)
- [x] `docker-compose.yaml` — single dev file, hot reload via bind mounts, `docker compose up -d`
- [x] `server/Dockerfile.dev` — Node 25.9.0-alpine, OpenSSL fix, prisma generate baked in
- [x] `server/` — Node.js + TypeScript, `tsx watch` hot reload, ESM throughout
- [x] `packages/shared/` — TypeScript types package, exported as `@coffee/shared`
- [x] `.env.example` — all required env vars documented
- [ ] `client/` — Vite + React + TypeScript scaffold (**missing**)
- [ ] Vite proxy config: `/api` and `/socket.io` → server (**missing**)
- [ ] `docker-compose.yml` — production variant (nginx, compiled builds) (**not started**)

### Phase 2 — Database schema + Prisma (partial)
- [x] `server/prisma/schema.prisma` — full schema: Category, MenuItem, Table, Order, OrderItem, DailyCounter
- [x] Prisma client singleton — `server/src/lib/prisma.ts`
- [x] Schema applied to DB via `prisma db push` (runs on container start)
- [ ] `server/prisma/seed.ts` — sample menu, categories, tables (**missing — do this before frontend work**)
- [ ] Proper migration files (`prisma migrate dev`) — deferred until schema stabilises

### Phase 3 — Backend foundation (partial)
- [x] `server/src/index.ts` — HTTP server, Socket.io wired, port binding
- [x] `server/src/app.ts` — Express, CORS, `/api/v1/health`
- [x] `server/src/socket/index.ts` — Socket.io init, `view:join` room handler
- [ ] `server/src/middleware/auth.ts` — JWT verification (**missing**)
- [ ] `POST /api/v1/auth/login` (**missing**)
- [ ] `GET /api/v1/menu` (**missing**)
- [ ] `POST /api/v1/orders` + `order:placed` socket emit (**missing**)
- [ ] Socket handlers: `order:item:start`, `order:item:done`, `order:picked_up` (**missing**)
- [ ] Order status service (`server/src/services/order.service.ts`) (**missing**)
- [ ] Zod schemas for all payloads (**missing**)

### Phase 4 — Shared types (partial)
- [x] `packages/shared/src/types.ts` — all domain types + socket payload shapes
- [ ] `packages/shared/src/events.ts` — typed Socket.io event map (**missing**)

---

## Next up — recommended order for next session

**Priority 1 — finish the scaffold so the full stack runs:**
1. `client/` scaffold — Vite + React + TypeScript (`npm create vite@latest`)
2. Add `client` service to `docker-compose.yaml`
3. Vite proxy config for `/api` and `/socket.io`
4. Verify: `docker compose up -d`, hit `http://localhost:5173`, hit `http://localhost:3001/api/v1/health`

**Priority 2 — seed data (do before any frontend work):**
5. `server/prisma/seed.ts` — 2 categories (Coffee, Other), ~8 menu items with realistic `ee`/`me` values, 5 tables
6. Wire seed into `package.json` and run it

**Priority 3 — backend foundation:**
7. Auth middleware + `POST /api/v1/auth/login`
8. `GET /api/v1/menu`
9. `POST /api/v1/orders` (with order number generation from DailyCounter)
10. Socket handlers for barista ops
11. Order status service
12. Zod schemas

---

## Upcoming phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Docker + monorepo scaffold | Partial — client missing |
| 2 | Database schema + Prisma | Partial — seed missing |
| 3 | Backend foundation | Partial — routes + socket handlers missing |
| 4 | Shared types | Partial — events.ts missing |
| 5 | Ordering view | Not started |
| 6 | Coffee Preparation view | Not started |
| 7 | Coordinator view | Not started |
| 8 | Pickup Display view | Not started |
| 9 | Management view | Not started |
| 10 | QR / mobile polish | Not started |
| 11 | Production hardening | Not started |

Full task breakdown per phase: see `docs/PLANNING.md`

---

## Decision log

| Decision | Choice | Reason |
|----------|--------|--------|
| Order status model | Part-based (`coffeeStatus` / `otherStatus` on `Order`, `PartStatus` enum, no `OrderItem.status`) | Original design had both `Order.status` and `OrderItem.status`. Revised: baristas act on whole parts (all coffees, all others), not individual items. PICKED_UP is per-part — one part can be collected while the other is still on the display. No order-level status needed; CANCELLED is just `PartStatus.CANCELLED` set on all non-null parts. Simpler schema, no derived aggregates to keep in sync. |
| Real-time communication | Socket.io + REST hybrid | Socket for live push (orders, status changes); REST for management CRUD (simpler, cacheable, standard auth patterns). Polling was rejected — adds latency and load for no benefit when Socket.io is already in the stack. |
| Frontend framework | React 18 + Vite + TypeScript | Vite for fast DX; TypeScript for type safety across the monorepo; MUI v6 for accessible, responsive components without building a design system from scratch. |
| Database | PostgreSQL via Prisma | Relational model is a natural fit for orders with line items and categories. Prisma enforces type-safe queries and removes raw SQL risk. No NoSQL — the data relationships are too structured. |
| State management | Zustand | Lightweight with no boilerplate; integrates cleanly with Socket.io listener patterns; avoids Redux ceremony for a project of this size. |
| Auth | JWT, single admin credential (v1) | Multi-user auth is out of scope for v1. Single password → JWT keeps the implementation minimal while still being stateless and secure for HTTP. |
| Order numbers | Daily counter 1–999, keyed by YYYY-MM-DD | Human-readable and speakable ("order 42"). Short enough to display large. Daily reset keeps numbers low. UUID handles uniqueness; number is display-only. |
| Containerization | Docker + Docker Compose | Reproducible environment across machines. Dev compose uses volume mounts for hot reload; prod compose compiles to static files served by nginx. |
| Hot reload (dev) | `tsx watch` (server) + Vite HMR (client) | Best DX in their respective ecosystems. No custom watch scripts needed. |
| Order modifiers (size, milk, etc.) | Free-text `notes` field only in v1 | Full modifier system (options, pricing rules, combos) is a significant scope increase. Notes field covers 90% of real-world needs at a small coffee shop. Deferred to Phase 2. |
| Payment | Out of scope | Adds regulatory, security, and UX complexity that is disproportionate to the v1 goal of demonstrating the ordering and barista workflow. |
| Image handling for menu items | URL field only (v1) | File upload infrastructure (storage bucket, serving, resizing) is non-trivial. An `imageUrl` field allows linking to existing images without building upload infrastructure. Upload support deferred to Phase 2. |
| Events / sessions | Dropped for v1 | `createdAt` on Order is sufficient for date-based grouping and reporting. Events would require workflow enforcement (open before orders, close at end of day) with no v1 reporting payoff. |
| Price on MenuItem | Dropped for v1 | The shop isn't charging for orders yet. A `Decimal` price field will be added when payment is in scope. |
| Customer model | Not added | Push notifications use the `order:{id}` socket room — the client joins after placing. No Customer entity needed. Kiosk orders: `tableId = null` on Order. |
| Barista ops | Socket.io events, not REST | `order:item:start` and `order:item:done` are Socket.io client→server events. REST is for placement and management CRUD only. |
| Module system | ESM (`import`/`export`) throughout | All `package.json` files have `"type": "module"`. Local TS imports use `.js` extension (Node ESM requirement). |
| Dev schema management | `prisma db push` on container start | No migration files during early dev. Schema syncs automatically on restart. Migrate to `prisma migrate dev` when schema stabilises before frontend work begins. |
| Alpine + Prisma | `openssl` via apk + `linux-musl-openssl-3.0.x` binaryTarget | Alpine ships without OpenSSL; Prisma's query engine dynamically links against it. Both the apk install and the binaryTarget are required — one without the other will fail. |
