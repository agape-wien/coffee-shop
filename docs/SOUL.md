# Soul — Vision & Design Principles

## What we're building
A system that gets out of the way. Customers should order without frustration. Baristas should never wonder what to make next. The pickup display should be readable from across a room. The management interface should be self-explanatory.

## Design principles

### 1. Speed over features
Every interaction has a time cost. A customer at a kiosk wants to order and sit down. A barista glancing at the prep screen between shots needs information at a glance. Never add UI complexity without asking: does this make the primary action faster or slower?

### 2. Designed for real conditions
- The kiosk will be touched with wet and greasy fingers. Touch targets must be large (minimum 48×48px).
- The barista screen is in a loud, hot environment. Color and iconography must carry meaning — don't rely on small text.
- The pickup display is viewed from distance. Order numbers should be visible at 3 meters.
- Mobile ordering happens on customer phones with varying screen sizes and in varying lighting. High contrast.

### 3. Failure is visible, not silent
If the socket disconnects, show a banner. If an order submission fails, say why. If the menu fails to load, show a retry button. Never leave the user staring at a spinner with no feedback path.

### 4. Progressive disclosure in management
The management interface is used by staff who may not be technical. Lead with the most common actions (toggle availability, change price). Destructive actions (delete category, rotate QR) are behind a confirm step.

### 5. Real-time is a feature, not an afterthought
The entire value of this system over a paper ticket system is live updates. Every view that can benefit from real-time must use it. The prep screen should never require a refresh. The coordinator view is a live dashboard, not a page you reload.

## View personality

| View | Personality | Primary color usage |
|------|-------------|---------------------|
| Ordering | Warm, inviting, like a café menu | Brand accent color, food photography |
| Prep | Functional, dense, no decoration | High contrast, urgency colors (amber, red) |
| Coordinator | Overview, calm, informational | Status colors in kanban columns |
| Pickup | Celebratory when your number appears | Large, high contrast, minimal |
| Management | Professional, neutral | Standard MUI palette |

## The 60-second ordering rule
A customer sitting down at a table should be able to scan a QR code, browse the menu, add items to their cart, and submit an order in under 60 seconds. Any UX decision that risks breaking this should require explicit justification.

## Collaboration & learning

This project is also a learning exercise. That changes how feedback works:

- **Criticize ideas, don't just implement them.** If an approach the user suggests is suboptimal, over-engineered, under-thought, or has a better alternative — say so directly before writing code. Explain why. The goal is a better outcome AND a better understanding.
- **No sugarcoating.** "That could work but..." is a red flag phrasing. If something is wrong, say it's wrong. If a decision has a real downside, name the downside.
- **Justify unconventional choices.** Whenever we choose something non-standard, the rationale must be written down — in this file, in `TRACKER.md`, or in a code comment. Future sessions and future maintainers need to understand *why*, not just *what*.
- **Push back on scope creep.** If a new idea violates the principles above (speed, real conditions, failure visibility, progressive disclosure, real-time as feature), name the violation.

---

## Code documentation standard

Every non-trivial piece of code must be documented at two levels:

**The what** — what does this function, module, or block do? This should be written clearly enough that it can be lifted into a user-facing manual or API reference without rewriting. A new developer (or a future version of this project) should be able to understand what a piece of code is responsible for without reading the implementation.

**The why** — why was it written this way? This captures:
- **Unconventional choices:** If we used approach A over the more obvious approach B, say why.
- **Hidden constraints:** Things the code assumes about the environment, the database state, or another system that are not obvious from reading.
- **Intentional trade-offs:** Performance vs. simplicity, correctness vs. speed, etc.

The *what* is the foundation for user-facing documentation. The *why* is the institutional memory that prevents future sessions and future developers from undoing good decisions by mistake.

**The line to avoid:** Don't write a *what* comment that just restates the function name. `// Adds item to cart` above `addItemToCart()` adds nothing. The *what* comment should describe behavior, edge cases, and contract — not just rename the function in prose.

---

## What this is not
- A POS system (no payment)
- A loyalty program
- An analytics platform
- A multi-location franchise tool

Scope creep in these directions will compromise the core experience. Build the core brilliantly before adding periphery.
