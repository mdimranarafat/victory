/* VICTORY SPORTS ARENA — admin dashboard logic */

/* ---------------------------------------------------------- demo state
   In demo mode there's no real backend, so CRUD actions mutate these
   in-memory arrays instead — enough to preview the admin UX before a
   Firebase project is connected. Nothing here is written anywhere. */
let facilities = [
  { id: 'football-turf', name: 'Football / Futsal Turf', sport: 'Football & Futsal', description: 'FIFA-certified 50mm infill grass.', capacity: '', hours: '', active: true },
  { id: 'cricket', name: 'Cricket', sport: 'Cricket', description: 'Dedicated cricket sessions.', capacity: '', hours: '', active: true },
];
let pricingRules = [];
let bookings = [
  { id: 'demo-1', customerName: 'Rakib Hasan', phone: '+8801XXXXXXXXX', facilityId: 'football-turf', facilityName: 'Football / Futsal Turf', date: new Date().toISOString().slice(0,10), startTime: '19:00', duration: 60, price: null, status: 'pending' },
];
let events = [
  { id: 'demo-ev-1', name: 'BKS Tournament', sport: 'Football / Futsal', date: '2025-10-01', description: 'Tournament held at Victory Sports Arena.', status: 'Completed' },
];
let settings = { phone: '+8801601669203', address: 'Ful Chowdhury Para, North Halishahar, Chattogram 4216, Bangladesh', facebook: 'https://www.facebook.com/victorysportarena/', hero: 'Your destination for football, cricket, futsal and unforgettable sports experiences in Chattogram.' };

function newId(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

/* ------------------------------------------------------------ auth gate */
const loginScreen = document.getElementById('loginScreen');
const dashboardShell = document.getElementById('dashboardShell');

if (DEMO_MODE) {
  document.getElementById('demoLoginNote').style.display = 'block';
  document.getElementById('demoEnterBtn').style.display = 'inline-flex';
  document.getElementById('demoEnterBtn').addEventListener('click', enterDashboard);
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('loginError').textContent = 'Connect Firebase to enable real sign-in — use "Preview Dashboard" below for now.';
    document.getElementById('loginError').classList.add('show');
  });
} else {
  auth.onAuthStateChanged((user) => { if (user) enterDashboard(user); });
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('li-email').value;
    const password = document.getElementById('li-password').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      document.getElementById('loginError').textContent = 'Incorrect email or password.';
      document.getElementById('loginError').classList.add('show');
    } finally {
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
  document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut().then(() => location.reload()));
}

if (DEMO_MODE) {
  document.getElementById('logoutBtn').addEventListener('click', () => location.reload());
}

async function enterDashboard(user) {
  loginScreen.style.display = 'none';
  dashboardShell.style.display = 'flex';
  document.getElementById('userEmail').textContent = user ? user.email : 'Demo preview (not signed in)';
  await loadAdminData();
  renderAll();
}

/* --------------------------------------------------------------- nav */
document.getElementById('sidebarNav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-panel]');
  if (!btn) return;
  [...document.querySelectorAll('.sidebar-nav button')].forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  [...document.querySelectorAll('.panel')].forEach((p) => p.classList.remove('active'));
  document.getElementById(btn.dataset.panel).classList.add('active');
  document.getElementById('topbarTitle').textContent = btn.textContent.replace('◆', '').trim();
});

/* ---------------------------------------------------------- data load */
async function loadAdminData() {
  if (DEMO_MODE) return; // in-memory demo arrays above are already populated
  const [facSnap, ruleSnap, bookSnap, evSnap, settingsSnap] = await Promise.all([
    db.collection(COLLECTIONS.facilities).get(),
    db.collection(COLLECTIONS.pricingRules).get(),
    db.collection(COLLECTIONS.bookings).orderBy('createdAt', 'desc').get(),
    db.collection(COLLECTIONS.events).orderBy('date', 'desc').get(),
    db.collection(COLLECTIONS.settings).doc('site').get(),
  ]);
  facilities = facSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  pricingRules = ruleSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  bookings = bookSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (settingsSnap.exists) settings = settingsSnap.data();
}

function renderAll() {
  renderDashboardStats();
  renderBookings();
  renderFacilities();
  renderPricing();
  renderEvents();
  renderSettingsForm();
  populatePricingFacilitySelect();
}

