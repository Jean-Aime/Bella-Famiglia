# Go-live runbook — Bella Famiglia guest house

Everything the code can do is done. The steps below are what still needs *your*
account access: running SQL, creating an email key, deploying, and replacing
placeholder content.

Work through it in order — Part 1 is a security fix, do it first.

---

## Status at a glance

| Area | State |
| --- | --- |
| Public site, both houses, availability checker, direct booking | ✅ built & tested |
| Admin panel (reservations, calendar, houses, guests, reviews, settings) | ✅ built & tested |
| Bella Famiglia listing content (public pages + editable admin fields) | ⚠️ run the real-content script in Part 1 |
| Booking confirmation / host alert emails | ✅ code written — needs your email key (Part 2) |
| Email delivery history + resend buttons | ✅ built — needs Part 1 step 3 + Part 2b |
| Database access rules (RLS) | ⚠️ **live DB is currently wide open** — run Part 1 |
| Demo data blocking real dates | ⚠️ run the cleanup script (Part 1) |
| Airbnb buttons | ✅ now hidden automatically while the links are placeholders |
| Hosting | ❌ not deployed yet (Part 4) |
| Payments | ❌ not included — booking is a request you confirm (see Known limits) |

---

## Part 1 — Database (do this first)

Open **Supabase → SQL Editor → New query** and run these files in this order.
Copy the whole file each time.

1. **`supabase/migrations/20261010120000_harden_row_level_security.sql`**
   Closes the open database. Right now anyone with your Supabase URL can read
   guest names/emails and even write to reservations. This file enables RLS on
   every table, removes any leftover permissive policy, recreates the intended
   policies, and revokes anonymous write privileges. It also creates the
   admin-only `private_property_details` table for the exact address and
   guest-contact phone.
   *Check:* the two queries at the end of the file — every table must show
   `rowsecurity = true`.

2. **`supabase/scripts/cleanup_demo_data.sql`**
   Deletes the seeded demo bookings, demo guests ("Emma Robertson", …), the 6
   placeholder reviews, and the two demo availability blocks. Those bookings
   are currently blocking real dates.
   *Check:* run the preview query (section 0) first if you want to see counts.

3. **`supabase/scripts/set_bella_famiglia_content.sql`**
   Replaces the sample property/house copy and amenities with the supplied
   Bella Famiglia listing details. It also fills the new listing, guest FAQ,
   arrival/departure, policy, and nearby-place fields shown on the public pages
   and editable under Admin → Settings. The map link is approximate; the exact
   street address is not stored in the publicly readable settings table.
   *Check:* review the verification queries at the end of the script.

4. **`supabase/migrations/20261010140000_booking_notification_log.sql`**
   Creates the booking-email delivery log. Optional but recommended — it is
   what powers the “Booking emails” panel (history + resend) on Admin →
   Reservations. If you skip it, the panel simply shows no history.

5. **Verify the public site still works** — `npm run dev`, then load the home
   page and a house page. Availability and booking must still work (they run
   through `SECURITY DEFINER` functions, which are unaffected by RLS).

> Do **not** run `setup.sql` or the older migrations again — they use
> `CREATE TABLE IF NOT EXISTS` and will not repair anything, and step 2's
> inserts would restore the demo data you just removed.

---

## Part 2 — Booking emails (host alert + guest confirmation)

The site promises "we'll confirm within 24 hours". Right now no email is sent.
This adds two emails automatically:

* new request → **you** get an alert, the guest gets "we received your request"
* you set a reservation to **CONFIRMED** in the admin panel → the guest gets the confirmation, including the private address and phone entered under Admin → Settings

The guest confirmation is deliberately skipped and logged as `skipped` until
both private contact fields are filled in Admin → Settings. The exact address
is stored in an admin-only table, never in the public settings API.

