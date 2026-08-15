/**
 * VICTORY SPORTS ARENA — Firebase configuration
 * ------------------------------------------------
 * Paste the config object from your Firebase project settings
 * (Project settings → General → Your apps → SDK setup and configuration)
 * into FIREBASE_CONFIG below. Everything else in this file works
 * automatically once that object is filled in.
 *
 * Until real values are pasted in, the site runs in DEMO MODE:
 * pages render with placeholder content instead of talking to Firestore,
 * so the layout can be reviewed before the backend is connected.
 */

const FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_AUTH_DOMAIN_HERE",
  projectId: "PASTE_PROJECT_ID_HERE",
  storageBucket: "PASTE_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_SENDER_ID_HERE",
  appId: "PASTE_APP_ID_HERE",
};

// DEMO_MODE is true whenever the config above still has placeholder values.
const DEMO_MODE = Object.values(FIREBASE_CONFIG).some((v) =>
  String(v).startsWith("PASTE_")
);

let db = null;
let auth = null;
let storage = null;

if (!DEMO_MODE) {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
  storage = firebase.storage();
}

/**
 * Firestore collections used across the site (created on first write —
 * nothing needs to be pre-created in the Firebase console):
 *
 *  facilities   — one doc per bookable facility (football turf, cricket, futsal…)
 *  pricingRules — one doc per pricing rule (facility + day + time window + price)
 *  bookings     — one doc per booking request (status: pending/confirmed/rejected/cancelled)
 *  events       — tournaments & events
 *  gallery      — gallery images (metadata; files live in Storage)
 *  settings     — single doc "site" holding phone, address, hours, hero text, social links
 *  users        — admin/staff accounts and roles (keyed by Firebase Auth uid)
 */
const COLLECTIONS = {
  facilities: "facilities",
  pricingRules: "pricingRules",
  bookings: "bookings",
  events: "events",
  gallery: "gallery",
  settings: "settings",
  users: "users",
};
