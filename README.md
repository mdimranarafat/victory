# Victory Sports Arena — Website, Admin Panel & Pricing Page

## Project overview

A complete, self-contained website for Victory Sports Arena (football,
cricket and futsal — North Halishahar, Chattogram): a public marketing +
booking site, a dedicated public pricing page, and a role-protected admin
dashboard for running the business day to day. There is no build step —
every file is plain HTML/CSS/JS that runs directly in the browser and
talks to Firebase for data, auth, and image storage.

Per the content brief, nothing about the business is invented anywhere in
the code — every fact (address, phone, turf spec, tournament history) is
either the verified value from Facebook, or an explicit "Contact for
pricing" / empty-state placeholder that only fills in once the Admin Panel
is used.

## Project structure

```text
/index.html     Public website — everything except pricing detail & admin
/admin.html     Admin dashboard (Firebase Auth + role-based access)
/pricing.html   Dedicated public pricing page
/README.md      This file
```

**No other files are required.** `index.html`, `admin.html` and
`pricing.html` are each fully self-contained: their CSS is inlined in a
`<style>` block and their JavaScript (shared core + page logic) is inlined
in `<script>` blocks. The only external resources loaded are the Firebase
SDK and Google Fonts, both from CDNs over HTTPS — nothing to install, no
bundler, no `node_modules`.

Because the three pages don't share a physical `.js`/`.css` file, the
shared core (Firebase init, pricing engine, conflict detection, demo
dataset) is duplicated inline in each page. This is intentional, per the
"only these files" requirement — it keeps every page independently
deployable and debuggable by viewing its own source, at the cost of that
duplication. If you'd rather de-duplicate into real shared `/css` and
`/js` files, that's a five-minute refactor (search each page for the
`/*__COMMON_...__*/`-style logic and split it out) — flagged here rather
than done silently, since it changes the file count you asked for.

## Technology

- HTML5 / CSS3 (custom properties, grid, flexbox) / vanilla JavaScript (ES2017+)
- Firebase Authentication (email/password) — admin & staff login
- Cloud Firestore — all business data (facilities, bookings, pricing, etc.)
- Firebase Storage — gallery image uploads
- Firebase JS SDK v10 (compat build, loaded via CDN — no bundler needed)

## Firebase setup

1. **Create a Firebase project** at https://console.firebase.google.com →
   *Add project* → follow the prompts (Google Analytics is optional).
2. **Enable Authentication**: *Build → Authentication → Get started →
   Sign-in method → Email/Password → Enable.*
3. **Enable Firestore**: *Build → Firestore Database → Create database* →
   start in **production mode** (security rules below lock it down
   properly) → choose a region close to Bangladesh (e.g. `asia-south1`).
4. **Enable Storage**: *Build → Storage → Get started* → same region.
5. **Add a web app**: *Project settings (gear icon) → General → Your apps
   → Add app → Web (`</>`)* → register with any nickname → copy the
   `firebaseConfig` object it shows you.
6. **Add the configuration**: open `index.html`, `admin.html`, and
   `pricing.html` — near the top of each page's inline `<script>` block
   you'll find:
   ```js
   const FIREBASE_CONFIG = {
     apiKey: "PASTE_API_KEY_HERE",
     authDomain: "PASTE_AUTH_DOMAIN_HERE",
     projectId: "PASTE_PROJECT_ID_HERE",
     storageBucket: "PASTE_STORAGE_BUCKET_HERE",
     messagingSenderId: "PASTE_SENDER_ID_HERE",
     appId: "PASTE_APP_ID_HERE",
   };
   ```
   Paste the same real values into **all three files** (each page
   initializes its own Firebase app instance). Until you do, every page
   runs in **demo mode** against an in-memory placeholder dataset — you'll
   see a "Demo mode" banner and, on `admin.html`, a "Preview Dashboard"
   button that bypasses login.
7. **Create the required collections** — nothing to do manually here;
   Firestore creates a collection automatically the first time a document
   is written to it (either by a customer submitting a booking, or by you
   using the Admin Panel). See the table below for what each one holds.
8. **Configure security rules** — see the "Security rules" section below
   before you go live. Rules are not optional: without them, anyone could
   write directly to your database.

## Collections

