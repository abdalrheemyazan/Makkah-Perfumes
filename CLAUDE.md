# CLAUDE.md — working rules for this repository

MAKKAH PERFUMES — Hebrew RTL e-commerce flagship. Read this before changing code.

## The one rule that governs everything

**Never present unverified data as fact.**

The client supplied 13 product photographs and a logo. That is *all* the verified
information that exists. Prices, stock, SKUs, fragrance notes, shipping rates,
branch addresses and company history were **not** supplied.

Consequences, all enforced in code:

| Situation | Required behaviour |
|---|---|
| Unverified price | `pricingVerified = false` → UI shows a **"מחיר לדוגמה"** badge, and `offers` is omitted from JSON-LD |
| No fragrance notes | `notesVerified = false` → the pyramid section is not rendered at all |
| No reviews | Render an empty state. **Never** generate testimonials or `aggregateRating` |
| No branches | Render an empty state. **No** `LocalBusiness` structured data |
| No payment gateway | Development payment mode, disclosed in the UI. **No** fake card form |

If you need a value that does not exist, add it to `docs/MISSING_BUSINESS_DATA.md`
and render an honest empty state. Do not invent it.

## Product identity is immutable

Never alter a product's name, bottle geometry, cap, label text, or liquid colour —
in code, in copy, or in any generated image or video. The official English name
printed on the bottle is authoritative. `docs/ASSET_MANIFEST.md` records what each
photograph actually shows.

The filename `Amber Icense.avif` was a typo in the *filename only*; the physical
label reads `Amber Incense`. The normalised file is `amber-incense.avif`.

## Money

Every monetary value is an **integer number of agorot** (1 ILS = 100 agorot).
Never a float. Never a float. `src/lib/commerce/money.ts` is the only place that
converts, and it throws on non-integer input rather than rounding silently.

Prices are **recomputed on the server** immediately before an order is written
(`src/lib/commerce/orders.ts`). Nothing price-related is ever read from the
request body.

## Hebrew and RTL

- `lang="he" dir="rtl"` on `<html>`; locale `he-IL`; currency `ILS`.
- Use **logical CSS properties** — `margin-inline`, `inset-inline-start`,
  `border-inline-end`. Never `left`/`right`.
- Put the logo first in DOM order and let RTL place it on the right. Do not flip
  a finished LTR layout.
- Latin numerals inside Hebrew text get the `.ltr-nums` class so they isolate
  correctly.
- All user-visible strings are Hebrew: labels, validation, errors, empty states,
  loading text, `aria-label`, `alt`. Official English product names may appear
  beneath the Hebrew name.

## Server Actions

A file marked `'use server'` may **only export async functions**. Exporting a
plain object from one turns it into a server reference that arrives as
`undefined` on the client. All initial-state constants live in
`src/lib/action-state.ts`.

## Client/server boundary

`src/lib/commerce/cart.ts`, `catalog.ts`, `auth.ts`, `db.ts` and friends are
`server-only`. Importing any of them from a Client Component drags Prisma and the
`pg` driver into the browser bundle and breaks the build.

Shared Hebrew labels live in `src/lib/commerce/labels.ts`, which has **no server
imports** by design. Put anything both sides need there.

## Motion

- Respect `prefers-reduced-motion` before loading animation code, not after.
- All information must be available with animation disabled.
- Animate transform and opacity. Never move a button out from under the pointer —
  pending states swap the label only.
- Dynamically import GSAP and any 3D so pages that do not use them never pay.
- Pause off-screen media; never run WebGL continuously.
- Read browser state with the `useSyncExternalStore` hooks in `src/lib/hooks.ts`
  rather than mirroring it with `setState` inside an effect. ESLint enforces this.

## Commands

```bash
npm run db:server    # start local PostgreSQL (required before dev)
npm run dev
npm run typecheck && npm run lint && npm test && npx playwright test
npm run build
```

## Before claiming anything works

Run typecheck, lint, unit tests, Playwright, and a production build. Then open the
page. "It compiles" is not "it works".
