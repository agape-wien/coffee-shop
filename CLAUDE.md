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
| URL | View | Who sees it |
|-----|------|-------------|
| `/order` or `/order?table=5` | Ordering | Customers (kiosk + mobile) |
| `/prep` | Coffee Preparation | Barista at the machine |
| `/coordinator` | Coordinator/Barista Overview | Head barista, shift manager |
| `/pickup` | Pickup Display | Customers waiting for orders |
| `/management` | Management | Admin staff only (auth required) |

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
- Document both the WHAT and the WHY — the what (behavior, contract, edge cases) forms the basis for user-facing documentation; the why (unconventional choices, hidden constraints, trade-offs) is institutional memory that prevents good decisions from being undone
- Never write a what-comment that just restates the function name in prose — describe behavior and contract instead
- Unconventional choices require a written justification, either as a code comment or in `docs/TRACKER.md` decision log

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

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# DB:       localhost:5432
```

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
- `docs/SOUL.md` — design principles, collaboration rules, code documentation standard