| Collection     | Written by                          | Purpose |
|----------------|--------------------------------------|---------|
| `users`        | Admin Panel → Users                  | `{ email, role }` docs keyed by Firebase Auth UID. `role` is `admin`, `manager`, or `staff`. |
| `facilities`   | Admin Panel → Facilities             | `{ name, sport, description, capacity, hours, active, images[] }` |
| `bookings`     | Public site (customers) + Admin Panel| `{ facilityId, facilityName, customerName, phone, date, startTime, duration, price, status, crossesMidnight, team, notes, createdAt }`. `status` is `pending` → `confirmed`/`rejected`/`cancelled`. |
| `customers`    | Public site (auto, on booking)       | Lightweight lookup keyed by phone digits: `{ name, phone, lastBookingAt }`. The Admin Panel's Customers tab actually derives its list live from `bookings` (so history is always accurate); this collection exists for any future integration that needs a customer index without reading all bookings. |
| `pricingRules` | Admin Panel → Pricing                | `{ label, facilityId, dayType, startTime, endTime, duration, price, weekendPrice, specialPrice, active }` |
| `offers`       | Admin Panel → Offers                 | `{ title, description, active }` — shown on `pricing.html` |
| `events`       | Admin Panel → Events                 | `{ name, sport, date, time, description, registration, status, published }` |
| `gallery`      | Admin Panel → Gallery                | `{ url, title, category, active, storagePath }` — `url` points at a Storage file |
| `settings`     | Admin Panel → Settings               | Single doc `settings/site`: `{ phone, address, facebook, hours, hero }` |
| `notifications`| *(reserved, not yet written to)*     | Intended for future SMS/WhatsApp/email confirmation hooks — see "Content still needed" below; no code writes here yet, so nothing to configure until that's built. |

### Security rules