/* -------------------------------------------------------------- stats */
function renderDashboardStats() {
  document.getElementById('statPending').textContent = bookings.filter((b) => b.status === 'pending').length;
  document.getElementById('statConfirmed').textContent = bookings.filter((b) => b.status === 'confirmed').length;
  document.getElementById('statFacilities').textContent = facilities.filter((f) => f.active).length;
  document.getElementById('statEvents').textContent = events.length;

  const tbody = document.querySelector('#recentBookingsTable tbody');
  const recent = bookings.slice(0, 5);
  tbody.innerHTML = recent.length ? recent.map((b) => `
    <tr>
      <td>${b.customerName}</td>
      <td>${b.facilityName || ''}</td>
      <td>${b.date}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
    </tr>`).join('') : `<tr><td colspan="4" style="color:var(--text-muted);">No bookings yet.</td></tr>`;
}

/* ----------------------------------------------------------- bookings */
function renderBookings() {
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = bookings.length ? bookings.map((b) => `
    <tr>
      <td>${b.customerName}</td>
      <td>${b.phone}</td>
      <td>${b.facilityName || ''}</td>
      <td>${b.date} · ${b.startTime} (${b.duration}min)</td>
      <td>${b.price != null ? window.PricingEngine.formatBDT(b.price) : 'Contact for pricing'}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td class="actions">
        ${b.status === 'pending' ? `
          <button class="mini-btn approve" data-action="approve" data-id="${b.id}">Approve</button>
          <button class="mini-btn reject" data-action="reject" data-id="${b.id}">Reject</button>` : ''}
        ${b.status !== 'cancelled' ? `<button class="mini-btn" data-action="cancel" data-id="${b.id}">Cancel</button>` : ''}
      </td>
    </tr>`).join('') : `<tr><td colspan="7" style="color:var(--text-muted);">No bookings yet.</td></tr>`;
}

document.querySelector('#bookingsTable tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const statusMap = { approve: 'confirmed', reject: 'rejected', cancel: 'cancelled' };
  const newStatus = statusMap[btn.dataset.action];
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;
  booking.status = newStatus;
  if (!DEMO_MODE) await db.collection(COLLECTIONS.bookings).doc(id).update({ status: newStatus });
  renderBookings();
  renderDashboardStats();
});

/* --------------------------------------------------------- facilities */
function renderFacilities() {
  const tbody = document.querySelector('#facilitiesTable tbody');
  tbody.innerHTML = facilities.length ? facilities.map((f) => `
    <tr>
      <td>${f.name}</td>
      <td>${f.sport || ''}</td>
      <td><span class="badge badge-${f.active ? 'active' : 'inactive'}">${f.active ? 'Active' : 'Inactive'}</span></td>
      <td class="actions">
        <button class="mini-btn" data-action="edit-facility" data-id="${f.id}">Edit</button>
        <button class="mini-btn reject" data-action="delete-facility" data-id="${f.id}">Delete</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="4" style="color:var(--text-muted);">No facilities yet — add your first one.</td></tr>`;
}

const facilityModal = document.getElementById('facilityModal');
document.getElementById('addFacilityBtn').addEventListener('click', () => openFacilityModal());
document.querySelector('#facilitiesTable tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const f = facilities.find((x) => x.id === btn.dataset.id);
  if (btn.dataset.action === 'edit-facility') openFacilityModal(f);
  if (btn.dataset.action === 'delete-facility') {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    facilities = facilities.filter((x) => x.id !== f.id);
    if (!DEMO_MODE) await db.collection(COLLECTIONS.facilities).doc(f.id).delete();
    renderFacilities(); renderDashboardStats(); populatePricingFacilitySelect();
  }
});
function openFacilityModal(f) {
  document.getElementById('facilityModalTitle').textContent = f ? 'Edit Facility' : 'Add Facility';
  document.getElementById('fm-id').value = f ? f.id : '';
  document.getElementById('fm-name').value = f ? f.name : '';
  document.getElementById('fm-sport').value = f ? f.sport : '';
  document.getElementById('fm-description').value = f ? (f.description || '') : '';
  document.getElementById('fm-capacity').value = f ? (f.capacity || '') : '';
  document.getElementById('fm-hours').value = f ? (f.hours || '') : '';
  document.getElementById('fm-active').value = f ? String(f.active) : 'true';
  facilityModal.classList.add('open');
}
document.getElementById('facilityForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('fm-id').value || newId('facility');
  const data = {
    name: document.getElementById('fm-name').value,
    sport: document.getElementById('fm-sport').value,
    description: document.getElementById('fm-description').value,
    capacity: document.getElementById('fm-capacity').value,
    hours: document.getElementById('fm-hours').value,
    active: document.getElementById('fm-active').value === 'true',
  };
  const existingIdx = facilities.findIndex((f) => f.id === id);
  if (existingIdx >= 0) facilities[existingIdx] = { ...facilities[existingIdx], ...data };
  else facilities.push({ id, ...data });
  if (!DEMO_MODE) await db.collection(COLLECTIONS.facilities).doc(id).set(data, { merge: true });
  facilityModal.classList.remove('open');
  renderFacilities(); renderDashboardStats(); populatePricingFacilitySelect();
});

