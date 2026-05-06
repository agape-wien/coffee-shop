# Project Tracker

> This is the first file to read at the start of any session.
> It reflects the current state of the project. Update it whenever tasks are completed or decisions are made.

---

## Current status

**Phase:** Phases 1–2 complete, Phase 3 (backend foundation) is next  
**Last updated:** 2026-05-06  
**Active work:** Nothing in progress — session closed cleanly.

---

## Completed

### Planning
- [x] Design principles and vision — `docs/SOUL.md`
- [x] Architecture document (DB schema, Socket.io events, REST API) — `docs/ARCHITECTURE.md`
- [x] 11-phase implementation roadmap — `docs/PLANNING.md`
- [x] Claude reference guide (tech stack, conventions, coding rules) — `CLAUDE.md`
- [x] Project tracker (this file) — `docs/TRACKER.md`

### Phase 1 — Docker + monorepo scaffold
- [x] Root `package.json` with npm workspaces (`client`, `server`, `packages/shared`)
- [x] `docker-compose.yaml` — db + server, hot reload via bind mounts, `docker compose up -d`
- [x] `server/Dockerfile.dev` — Node 25.9.0-alpine, OpenSSL fix, prisma generate baked in
- [x] `server/` — Node.js + TypeScript, `tsx watch` hot reload, ESM throughout
- [x] `packages/shared/` — TypeScript types package, exported as `@coffee/shared`
- [x] `.env.example` — all required env vars documented
- [x] `client/` — Vite + React + TypeScript scaffold (5 placeholder views: `/order`, `/barista`, `/counter`, `/pickup`, `/management`)
- [x] Vite runs as Express middleware in dev — single port (3001), no proxy, no separate client container
- [x] `server/prisma` bind-mounted so seed changes don't require image rebuild
- [x] `.gitignore` — excludes `node_modules/`, `dist/`, `.vite/`, `.env`, build artifacts
- [ ] `docker-compose.yml` — production variant (nginx, compiled builds) (**not started**)

### Phase 2 — Database schema + Prisma
- [x] `server/prisma/schema.prisma` — full schema: Category, MenuItem, Table, Order, OrderItem, DailyCounter
- [x] Prisma client singleton — `server/src/lib/prisma.ts`
- [x] Schema applied to DB via `prisma db push` (runs on container start)
- [x] `server/prisma/seed.ts` — 2 categories, 7 coffee items, 5 other items, 5 tables; production guard; run with `npm run db:seed --workspace=server`
- [ ] Proper migration files (`prisma migrate dev`) — deferred until schema stabilises

### Phase 3 — Backend foundation (partial)
- [x] `server/src/index.ts` — HTTP server, Socket.io wired, port binding, awaits async `createApp()`
- [x] `server/src/app.ts` — Express, `/api/v1/health`, Vite middleware (dev) / static serving (prod)
- [x] `server/src/socket/index.ts` — Socket.io init, `view:join` room handler
- [ ] `server/src/middleware/auth.ts` — JWT verification (**missing**)
- [ ] `POST /api/v1/auth/login` (**missing**)
- [ ] `GET /api/v1/menu` (**missing**)
- [ ] `POST /api/v1/orders` + `order:placed` socket emit (**missing**)
- [ ] Socket handlers: `order:part:start`, `order:part:done`, `order:part:picked_up`, `order:cancel` (**missing**)
- [ ] Order status service (`server/src/services/order.service.ts`) (**missing**)
- [ ] Zod schemas for all payloads (**missing**)

### Phase 4 — Shared types (partial)
- [x] `packages/shared/src/types.ts` — all domain types + socket payload shapes
- [ ] `packages/shared/src/events.ts` — typed Socket.io event map (**missing**)

---

## Next up — recommended order for next session

**Start here — verify stack is still healthy:**
```
docker compose up -d
curl http://localhost:3001/api/v1/health   # → {"ok":true}
# visit http://localhost:3001/order in browser → React app loads
```

**Priority 1 — complete Phase 3 (backend foundation):**
1. `packages/shared/src/events.ts` — typed Socket.io event map (small, do first, Phase 4 task)
2. `server/src/middleware/auth.ts` — JWT verification middleware
3. `POST /api/v1/auth/login` — validate env `ADMIN_PASSWORD`, return signed JWT
4. `GET /api/v1/menu` — return full `MenuSnapshot` (categories + items) from DB
5. `POST /api/v1/orders` — create order, assign daily number from `DailyCounter`, emit `order:placed` to `kitchen` room
6. `server/src/services/order.service.ts` — encapsulate status transition logic (enforce valid state machine)
7. Socket handlers: `order:part:start`, `order:part:done`, `order:part:picked_up`, `order:cancel`
8. Zod schemas for all incoming payloads (REST + Socket)