Paste this into *Firestore → Rules* as a starting point, then adjust to
taste. It lets anyone read public content and submit a booking, but only
signed-in staff (with a `users/{uid}` doc) can write anything else:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isStaff() { return request.auth != null && exists(/databases/$(database)/documents/users/$(request.auth.uid)); }

    match /facilities/{id}   { allow read: if true; allow write: if isStaff(); }
    match /pricingRules/{id} { allow read: if true; allow write: if isStaff(); }
    match /offers/{id}       { allow read: if true; allow write: if isStaff(); }
    match /events/{id}       { allow read: if true; allow write: if isStaff(); }
    match /gallery/{id}      { allow read: if true; allow write: if isStaff(); }
    match /settings/{id}     { allow read: if true; allow write: if isStaff(); }
    match /users/{id}        { allow read: if isStaff(); allow write: if isStaff(); }
    match /customers/{id}    { allow read: if isStaff(); allow write: if true; } // customers upsert their own record on booking
    match /bookings/{id} {
      allow read: if isStaff();
      allow create: if true;   // anyone can submit a booking request
      allow update, delete: if isStaff();
    }
  }
}
```

And for Storage (*Storage → Rules*):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /gallery/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Admin setup — creating the first admin user

The Admin Panel's own "+ Add User" button needs an existing admin to be
signed in already, so the very first admin has to be created manually:

1. In Firebase Console → *Authentication → Users → Add user* — enter an
   email and password.
2. Copy that user's **UID** from the users list.
3. In Firestore → *Start collection* → collection ID `users` → document ID
   = the UID you copied → add fields `email` (string, matching what you
   entered) and `role` (string) = `admin`.
4. Open `admin.html` and sign in with that email/password — you now have
   full access, including the Users tab to add staff/managers going
   forward (which does this step for you automatically).

## Environment / configuration

- Firebase **web app config** (the object with `apiKey`, `projectId`,
  etc.) is safe to embed directly in client-side code — it identifies
  your project, it does not grant access by itself. That's why it's
  pasted straight into the three HTML files rather than hidden in an
  environment variable.
- **Never** put a Firebase **Admin SDK service-account key** (a private
  JSON credential with full server-side access) anywhere in these files
  or in any client-facing code. This project never needs one — everything
  here uses the client SDK, gated by the security rules above.

## What's fully implemented

- **`index.html`** — hero, facilities, FIFA-certified turf highlight,
  why-Victory, booking CTA, about, events & tournaments, gallery,
  location, contact, footer. Booking flow: facility → date → 30-minute-
  increment time slot → duration → live price preview → live conflict
  check → submit as `pending` (never auto-confirmed). Booking conflicts
  are re-checked server-side in a Firestore transaction at submit time
  (not just client-side) to prevent a race between two customers booking
  the same slot.
- **`pricing.html`** — every active facility gets its own rate table
  (applies-to / time window / duration / price / weekend / special),
  pulled live from `pricingRules`; facilities or windows with no rule show
  "Contact for pricing" rather than a guess. Active offers render below.
- **`admin.html`**:
  - **Dashboard** — total/pending/confirmed/today's bookings, revenue
    (sum of confirmed bookings' prices), per-facility stats, recent
    requests.
  - **Bookings** — search (name/phone), filter (status/facility/date),
    approve/reject/cancel, edit, manual booking creation, full details
    view. Every create/edit runs the same overlap check as the public
    site: `newStart < existingEnd && newEnd > existingStart`, correctly
    handling bookings that cross midnight (end time rolls to the next
    calendar day) and treating each facility's availability independently.
  - **Calendar** — Month (grid with per-day booking counts, click a day
    to jump to Day view), Week (7-day columns), Day (chronological list)
    — all computed from the same `bookings` data, no separate store.
  - **Facilities** — add/edit/delete/activate-deactivate.
  - **Pricing** — add/edit/delete rules with an optional label (so you
    can name a rule "Peak Hours" / "Night Rate" / "Off-Peak" etc.),
    day-type (all/weekday/weekend), time window, duration, base price,
    weekend override, special/holiday override, active flag.
  - **Offers** — add/edit/delete promotional offers shown on the pricing page.
  - **Events** — add/edit/delete tournaments, plus a separate
    publish/unpublish toggle from the status field (so a completed event
    can stay `Completed` but be unpublished from the site without losing
    its record).
  - **Gallery** — upload to Firebase Storage with title + category, hide/
    show, delete (also removes the Storage file).
  - **Customers** — derived live from booking history (no risk of it
    drifting out of sync), searchable, with a per-customer booking-history
    modal.
  - **Users** — Admin-only. Add a staff/manager/admin user (creates the
    Firebase Auth account on a secondary, throwaway app instance so the
    signed-in admin's own session is never disturbed) and remove a user's
    role (their login still exists in Firebase Auth; this only revokes
    their `users/{uid}` role doc, matching how "Remove access" should
    behave without deleting their account outright).
  - **Settings** — phone, address, Facebook URL, opening hours, hero
    supporting text — all editable here, never hardcoded.
  - **Roles**: `admin` sees everything. `manager` sees everything except
    Users. `staff` sees Dashboard, Bookings and Calendar only. The sidebar
    hides tabs a role can't access; this is enforced again by the
    Firestore rules above so it isn't just a UI-level restriction.

## Booking conflict logic

```js
newStart < existingEnd && newEnd > existingStart
```

`startTime` is combined with `date` into a real `Date`, and `endTime` is
derived by adding the duration in minutes — so a 23:30 start with a
90-minute duration correctly produces an end time on the next calendar
day, and the overlap check above still catches conflicts against it (or
against a booking that starts just after midnight). Facilities are
compared independently — a conflict on the football turf never blocks a
cricket booking at the same time.

## Content still needed from Victory Sports Arena management

Nothing below is guessed anywhere in the code — these stay as "Contact for
pricing" / empty states / editable-blank fields in the Admin Panel until
confirmed: exact facility names & count, turf/pitch sizes, current opening
hours, exact booking durations, current prices (incl. weekend/night/
holiday), WhatsApp number, email address, exact Google Maps pin, logo &
brand colors (the site currently uses the brief's suggested dark navy /
electric green), high-resolution facility photos, cancellation & refund
policy, whether advance/online payment is required, whether tournament
registration should happen through the site, SMS/WhatsApp booking
confirmations (the `notifications` collection above is reserved for this),
and opening date/history.

## Deployment

### Firebase Hosting (recommended — same project as your data)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # choose your existing project; public dir = "." ; single-page app = No
firebase deploy
```

### Netlify / Vercel

Drag-and-drop the three files (or connect the repo) — both platforms serve
static files with zero configuration. No build command is needed since
there's no build step.

### GitHub Pages

Push `index.html`, `admin.html`, `pricing.html` to a repo, then *Settings
→ Pages → Deploy from branch* (`main`, root). Firebase Authentication:
add your `<username>.github.io` domain under *Authentication → Settings →
Authorized domains* so login isn't blocked.

Whichever host you choose, the Firebase config pasted into the three HTML
files is what connects the static site to your backend — hosting choice
and Firebase project are independent decisions.
