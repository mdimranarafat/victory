# Victory Sports Arena — Website & Admin Panel

Public site + admin dashboard for Victory Sports Arena (football, cricket &
futsal — North Halishahar, Chattogram). Plain HTML/CSS/JS, no build step,
so it can be hosted directly (GitHub Pages, Firebase Hosting, etc.) and
connects to Firebase for data + auth, matching the Frenzy Arena setup.

## File structure

```
victory-sports-arena/
├── index.html          Public site (hero, facilities, why-victory, booking
│                        CTA, sports experience/turf highlight, events,
│                        gallery, location, contact, footer)
├── admin.html           Admin dashboard shell (login + sidebar + panels)
├── css/
│   ├── style.css         Design tokens + all public-site styling
│   └── admin.css          Admin layout (sidebar, tables, modals)
├── js/
│   ├── firebase-config.js  Firebase project config + DEMO_MODE switch
│   ├── pricing.js           Shared dynamic-pricing engine (index + admin)
│   ├── main.js                Public site: loads content, booking modal
│   └── admin.js                 Admin dashboard: auth gate + CRUD panels
└── README.md
```

## 1. Connect Firebase

1. Create (or open) your Firebase project.
2. Enable **Firestore**, **Authentication → Email/Password**, and
   **Storage** (for gallery images, once that panel is built out).
3. Copy the web app config from *Project settings → General → Your apps*
   and paste it into `js/firebase-config.js`, replacing the
   `PASTE_..._HERE` placeholders.
4. Create at least one admin user under *Authentication → Users* — that
   email/password is what signs into `admin.html`.

Until real config is pasted in, both pages run in **demo mode**: the
public site shows placeholder content and a "Demo mode" banner, and the
admin panel offers a "Preview Dashboard" button that bypasses login and
edits in-memory data only (nothing is saved).

## 2. Firestore collections

Created automatically on first write — nothing to pre-create in the
console:

| Collection     | Purpose |
|----------------|---------|
| `facilities`   | One doc per bookable facility |
| `pricingRules` | Facility + day-type + time-window + price rules |
| `bookings`     | Booking requests (`status`: pending/confirmed/rejected/cancelled) |
| `events`       | Tournaments & events |
| `gallery`      | Gallery image metadata (files in Storage) |
| `settings`     | Single doc `site` — phone, address, Facebook link, hero text |
| `users`        | Reserved for staff roles once multi-admin access is built |

## 3. What's fully implemented

- **Public site** — all ten homepage sections from the brief, pulling
  facilities/events/gallery/settings from Firestore live, with graceful
  "Contact for pricing" / empty-state copy instead of ever inventing data.
- **Booking flow** — facility → date → time → duration → live price
  preview → request submitted as `status: pending` (never auto-confirmed).
- **Admin → Dashboard** — pending/confirmed/facility/event counts, recent
  bookings.
- **Admin → Bookings** — approve / reject / cancel requests.
- **Admin → Facilities** — add / edit / delete / activate-deactivate.
- **Admin → Pricing** — add / edit / delete rules (day type, time window,
  duration, base/weekend/special price, active flag); the public site's
  displayed price is always calculated live from these rules
  (`js/pricing.js`), never hardcoded.
- **Admin → Events** — add / edit / delete tournaments & events.
- **Admin → Settings** — phone, address, Facebook link and hero text are
  editable here rather than hardcoded, per the brief's requirement that
  contact info stay admin-managed.

## 4. Stubbed for a later pass

These have nav entries and a "coming soon" panel, ready to build out once
you confirm priority: **Calendar** view, **Offers**/promo codes, **Gallery**
image upload (Storage), **Customers** directory, and **Staff Users**
(role-based access beyond a single admin login).

## 5. Content still needed from Victory management

Per the brief, nothing below is guessed — placeholders stay in place in
the Admin Panel until these are confirmed:

Exact facility names & count · turf/pitch sizes · current opening hours ·
exact booking durations · current prices (incl. weekend/night/holiday) ·
WhatsApp number · email address · exact Google Maps pin · logo & brand
colors (site currently uses the brief's suggested dark navy / electric
green) · high-res facility photos · cancellation & refund policy · whether
advance payment or online payment is required · whether tournament
registration should happen through the site · SMS/WhatsApp confirmations ·
opening date/history.

## 6. Deploying

Static hosting works as-is — e.g. for GitHub Pages, push this folder to a
repo and enable Pages on the `main` branch (or `/docs`). Firestore Security
Rules should be added before going live so only authenticated admin users
can write to `facilities`, `pricingRules`, `events`, `settings`, and can
update (but the public can still *create*) `bookings`.