**Priority 2 — first real frontend view (once API is ready):**
9. `GET /api/v1/menu` must be working before starting the Ordering view (Phase 5)

---

## Upcoming phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Docker + monorepo scaffold | Complete (prod compose deferred to Phase 11) |
| 2 | Database schema + Prisma | Complete (migrations deferred until schema stabilises) |
| 3 | Backend foundation | Partial — routes + socket handlers missing |
| 4 | Shared types | Partial — events.ts missing |
| 5 | Ordering view (`/order`) | Not started |
| 6 | Barista view (`/barista`) | Not started |
| 7 | Counter view (`/counter`) | Not started |
| 8 | Pickup Display (`/pickup`) | Not started |
| 9 | Management view (`/management`) | Not started |
| 10 | QR / mobile polish | Not started |
| 11 | Production hardening | Not started |

Full task breakdown per phase: see `docs/PLANNING.md`

---

## Decision log

| Decision | Choice | Reason |
|----------|--------|--------|
| Order status model | Part-based (`coffeeStatus` / `otherStatus` on `Order`, `PartStatus` enum, no `OrderItem.status`) | Baristas act on whole parts (all coffees, all others), not individual items. PICKED_UP is per-part — one part can be collected while the other is still on the display. No order-level status needed; CANCELLED sets all non-null parts. Simpler schema, no derived aggregates to sync. |
| Real-time communication | Socket.io + REST hybrid | Socket for live push (orders, status changes); REST for management CRUD (simpler, cacheable, standard auth). Polling rejected — adds latency and load for no benefit when Socket.io is already in the stack. |
| Frontend framework | React 18 + Vite + TypeScript + MUI v6 | Vite for fast DX; TypeScript for type safety across the monorepo; MUI v6 for accessible, responsive components without building a design system from scratch. |
| Client/server serving | Vite as Express middleware (dev); `express.static` from `client/dist` (prod) | Single origin — frontend and API both on port 3001. No separate client container. No CORS needed for the browser client. React Router handles all non-API paths; Express registers API routes first so `/api/v1/*` takes priority. |
| Screen naming | `/barista`, `/counter` (dropped `/prep`, `/coordinator`) | `/barista` — both prep person and finishing barista share one screen (two panels, one role per panel). `/counter` — person is stationary at the counter; "runner" was rejected because it implies moving to tables. |
| Two-panel layout | Orientation-aware (`useMediaQuery('(orientation: landscape)')`) not width breakpoints | Staff rotate Kindle tablets mid-shift; orientation is the correct signal. Portrait → vertical stack, landscape → side by side. Width breakpoints misbehave when a phone is held sideways. |
| Counter + pickup display | Counter view (`/counter`) joins both `kitchen` and `display` rooms | Counter person manages other-item preparation (kitchen room) and the pickup display (display room). Joining both rooms from one connection handles all relevant events without separate join per panel. |
| Pickup display format | "123 C" and "123 O" (Coffee / Other) | Parts shown and dismissed independently. "T" (tea) rejected — "Other" covers all non-coffee items. |
| Database | PostgreSQL via Prisma | Relational model fits orders with line items and categories. Prisma enforces type-safe queries and removes raw SQL risk. |
| State management | Zustand | Lightweight, no boilerplate, integrates cleanly with Socket.io listener patterns. |
| Auth | JWT, single admin credential (v1) | Multi-user auth out of scope for v1. Single password → JWT is minimal, stateless, secure for HTTP. |
| Order numbers | Daily counter 1–999, keyed by YYYY-MM-DD | Human-readable ("order 42"). Daily reset keeps numbers short. UUID handles uniqueness; number is display-only. |
| Containerization | Docker + Docker Compose (dev: db + server only) | Reproducible environment. Dev uses volume mounts for hot reload. No separate client container — Vite runs as Express middleware. |
| Hot reload (dev) | `tsx watch` (server) + Vite HMR via middleware (client) | Single process, single port. Vite middleware mode provides full HMR on the same origin as the API. |
| Seed data | Dev-only, wipes and recreates on each run; production guard throws if `NODE_ENV=production` | Clean slate on each dev reseed. Guard prevents accidental data loss on prod. |
| Module system | ESM (`import`/`export`) throughout | All `package.json` files have `"type": "module"`. Local TS imports use `.js` extension (Node ESM requirement). |
| Dev schema management | `prisma db push` on container start | No migration files during early dev. Migrate to `prisma migrate dev` before schema stabilises and frontend work begins. |
| Alpine + Prisma | `openssl` via apk + `linux-musl-openssl-3.0.x` binaryTarget | Alpine ships without OpenSSL; Prisma's query engine dynamically links against it. Both required — one without the other fails. |