/* ------------------------------------------------------------ pricing */
function populatePricingFacilitySelect() {
  document.getElementById('pm-facility').innerHTML = facilities.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
}
function renderPricing() {
  const tbody = document.querySelector('#pricingTable tbody');
  tbody.innerHTML = pricingRules.length ? pricingRules.map((r) => {
    const facility = facilities.find((f) => f.id === r.facilityId);
    return `
    <tr>
      <td>${facility ? facility.name : r.facilityId}</td>
      <td>${r.dayType}</td>
      <td>${r.startTime}–${r.endTime}</td>
      <td>${r.duration} min</td>
      <td>${window.PricingEngine.formatBDT(r.price)}</td>
      <td>${r.weekendPrice != null ? window.PricingEngine.formatBDT(r.weekendPrice) : '—'}</td>
      <td><span class="badge badge-${r.active ? 'active' : 'inactive'}">${r.active ? 'Active' : 'Inactive'}</span></td>
      <td class="actions">
        <button class="mini-btn" data-action="edit-pricing" data-id="${r.id}">Edit</button>
        <button class="mini-btn reject" data-action="delete-pricing" data-id="${r.id}">Delete</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" style="color:var(--text-muted);">No pricing rules yet — the public site will show "Contact for pricing" until rules are added.</td></tr>`;
}
const pricingModal = document.getElementById('pricingModal');
document.getElementById('addPricingBtn').addEventListener('click', () => openPricingModal());
document.querySelector('#pricingTable tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const r = pricingRules.find((x) => x.id === btn.dataset.id);
  if (btn.dataset.action === 'edit-pricing') openPricingModal(r);
  if (btn.dataset.action === 'delete-pricing') {
    if (!confirm('Delete this pricing rule?')) return;
    pricingRules = pricingRules.filter((x) => x.id !== r.id);
    if (!DEMO_MODE) await db.collection(COLLECTIONS.pricingRules).doc(r.id).delete();
    renderPricing();
  }
});
function openPricingModal(r) {
  document.getElementById('pm-id').value = r ? r.id : '';
  document.getElementById('pm-facility').value = r ? r.facilityId : (facilities[0] ? facilities[0].id : '');
  document.getElementById('pm-daytype').value = r ? r.dayType : 'all';
  document.getElementById('pm-start').value = r ? r.startTime : '';
  document.getElementById('pm-end').value = r ? r.endTime : '';
  document.getElementById('pm-duration').value = r ? r.duration : '60';
  document.getElementById('pm-price').value = r ? r.price : '';
  document.getElementById('pm-weekend').value = r && r.weekendPrice != null ? r.weekendPrice : '';
  document.getElementById('pm-special').value = r && r.specialPrice != null ? r.specialPrice : '';
  document.getElementById('pm-active').value = r ? String(r.active) : 'true';
  pricingModal.classList.add('open');
}
document.getElementById('pricingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pm-id').value || newId('rule');
  const data = {
    facilityId: document.getElementById('pm-facility').value,
    dayType: document.getElementById('pm-daytype').value,
    startTime: document.getElementById('pm-start').value,
    endTime: document.getElementById('pm-end').value,
    duration: Number(document.getElementById('pm-duration').value),
    price: Number(document.getElementById('pm-price').value),
    weekendPrice: document.getElementById('pm-weekend').value ? Number(document.getElementById('pm-weekend').value) : null,
    specialPrice: document.getElementById('pm-special').value ? Number(document.getElementById('pm-special').value) : null,
    active: document.getElementById('pm-active').value === 'true',
  };
  const idx = pricingRules.findIndex((r) => r.id === id);
  if (idx >= 0) pricingRules[idx] = { ...pricingRules[idx], ...data };
  else pricingRules.push({ id, ...data });
  if (!DEMO_MODE) await db.collection(COLLECTIONS.pricingRules).doc(id).set(data, { merge: true });
  pricingModal.classList.remove('open');
  renderPricing();
});

