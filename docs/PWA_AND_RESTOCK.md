# PWA, Web Push & Restock Notifications — operations guide

This covers the three features added in the restock/PWA work: the installable PWA,
"notify me when it's back in stock", and the inventory-correctness hardening.
Everything below is safe to run against production **only** in the order given.

---

## 1. What shipped

| Area | Summary |
|---|---|
| **PWA** | `src/app/manifest.ts` (→ `/manifest.webmanifest`), Serwist service worker `src/app/sw.ts` (→ `public/sw.js`, built by `next build`), brand icons in `public/icons/`, offline page `/offline`, subtle install prompt. |
| **Restock** | `RestockSubscription` + `PushSubscription` Prisma models, subscribe/unsubscribe server actions, `RestockNotify` UI on cards + product page, Web Push (VAPID) + email fallback, admin restock view on `/admin/inventory`. |
| **Inventory** | Atomic race-safe reservation, order-creation idempotency, locked-down CANCELLED transitions, restock-transition trigger, `db:audit-commerce` / `db:repair-commerce`. |

The service worker (`public/sw.js`) is **generated during `next build`** and is
git-ignored. The build now runs with `next build --webpack` because Serwist's
classic mode needs webpack (Next 16 defaults to Turbopack).

---

## 2. VAPID keys (Web Push)

Generate one key pair **once**, keep it stable forever (rotating it invalidates
every existing browser subscription):

```bash
npx web-push generate-vapid-keys
```

You get a **public** key and a **private** key.

| Variable | Value | Secrecy |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the public key | Public — shipped to the browser by design. |
| `VAPID_PRIVATE_KEY` | the private key | **Secret** — server only, never commit, never expose to the browser. |
| `VAPID_SUBJECT` | `mailto:you@makkah…` or the site URL | Contact for push providers. |

`.env.example` documents these. Never put the private key in `.env.example`, a
client component, or git.

### Optional — the restock job endpoint

`POST /api/restock/process` is an idempotent retry/fallback that notifies any
subscriber whose product is now available. It is **disabled** unless a secret is
set:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put it in `RESTOCK_JOB_SECRET`. Call with header `x-restock-job-secret: <value>`
(or `?secret=<value>`). Wire it to a Netlify Scheduled Function if you want a
periodic safety net; it is not required for normal operation (the admin actions
trigger notifications inline via `after()`).

---

## 3. Netlify environment variables

Add in **Site settings → Environment variables** (all environments):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = <public key>
VAPID_PRIVATE_KEY            = <private key>          # secret
VAPID_SUBJECT               = mailto:no-reply@makkah…
RESTOCK_JOB_SECRET          = <random hex>            # optional, secret
```

Email delivery still uses `MAIL_TRANSPORT` (default `console`). In production the
console transport is treated as **not deliverable** — the app will not claim an
email was sent, and email-only subscriptions stay `ACTIVE` until a real transport
(`MAIL_TRANSPORT=smtp` + `SMTP_*`) is configured and `src/lib/mail.ts`'s
`smtpTransport` is implemented. Push works independently of email.

---

## 4. Database migration

The migration `…_add_restock_push_and_movement_idempotency` adds the two new
tables and a unique index on `InventoryMovement(orderId, inventoryItemId, reason)`.

`netlify.toml` already runs `npm run db:deploy` (`prisma migrate deploy`) before
the build, so **deploying applies the migration automatically**. Never run
`prisma migrate reset` against production.

Before the first production deploy carrying this migration:

```bash
# 1. Back up production (point DATABASE_URL at prod, read-only export).
DATABASE_URL="<prod>" npm run db:backup

# 2. Confirm no pre-existing duplicate order movements would block the new
#    unique index (must report 0 for the "חשד לניכוי כפול" line).
DATABASE_URL="<prod>" npm run db:audit-commerce
```

If the audit shows a non-zero duplicate count, resolve it before deploying (the
index creation would otherwise fail).

---

## 5. Verifying the PWA

**Desktop (Chrome/Edge):** load the site → DevTools → **Application**:
- *Manifest*: name "Makkah Perfumes", 4 icons, `standalone`, `rtl`, `#0b0a08`.
- *Service Workers*: `sw.js` **activated**.
- *Cache Storage*: `serwist-precache-*`, `pages`, `next-image`, `public-media`;
  confirm **no** `/admin`, `/account`, `/cart`, `/checkout`, `/api` entries.
- Install via the address-bar icon; the app opens in its own window.
- Offline: DevTools → Network → *Offline*, navigate to a new page → the branded
  "אין כרגע חיבור לאינטרנט" page appears.

**Android (Chrome):** visit the site → "Add to Home screen" / install banner →
launch from the home screen (standalone, brand icon).

**iOS (Safari 16.4+):** Share → "Add to Home Screen". Note: iOS only delivers Web
Push to a PWA **installed to the home screen**, on iOS 16.4+.

---

## 6. Verifying Web Push (must be a real browser)

1. Set the VAPID vars and deploy.
2. On a supported browser, open an **out-of-stock** product, click
   *עדכנו אותי כשהמוצר חוזר למלאי* → *קבלת התראה בדפדפן* → allow notifications.
3. Confirm a `PushSubscription` row and an `ACTIVE` `RestockSubscription` with
   `PUSH` in `channels`.
4. In admin, raise that product's stock from 0 to a positive number. The success
   banner reads *"המוצר חזר למלאי. עדכוני זמינות נשלחים לנרשמים."*
5. Confirm the notification arrives, clicking it opens the exact product page, and
   the subscription is now `NOTIFIED` (`db:audit-commerce` "NOTIFIED" count +1).

**Platform limits:** desktop Chrome/Edge/Firefox and Android Chrome support push;
Safari desktop 16+ and iOS 16.4+ require the PWA to be installed. A denied
permission is remembered and never re-prompted; email remains available.

---

## 7. Verifying inventory correctness safely

**Concurrency (oversell) — automated:**

```bash
npm run db:verify-concurrency   # creates 1-unit temp product, races 8 buyers,
                                 # asserts exactly 1 wins, cleans up. Local only.
```

**Controlled order on production (manual):**

1. `DATABASE_URL="<prod>" npm run db:audit-commerce` and note a chosen variant's
   `quantityOnHand` / `quantityReserved` and its `InventoryMovement` count.
2. Place one real (development-payment) order for N units of it.
3. Confirm `quantityReserved` increased by exactly N and exactly one
   `ORDER_RESERVED` movement (`delta = -N`) was written for that order.
4. Cancel the order in admin → `quantityReserved` returns by exactly N, one
   `ORDER_RELEASED` movement (`delta = +N`); running cancel again does nothing.
5. Re-run the audit — all integrity lines stay `0`.

Availability everywhere is `quantityOnHand − quantityReserved`. Stock is
**reserved** at order time and **decremented from `quantityOnHand`** at fulfilment.

---

## 8. Rollback notes

- The service worker self-updates (`skipWaiting` + `clientsClaim`); a bad deploy
  is replaced on next load. To hard-kill the SW, deploy a `public/sw.js` that
  calls `self.registration.unregister()` — but prefer fixing forward.
- The DB migration is additive (two new tables + one index); it does not alter or
  drop existing columns, so a code rollback does not require a DB rollback.
