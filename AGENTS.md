# Coffee Shop Ordering App — AI Agents Reference

## What this project is
A real-time coffee shop ordering system. Customers order via kiosk or mobile (QR code at table). Baristas see live queues. A pickup display shows ready order numbers. Staff manage menu via an admin panel.

The screen design maps directly to a real 4-person paper-ticket coffee shop workflow (prep person, barista, counter person). Decisions that look unusual almost always have a real-world operational reason behind them.

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

## View personality

| View | Personality | Color guidance |
|------|-------------|----------------|
| Ordering (`/order`) | Warm, inviting — like a café menu | Brand accent, food photography |
| Barista (`/barista`) | Functional, dense, no decoration | High contrast; urgency colors (amber >5 min, red >10 min) |
| Counter (`/counter`) | Action-oriented, clear state separation | Left panel: barista urgency colors; right panel: calm (pickup ready) |
| Pickup Display (`/pickup`) | Celebratory when your number appears | Large, high contrast, minimal |
| Management (`/management`) | Professional, neutral | Standard MUI palette |

## Design principles

These are hard constraints, not preferences. Push back on any implementation that violates them.

**Speed over features.** Every interaction has a time cost. Never add UI complexity without asking: does this make the primary action faster or slower? The 60-second rule: a customer should be able to scan a QR code, browse, add items, and submit in under 60 seconds. Any UX decision that risks breaking this requires explicit justification.

**Designed for real conditions.** The kiosk is touched with wet and greasy fingers — touch targets minimum 48×48px. The barista screen is in a loud, hot environment — color and iconography must carry meaning, don't rely on small text. The pickup display is read from 3 meters — order numbers must be visible at that distance. Mobile ordering happens in varying lighting — high contrast throughout.

**Failure is visible, not silent.** If the socket disconnects, show a banner. If an order submission fails, say why. If the menu fails to load, show a retry button. Never leave the user staring at a spinner with no feedback path.

**Progressive disclosure in management.** Lead with the most common actions (toggle availability, change price). Destructive actions (delete category, rotate QR) go behind a confirm step.

**Real-time is a feature, not an afterthought.** The entire value over a paper ticket system is live updates. Every view that can benefit from real-time must use it. The barista screen should never require a manual refresh.

## Domain logic

### Cart line grouping (orderStore)
Pressing a menu card increments the one `CartLine` for that item whose `notes === ''` (the accumulator line). Once notes are typed that line is locked, and the next press creates a new line. This enables "2× flat white cold milk + 1× flat white oat milk" without a modifiers system. The badge on the menu card sums across all lines for that item.

### Order number override
When staff type a custom number before placing (for paper block changes mid-shift), the server upserts the daily counter to that value so auto-increment resumes from override+1. `GET /api/v1/orders/next-number` is read-only — it previews the next number but does not consume one.

### v1 is kiosk-first
The primary daily workflow is staff at the bar kiosk. Table/QR mode (`isTokenMode`) is built but secondary. The order number field and table picker are hidden in token mode because they make no sense on a customer self-order screen.

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
- The app runs over plain HTTP on a local network — not HTTPS, not localhost for client devices. Web Crypto APIs that require a secure context (e.g. `crypto.randomUUID()`) are unavailable on customer/staff devices connecting via IP. Use the `newLineId()` fallback pattern in `orderStore.ts` (feature-detects, falls back to a `Math.random`-based UUID v4).
- Do not add a "first connect vs. reconnect" distinction unless behavior genuinely differs. If an operation is correct to run every time, run it every time — the extra guard adds hidden complexity with no benefit.

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

## Styling architecture
Global design tokens live in `client/src/index.css` as CSS custom properties at `:root`. Currently defined: `--fs-primary`, `--fs-secondary`, `--fs-small` for the three font size tiers.

Dark mode is implemented via:
- MUI `ThemeProvider` in `App.tsx` — handles MUI component colors
- `[data-theme="dark"]` block in `index.css` — extension point for custom CSS variable overrides
- `themeStore.ts` (Zustand, persisted to localStorage + `AdminConfig.darkMode` in DB)

## Development workflow
```bash
# Start everything with hot reload
docker compose up -d

# App (frontend + API): http://localhost:3001
# DB:                   localhost:5432
```
Vite runs as Express middleware (`middlewareMode: true`) inside the server process — there is no separate frontend container or port. This was a deliberate architecture change after the initial scaffold.

**After `prisma db push`, restart the server container** (`docker compose restart server`). `tsx watch` hot-reload caches the Prisma client module and does not reload native modules on file changes. Without a restart, new schema columns return `undefined` and silently fall through to their defaults (e.g. `darkMode` always reads `false`).

## Collaboration rules
This project is also a learning exercise. That changes how feedback works:

- **Criticize ideas, don't just implement them.** If an approach is suboptimal, over-engineered, or has a better alternative — say so directly before writing code. Explain why. The goal is a better outcome AND a better understanding.
- **No sugarcoating.** If something is wrong, say it's wrong. If a decision has a real downside, name the downside.
- **Justify unconventional choices.** Whenever something non-standard is chosen, write the rationale in a code comment or in `docs/TRACKER.md`. Future sessions need to understand *why*, not just *what*.
- **Push back on scope creep.** If a new idea conflicts with the design principles in the "Design principles" section above (speed, real conditions, failure visibility, progressive disclosure, real-time as feature), name the conflict.

## Key files to know
- `packages/shared/src/types.ts` — canonical type definitions for all domains
- `server/prisma/schema.prisma` — database schema (source of truth for data shape)
- `server/src/socket/index.ts` — Socket.io init and room management
- `docs/ARCHITECTURE.md` — event schema, API endpoints, data flow diagrams
- `docs/TRACKER.md` — implementation history, completed phase log, decision log, and current next-up items
- `docs/PLANNING.md` — phased implementation roadmap
