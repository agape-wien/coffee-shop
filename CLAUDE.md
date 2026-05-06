# Coffee Shop Ordering App — Claude Reference

## What this project is
A real-time coffee shop ordering system. Customers order via kiosk or mobile (QR code at table). Baristas see live queues. A pickup display shows ready order numbers. Staff manage menu via an admin panel.

## Tech stack
| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, Material UI v6 |
| Backend | Node.js, TypeScript, Express |
| Real-time | Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Containers | Docker + Docker Compose |

## Monorepo structure
```
/
├── client/               React frontend (Vite)
│   └── src/
│       ├── views/        One folder per screen
│       ├── components/   Shared UI components
│       ├── hooks/        Custom hooks (useSocket, useOrder, etc.)
│       ├── store/        Zustand stores
│       └── types/        Re-exports from packages/shared
├── server/               Node.js backend
│   └── src/
│       ├── api/          Express REST routes (/api/v1/...)
│       ├── socket/       Socket.io event handlers
│       ├── services/     Business logic (order, menu, table)
│       └── prisma/       Schema + migrations
├── packages/
│   └── shared/           TypeScript types used by both client and server
├── docs/                 Architecture, planning, decisions
└── docker-compose.yaml   Dev compose with hot reload (default file, `docker compose up -d`)
```

## Views and routes
| URL | View | Who sees it | Layout |
|-----|------|-------------|--------|
| `/order` or `/order?table={token}` | Ordering | Customers (kiosk + mobile + staff at table) | Left/top: menu by category — Right/bottom: current order/cart |
| `/barista` | Barista | Prep person + barista (shared screen, two roles) | Left/top: PENDING coffee orders (prep picks these) — Right/bottom: IN_PROGRESS coffee orders (barista finishes these) |
| `/counter` | Counter | Counter staff — handles non-coffee items and pickup | Left/top: PENDING + IN_PROGRESS other items — Right/bottom: DONE items on pickup display ("123 C" / "123 O"), tap to dismiss |
| `/pickup` | Pickup Display | Customers waiting for orders (read-only big screen) | Single panel, large order numbers |
| `/management` | Management | Admin staff only (auth required) | Standard CRUD UI |

**Ordering modes (same route, different behaviour):**
- `/order` — kiosk mode: table picker visible, full UI
- `/order?table={qrToken}` — table mode: table auto-resolved from token, table picker hidden
- No separate "staff mode" in v1 — staff use the kiosk screen

**Responsive layout rule:** All two-panel views stack panels vertically in portrait orientation and place them side-by-side in landscape. Use `useMediaQuery('(orientation: landscape)')` — not width breakpoints — so the layout follows device rotation on tablets and phones.

## Socket.io conventions
- Event names: `domain:action` — e.g. `order:placed`, `order:status_updated`
- Rooms: `kitchen`, `display`, `management`, `order:{orderId}`
- Never emit directly to individual sockets for business events — use rooms
- Full event schema: see `docs/ARCHITECTURE.md`

## REST API conventions
- Base path: `/api/v1`
- All management endpoints require `Authorization: Bearer <jwt>`
- Response shape: `{ data: T }` on success, `{ error: string, code: string }` on failure
- Full endpoint list: see `docs/ARCHITECTURE.md`

## Coding rules
- TypeScript strict mode everywhere — no `any`, use `unknown` + type guards
- All shared types live in `packages/shared` — never duplicate type definitions
- Zod for runtime validation at API boundaries (both REST and Socket.io payloads)
- Prisma is the only way to touch the database — no raw SQL except in migrations
- Unconventional choices require a written justification: a code comment or a `docs/TRACKER.md` decision log entry

## Code documentation standard
Every non-trivial function or module needs two things documented:

**The what** — what does it do, what are its edge cases, what contract does it uphold? Write it clearly enough that it could go into a user-facing manual without rewriting. A new developer should understand what the code is responsible for without reading the implementation.

**The why** — why was it written this way? Captures:
- Unconventional choices: why approach A over the more obvious approach B
- Hidden constraints: things the code assumes about the environment or database state that aren't visible from reading
- Intentional trade-offs: performance vs. simplicity, correctness vs. speed

The line to avoid: don't write a *what* comment that just restates the function name. `// Adds item to cart` above `addItemToCart()` adds nothing. Describe behaviour, edge cases, and contract instead.

## Module system
- **ESM everywhere** — use `import` / `export` syntax. `require()` and `module.exports` are banned.
- All `package.json` files must have `"type": "module"`.
- Local imports in TypeScript must use the `.js` extension (e.g. `import foo from './foo.js'`). TypeScript resolves `.js` → `.ts` at compile time; Node.js and tsx need `.js` at runtime.
- Node built-ins are imported with the `node:` prefix (e.g. `import { createServer } from 'node:http'`).

## Open decisions (do not implement without checking)
- Payment: explicitly out of scope for v1
- Order modifiers (size, milk type, extras): Phase 2 — v1 uses a free-text notes field
- Receipt printing: not planned
- Authentication: JWT, single admin credential for v1 (not multi-user)

## Development workflow
```bash
# Start everything with hot reload
docker compose up -d

# App (frontend + API): http://localhost:3001
# DB:                   localhost:5432
```
Vite runs as Express middleware in dev — there is no separate frontend container or port.

## Collaboration rules
This project is also a learning exercise. That changes how feedback works:

- **Criticize ideas, don't just implement them.** If an approach is suboptimal, over-engineered, or has a better alternative — say so directly before writing code. Explain why. The goal is a better outcome AND a better understanding.
- **No sugarcoating.** If something is wrong, say it's wrong. If a decision has a real downside, name the downside.
- **Justify unconventional choices.** Whenever something non-standard is chosen, write the rationale in a code comment or in `docs/TRACKER.md`. Future sessions need to understand *why*, not just *what*.
- **Push back on scope creep.** If a new idea conflicts with the design principles in `docs/SOUL.md` (speed, real conditions, failure visibility, progressive disclosure, real-time as feature), name the conflict.

## Session continuity

**At the start of every session, read `docs/TRACKER.md` first.** It is the ground truth for current project state, what is in progress, and what comes next. Never assume continuity from conversation history.

Update `docs/TRACKER.md` whenever a task is completed or the project state changes.

## Key files to know
- `docs/TRACKER.md` — **current project state, active TODOs, decision log** (read this first)
- `packages/shared/src/types.ts` — canonical type definitions for all domains
- `server/prisma/schema.prisma` — database schema (source of truth for data shape)
- `server/src/socket/index.ts` — Socket.io init and room management
- `docs/ARCHITECTURE.md` — event schema, API endpoints, data flow diagrams
- `docs/PLANNING.md` — phased implementation roadmap
- `docs/SOUL.md` — UX design principles and view personalities