/* -------------------------------------------------------------- events */
function renderEvents() {
  const tbody = document.querySelector('#eventsTable tbody');
  tbody.innerHTML = events.length ? events.map((ev) => `
    <tr>
      <td>${ev.name}</td>
      <td>${ev.sport || ''}</td>
      <td>${ev.date}</td>
      <td>${ev.status}</td>
      <td class="actions">
        <button class="mini-btn" data-action="edit-event" data-id="${ev.id}">Edit</button>
        <button class="mini-btn reject" data-action="delete-event" data-id="${ev.id}">Delete</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="5" style="color:var(--text-muted);">No events yet.</td></tr>`;
}
const eventModal = document.getElementById('eventModal');
document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
document.querySelector('#eventsTable tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const ev = events.find((x) => x.id === btn.dataset.id);
  if (btn.dataset.action === 'edit-event') openEventModal(ev);
  if (btn.dataset.action === 'delete-event') {
    if (!confirm(`Delete "${ev.name}"?`)) return;
    events = events.filter((x) => x.id !== ev.id);
    if (!DEMO_MODE) await db.collection(COLLECTIONS.events).doc(ev.id).delete();
    renderEvents(); renderDashboardStats();
  }
});
function openEventModal(ev) {
  document.getElementById('em-id').value = ev ? ev.id : '';
  document.getElementById('em-name').value = ev ? ev.name : '';
  document.getElementById('em-sport').value = ev ? (ev.sport || '') : '';
  document.getElementById('em-date').value = ev ? ev.date : '';
  document.getElementById('em-time').value = ev ? (ev.time || '') : '';
  document.getElementById('em-description').value = ev ? (ev.description || '') : '';
  document.getElementById('em-registration').value = ev ? (ev.registration || '') : '';
  document.getElementById('em-status').value = ev ? ev.status : 'Upcoming';
  eventModal.classList.add('open');
}
document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('em-id').value || newId('event');
  const data = {
    name: document.getElementById('em-name').value,
    sport: document.getElementById('em-sport').value,
    date: document.getElementById('em-date').value,
    time: document.getElementById('em-time').value,
    description: document.getElementById('em-description').value,
    registration: document.getElementById('em-registration').value,
    status: document.getElementById('em-status').value,
  };
  const idx = events.findIndex((x) => x.id === id);
  if (idx >= 0) events[idx] = { ...events[idx], ...data };
  else events.push({ id, ...data });
  if (!DEMO_MODE) await db.collection(COLLECTIONS.events).doc(id).set(data, { merge: true });
  eventModal.classList.remove('open');
  renderEvents(); renderDashboardStats();
});

/* ------------------------------------------------------------ settings */
function renderSettingsForm() {
  document.getElementById('st-phone').value = settings.phone || '';
  document.getElementById('st-address').value = settings.address || '';
  document.getElementById('st-facebook').value = settings.facebook || '';
  document.getElementById('st-hero').value = settings.hero || '';
}
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  settings = {
    phone: document.getElementById('st-phone').value,
    address: document.getElementById('st-address').value,
    facebook: document.getElementById('st-facebook').value,
    hero: document.getElementById('st-hero').value,
  };
  if (!DEMO_MODE) await db.collection(COLLECTIONS.settings).doc('site').set(settings, { merge: true });
  const saved = document.getElementById('settingsSaved');
  saved.style.display = 'inline';
  setTimeout(() => (saved.style.display = 'none'), 2000);
});

/* ------------------------------------------------------------- modals */
document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.closeModal).classList.remove('open'));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});