Emails go out through [Resend](https://resend.com) (simple REST API, free tier).

### 2a. Get a Resend API key
1. Create an account at <https://resend.com>.
2. Verify your sending domain (Resend → Domains) — or use their test sender
   while you trial it.
3. Create an API key at <https://resend.com/api-keys>.

### 2b. Deploy the Edge Functions
```bash
npm i -g supabase          # once
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Sends the automatic emails (called by the database webhook).
supabase functions deploy notify-booking --no-verify-jwt

# Lets you re-send an email from the admin panel. Keep JWT verification ON
# (no flag) so only signed-in admins can call it.
supabase functions deploy resend-booking-notification

supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  EMAIL_FROM="Bella Famiglia <stay@yourdomain.com>" \
  WEBHOOK_SECRET=pick-a-long-random-string
# optional: NOTIFY_EMAIL=you@yourdomain.com   (defaults to Admin → Settings → contact_email)
```
`--no-verify-jwt` is required on `notify-booking` because the database webhook
has no user JWT — that function authenticates the caller with `WEBHOOK_SECRET`
instead. `resend-booking-notification` is called from the browser with the
admin's session, so it keeps JWT verification.

### 2c. Wire the webhooks
Open `supabase/migrations/20261010123000_booking_notification_webhooks.sql`,
replace `YOUR_PROJECT_REF` and `YOUR_WEBHOOK_SECRET`, and run it in the SQL
Editor. It uses the built-in `pg_net` extension, so it works in pure SQL — no
`supabase_functions` schema required. The final query should list both
triggers (`notify_booking_on_insert`, `notify_booking_on_update`).

*Troubleshooting:* a 4xx/5xx from the function shows up in
`select * from net._http_response order by created desc limit 5;`. If nothing
appears there at all, confirm the function is deployed and that
`YOUR_PROJECT_REF` in the file matches your project.

### 2d. Test it
Submit a real booking request on the site. You should receive the host alert
within seconds; the guest address you used gets the acknowledgement. Then set
that reservation to `CONFIRMED` in Admin → Reservations and the guest should
receive the confirmation email.

**No need to dig through logs:** open Admin → Reservations, click the ✉ icon on
that booking, and you get the full delivery history — every attempt with
`sent` / `failed` / `skipped`, the recipient, and the provider's actual reply.
Three buttons there re-send the host alert, the acknowledgement, or the
confirmation on demand (e.g. when a guest says it never arrived).

If nothing arrives: that panel shows the reason (`skipped` = email is not
configured yet), and **Dashboard → Edge Functions → notify-booking → Logs**
has the server-side detail.

---

## Part 3 — Replace the placeholder content

These are all editable in **Admin → Settings** and **Admin → Houses**; no code
changes needed. In brackets is what is in the database today.

- **Airbnb listing URL** — per house, Admin → Houses → *Edit details*
  (currently `PLACEHOLDER_HOUSE_01` / `PLACEHOLDER_HOUSE_02`). Until you set a
  real link, the code now hides every "Book on Airbnb" button instead of
  showing a dead one.
- **Airbnb profile URL** — Admin → Settings (currently `PLACEHOLDER`).
  Also hidden until real.
- **WhatsApp number + contact email + phone** (currently `+250700000000`,
  `stay@maisonprivee.rw`). Everything contact-related reads these.
- **Host name** (currently "Your Host").
- **Photos** — all 17 images are stock Pexels photos. Replace them with real
  ones via Admin → Houses → *Gallery & amenities*, and delete the stock ones.
  Two images are still stored inline as data URLs from before the storage
  bucket existed; re-uploading them moves them into Supabase Storage.
- **Reviews** — the 6 seeded ones are removed by the Part 1 cleanup. Add your
  real Airbnb guests in Admin → Reviews (the home page hides the section while
  there are none).
- **House rules, cancellation policy, check-in/out times, location wording** —
  Admin → Settings (current text is generic seed copy).
- **Listing details and guest questions** — Admin → Settings → Listing Details
  & Guest Questions; policy windows and nearby distances are also editable
  there. Enter the confirmed bed description and actual contact details here
  when available. Placeholder contact values are hidden from public links.
- **Nightly rate** — set the actual rate in Admin → Houses before enabling
  “Show Public Price” in Admin → Settings. Public prices remain hidden until
  then because the database still contains the demo rate.
- **Admin users** — Supabase → Authentication → Users, and turn off public
  sign-ups (Authentication → Providers → Email → *Enable sign-ups* off) so only
  you can create admin accounts.

---

## Part 4 — Put it on the internet

The app is a static SPA (React + Vite). Any static host works; it needs the two
Supabase variables at **build** time.

**Recommended: Netlify** (free tier permits commercial use within its limits;
Vercel's free Hobby plan explicitly forbids commercial projects, and a guest
house counts as commercial).

```bash
npm run build            # outputs to dist/
```
Netlify → *Add new site* → import the repo (or drag `dist/`), then:
- Build command `npm run build`, publish directory `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (Supabase → Settings → API — the **anon/public** key only)
- SPA routing is already handled by `public/_redirects` (copied into `dist/`)

Alternatives: **Cloudflare Pages** (same settings, also uses `_redirects`), or
**Vercel** with `vercel.json` (already in the repo) — Vercel only on the paid
Pro plan for a business.

> The anon key is designed to be public. **Never** put the Supabase
> `service_role` key in the frontend or in `.env` variables prefixed with
> `VITE_` — the Edge Function gets its own copy automatically.

---

## Part 5 — Verify after deploying

Do these on the live URL, not localhost:

1. Home page lists both houses; each "Explore the House" link opens its own page.
2. Pick dates → *Check Availability* returns available/unavailable correctly.
3. Submit a booking request → success message, and the request appears in
   Admin → Reservations as `PENDING`.
4. The host alert email arrives (and the guest acknowledgement).
5. `CONFIRMED` on that reservation → guest confirmation email arrives.
5b. Click the ✉ icon on that reservation — all three emails should be listed as
   `sent` to the right addresses. If any says `skipped`, the provider isn't
   configured; `failed` shows the provider's error text inline.
6. Open the live site in an incognito window and check the browser console has
   no errors. Links like `/houses/the-house` must also work when opened directly
   (that is what the SPA rewrite in Part 4 is for).
7. Sign in to the admin panel on the live domain.
8. Re-run the security probe: in the incognito window's console (or any REST
   client) with the anon key, `guests` and `reservations` must return **empty /
   permission denied** after Part 1.

---

## Known limits (by design, listed so nothing is a surprise)

- **No payment collection.** A booking is a request; you confirm it manually.
  Guests pay on arrival or through Airbnb. Adding card payments (Stripe) is a
  separate project.
- **Availability reflects only what is in the system.** Keep Airbnb bookings
  entered in Admin → Reservations, and the checker will keep direct guests away
  from those nights. There is no two-way Airbnb sync.
- **Double-booking is prevented** inside the database (`create_booking` locks
  the house row and re-checks availability in the same transaction).
- **`price_rules` (weekend/seasonal pricing) exist in the schema but are not
  wired up** — every stay is quoted at the house's base price.
- **Single language, single currency per house** (USD in the data today).
- **No automated cancellation/refund flow** — handle changes in the admin panel.
