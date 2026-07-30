# Pro Keys Dashboard — Project Context

## Overview
Group-buy subscription SaaS for premium tools (QuillBot, Grammarly, Canva Pro, Turnitin, etc).
Members pay for shared access to premium accounts via a Chrome extension that injects
session cookies/localStorage/IndexedDB into the target tool's site.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Supabase Project ref: `mluqxggjbumtmyfldaon`
- Local path: `D:\Bussines\Pro Keys\Dashboard`
- Dev server: `npm run dev` → http://localhost:3000

## Two separate apps in one Next.js project
1. **Admin Dashboard** — `/dashboard`, `/members`, `/products`, `/servers`,
   `/payment-gateways`, `/ui-settings`, etc. Uses `components/layout/Sidebar.tsx`
   (dark theme, colors `#111827`/`#1F2937`/`#374151`) + `Topbar.tsx`.
   Auth: Supabase Auth (`@supabase/supabase-js`, anon+session).
2. **User/Member Portal** — everything under `app/u/*` (`/u/dashboard`, `/u/shop`,
   `/u/checkout`, `/u/subscription/[id]`, `/u/payments`, `/u/helpdesk`, `/u/tutorials`).
   Auth: **custom cookie-based system**, NOT Supabase Auth. Cookie name
   `pk_member_token` → verified via Postgres RPC `verify_member_session(p_token)`.
   All API routes under `app/api/member/*` use a **service-role Supabase client**
   (`SUPABASE_SERVICE_ROLE_KEY`) after verifying the member token — RLS is bypassed
   intentionally in these routes since the member auth is custom, not Supabase Auth.

## Internationalization (important, fragile area)
- `lib/lang-context.tsx` — `LangProvider` + `useLang()` hook. Provides
  `{ lang, currency, setLang, setCurrency, t(en,ar), dir, formatPrice(egp, usdRate) }`.
  State initializes synchronously from `localStorage` (`pk_lang`, `pk_currency`) so
  there's no flash/mismatch on first render.
- Every page under `app/u/*` must import `useLang` and wrap literal strings in
  `t('English','عربي')` — do NOT hardcode Arabic or English strings directly.
  This was a recurring bug: pages had many hardcoded Arabic strings not using `t()`.
- `formatPrice(egp, usdRate)` returns the correctly localized string:
  - ar + EGP → "200 جنيه مصري" (LTR-safe, western digits forced via `en-US` locale)
  - ar + USD → "4 دولار"
  - en + EGP → "200 EGP"
  - en + USD → "$4"
- Rule: tool logos, tool names, tool descriptions, and WhatsApp numbers must always
  render `dir="ltr"` regardless of page language (so `+20...` doesn't reverse and
  English tool names don't get RTL-mirrored). Prices/labels should respect `dir`.
- Cairo font auto-loads and applies only when `lang === 'ar'` (`lang-context.tsx`
  injects the Google Fonts link and sets `document.documentElement.style.fontFamily`).
- **Realtime lang/currency**: `app/u/layout.tsx` must consume `useLang()` from the
  context directly (not local `useState`) — using local state was the root cause of
  language toggles not being realtime across pages.

## Payment System
- Tables: `payments`, `wallet_transactions` (unused, legacy from a Turnitin project
  this was adapted from), `processed_payment_refs`, `payment_gateways`,
  `tool_purchases`, `user_server_sessions`, `tool_servers`.
- `payment_gateways` is **admin-editable** (Admin → Payment Methods): logo, QR code,
  UID/address, bilingual labels/instructions (`*_ar` / `*_en` columns), per-gateway
  edge function name (`edge_fn`), `payload_key` (e.g. `tx_id`, `tx_hash`, `ref_number`).
- Checkout (`app/u/checkout/page.tsx`) fetches gateways from `/api/member/gateways`
  and renders dynamically — never hardcode gateway names/instructions in the frontend.
- **CRITICAL FK note**: `payments.user_id` and `user_server_sessions.user_id` originally
  had a FK to `auth.users(id)`, but members live in `public.members`, NOT
  `auth.users`. These FK constraints were dropped:
  ```sql
  ALTER TABLE public.payments DROP CONSTRAINT payments_user_id_fkey;
  ALTER TABLE public.user_server_sessions DROP CONSTRAINT user_server_sessions_user_id_fkey;
  ```
  Any new table storing `member_id`/`user_id` referencing `public.members(id)` should
  NOT be pointed at `auth.users`.
- **`tool_purchases.confirmed_by` is a UUID column, not text.** Never insert a string
  literal like `'auto'` into it — this was a real bug that caused silent insert
  failures (Postgres FK/type error swallowed because the original edge function code
  didn't check the `.insert()` error). Always destructure `{ error }` from Supabase
  calls in edge functions and `console.error` it — silent failures here cost hours
  of debugging previously.

## Edge Functions (Supabase, Deno)
Location on disk (outside this repo, deployed via `supabase functions deploy`):
`verify-binance`, `verify-bybit`, `verify-bep20`, `verify-sms` (handles InstaPay AND
Vodafone Cash — matches a Google Sheet fed by an SMS-forwarding automation),
`verify-easykash`, `create-easykash-link`.

All of them:
1. Receive `{ payment_id, member_id, <payload_key value> }` from a Next.js proxy route
   `app/api/member/payment/verify/route.ts` (NOT called directly from the browser —
   the member has no Supabase JWT, so edge functions cannot use `auth.getUser()`).
2. Verify payment amount against the gateway's expected value.
3. On success, call a local `confirmTopup()` helper that:
   - inserts into `processed_payment_refs` (unique constraint prevents double-credit)
   - updates `payments.status = 'completed'`
   - **inserts into `tool_purchases`** with `status:'confirmed'`, computing
     `expires_at` from `shop_tools.duration_days` (fetched by `pack_id`)
   - Do NOT insert `confirmed_by` (see FK/type note above).

Deploy command (run from project root, `supabase/functions/<name>/index.ts` must exist):
```
supabase functions deploy verify-sms --no-verify-jwt
```
(same pattern for the other five). `--no-verify-jwt` is required since calls come
from the service-role proxy, not an authenticated Supabase user.

## Chrome Extension (client-side cookie/session injection)
Two separate extensions:
1. **Admin extension** (`prokeys-extension.zip` origin) — used by admin/staff to log
   into a tool (e.g. QuillBot) and "Auto Capture" cookies + localStorage + IndexedDB
   into JSON, with a "Copy to Clipboard" button to paste into Admin → Servers →
   Session Data field.
2. **Client extension** (installed by paying members) — `background.js` +
   `content-script.js` + minimal `popup.html/js`. Key files:
   - `content-script.js`: on `localhost:3000`/`*.vercel.app` pages, uses
     `window.postMessage` (NOT `document.dispatchEvent` — content scripts run in an
     **isolated world**, so only `window.postMessage` crosses into the page's React
     context) to signal `PK_EXTENSION_READY` and relay `PK_INJECT_REQUEST` /
     `PK_GET_STATE` / `PK_DISCONNECT_REQUEST` to `chrome.runtime.sendMessage`.
   - `background.js`: `TOOL_DOMAINS` maps tool name (from DB, e.g.
     "QuillBot Premium - Pro") to a domain via substring match. **Important
     per-tool quirks discovered**:
     - QuillBot uses Firebase Auth stored in IndexedDB
       (`firebaseLocalStorageDb` / `firebaseLocalStorage` store, keyed by
       `fbase_key`). Cookies alone are not enough — must inject IndexedDB via
       `chrome.scripting.executeScript` after the cookie-triggered page reload.
     - Grammarly's real app is at `app.grammarly.com`, not `grammarly.com` (the
       marketing site). Even with correct cookies (including the `.grammarly.com`
       parent-domain `grauth` auth cookie), Grammarly appears to reject injected
       sessions and issue a fresh anonymous `grauth` — likely IP/device-fingerprint
       binding on their end. **Unsolved**: probable fix is a sticky residential
       proxy per account (log in through the proxy once, capture cookies through
       the same proxy, store proxy credentials on the `tool_servers` row, and
       ensure the extension applies `chrome.proxy.settings.set` BEFORE navigating).
       `tool_servers` already has `proxy_host/port/username/password_encrypted`
       columns for this.
   - Cookie injection notes: strip leading `.` from `cookie.domain` to build the
     `url` for `chrome.cookies.set`; do NOT pass a `domain` field for `hostOnly`
     cookies (Chrome rejects it); clear old cookies on BOTH the exact domain and
     the parent domain (e.g. clear both `app.grammarly.com` and `grammarly.com`)
     before injecting, or stale conflicting cookies remain.
   - Session cookies are deliberately short-lived (30 min `expirationDate`) and
     renewed by a `chrome.alarms` heartbeat every 2 minutes, which also re-checks
     `/api/member/verify` — if the member's subscription/session is no longer
     valid, the extension auto-disconnects and clears all cookies for that tool
     (prevents a churned/expired member from retaining silent access).

## Realtime "active users" per server
- `tool_servers.current_active_users` is NOT a manually incremented counter (that
  approach was scrapped — it drifted and never went back down on disconnect).
  Instead, `/api/member/servers` computes active count live by counting rows in
  `user_server_sessions` where `status='active' AND expires_at > now()`.
- `/api/member/servers/session` (GET) issues session data and upserts a row in
  `user_server_sessions`, expiring any other active session the same member has
  on other servers first (so one member only ever counts once).
- Dashboard subscription cards use polling (30s) — NOT Supabase Realtime
  replication — because Realtime on custom tables requires a paid Supabase plan.
  `tool_purchases` changes DO use Realtime (`postgres_changes` channel) on the
  member dashboard for instant "new subscription appeared" UX; verify Realtime
  replication is enabled for that specific table in Supabase → Database →
  Replication → Source if this stops working.

## UI Settings (admin-controlled branding)
- New `ui_settings` key/value table (`public.ui_settings`, RLS: public SELECT,
  service-role write) + `/api/ui-settings` (GET/POST, `force-dynamic`/`revalidate=0`
  to avoid stale cache) + `lib/use-ui-settings.ts` hook (client-side 10s cache).
  Currently stores `logo_url`, `logo_width`, `logo_height`. Admin page at
  `app/ui-settings/page.tsx`, upload endpoint
  `app/api/admin/ui-settings/upload/route.ts` → Supabase Storage bucket
  `site-assets` (public, RLS policies allow anon INSERT/SELECT/UPDATE — this bucket
  is also used for payment gateway logos/QR codes and tool_servers session captures).
  Sidebar/login fall back to the original red-box "ProKeys" wordmark when
  `logo_url` is empty.
- **Pending / in progress**: separate light-mode vs dark-mode logo uploads, a
  separate login-page-only logo (distinct from the sidebar logo), and adding a
  light/dark theme toggle to the Admin dashboard itself (currently admin dash is
  dark-only, styled with inline hex `#111827`/`#1F2937`/`#374151` rather than
  Tailwind `dark:` classes — theming it will need either a CSS variable pass or a
  parallel light palette).

## Known-fragile things to re-check first if something looks broken
1. Any new `app/api/member/*` route: use service-role client + verify via
   `verify_member_session` RPC using the `pk_member_token` cookie — copy the
   pattern from an existing route rather than reinventing it.
2. Any Supabase `.insert()`/`.update()` inside an edge function: always check and
   log the `error` return value. Several past bugs were 100%-silent failures.
3. If a page's frontend server-role fetch is stale after an admin edit, check
   whether the API route needs `export const dynamic = 'force-dynamic'` and
   `export const revalidate = 0`.
4. If cross-page state (lang/currency/theme) "isn't realtime", check whether the
   consuming component pulled the value from local `useState` instead of the
   shared context/hook.
5. New payment gateway or tool: gateway text is bilingual in the DB
   (`name_ar/name_en`, `instructions_ar/en`, `input_label_ar/en`,
   `input_placeholder_ar/en`) — the frontend must pick based on `lang`, with a
   sane English fallback string if `*_en` wasn't filled in by the admin.

## What's explicitly NOT done yet / open threads
- Grammarly session injection doesn't survive Grammarly's own re-auth check
  (see extension notes above) — needs a sticky proxy solution.
- UI Settings: separate day/night logos, separate login-page logo, Admin
  dashboard light/dark toggle — requested but not yet implemented.
- OneClick Manager (time-limited no-login demo links) exists as a menu item but
  implementation details were deferred by the user.
