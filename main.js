/* VICTORY SPORTS ARENA — public site logic */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------- demo content
   Used only while js/firebase-config.js still has placeholder values, so
   the layout can be reviewed before the real backend is connected.
   Every field here matches the verified content brief — nothing invented. */
const DEMO_FACILITIES = [
  {
    id: 'football-turf',
    name: 'Football / Futsal Turf',
    sport: 'Football & Futsal',
    description: 'FIFA-certified 50mm infill grass, renovated for a professional-quality playing surface.',
    features: ['FIFA-certified 50mm infill grass'],
    active: true,
  },
  {
    id: 'cricket',
    name: 'Cricket',
    sport: 'Cricket',
    description: 'Enjoy competitive cricket sessions in a dedicated sports environment at Victory Sports Arena.',
    features: [],
    active: true,
  },
];
const DEMO_EVENTS = [
  {
    name: 'BKS Tournament',
    sport: 'Football / Futsal',
    date: '2025-10-01',
    description: 'Tournament held at Victory Sports Arena.',
    status: 'Completed',
  },
];
const DEMO_GALLERY = []; // no verified images yet — admin can upload from the Gallery panel
const DEMO_SETTINGS = { phone: '+8801601669203', facebook: 'https://www.facebook.com/victorysportarena/' };

let facilities = [];
let pricingRules = [];
let events = [];
let gallery = [];
let settings = DEMO_SETTINGS;

async function loadContent() {
  if (DEMO_MODE) {
    document.getElementById('demoBanner').classList.add('show');
    facilities = DEMO_FACILITIES;
    events = DEMO_EVENTS;
    gallery = DEMO_GALLERY;
    settings = DEMO_SETTINGS;
    pricingRules = [];
  } else {
    const [facSnap, ruleSnap, evSnap, gallerySnap, settingsSnap] = await Promise.all([
      db.collection(COLLECTIONS.facilities).where('active', '==', true).get(),
      db.collection(COLLECTIONS.pricingRules).where('active', '==', true).get(),
      db.collection(COLLECTIONS.events).orderBy('date', 'desc').get(),
      db.collection(COLLECTIONS.gallery).where('active', '==', true).get(),
      db.collection(COLLECTIONS.settings).doc('site').get(),
    ]);
    facilities = facSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    pricingRules = ruleSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    gallery = gallerySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    settings = settingsSnap.exists ? settingsSnap.data() : DEMO_SETTINGS;
  }

  renderTicker();
  renderFacilities();
  renderEvents();
  renderGallery();
  renderContact();
  populateBookingFacilitySelect();
}

function renderTicker() {
  const items = facilities.length
    ? facilities.map((f) => f.sport || f.name)
    : ['Football', 'Cricket', 'Futsal'];
  const labels = ['Now Booking', ...items, 'Tournaments', 'North Halishahar · Chattogram'];
  const track = document.getElementById('tickerTrack');
  const html = labels.map((l, i) => `<span class="${i === 0 ? 'on' : ''}">${l}</span>`).join('');
  track.innerHTML = html + html; // doubled for seamless scroll
}

function lowestPriceFor(facilityId) {
  const prices = pricingRules
    .filter((r) => r.facilityId === facilityId && r.active)
    .map((r) => Number(r.price))
    .filter((p) => !isNaN(p));
  if (!prices.length) return null;
  return Math.min(...prices);
}

function renderFacilities() {
  const grid = document.getElementById('facilityGrid');
  if (!facilities.length) {
    grid.innerHTML = `<div class="empty-state">Facilities will appear here once added from the Admin Panel.</div>`;
    return;
  }
  grid.innerHTML = facilities.map((f) => {
    const price = lowestPriceFor(f.id);
    const priceLabel = price != null ? `From ${window.PricingEngine.formatBDT(price)}/hr` : 'Contact for pricing';
    const img = (f.images && f.images[0]) ? `<img src="${f.images[0]}" alt="${f.name}">` : (f.sport || f.name);
    return `
      <div class="facility-card">
        <div class="facility-media">
          <span class="facility-tag">${f.sport || ''}</span>
          ${(f.images && f.images[0]) ? img : `<span>${f.name}</span>`}
        </div>
        <div class="facility-body">
          <h3>${f.name}</h3>
          <p>${f.description || ''}</p>
          <div class="facility-meta">
            <span class="price">${priceLabel}</span>
            <span>${f.capacity ? f.capacity : ''}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderEvents() {
  const list = document.getElementById('eventsList');
  if (!events.length) {
    list.innerHTML = `<div class="empty-state">No events scheduled right now — check back soon or follow our Facebook page for updates.</div>`;
    return;
  }
  const statusClass = {
    'Registration Open': 'status-open',
    'Registration Closed': 'status-closed',
    'Upcoming': 'status-upcoming',
    'Completed': 'status-completed',
  };
  list.innerHTML = events.map((e) => {
    const d = new Date(e.date);
    const day = isNaN(d) ? '--' : d.getDate();
    const mon = isNaN(d) ? '' : d.toLocaleString('en', { month: 'short' });
    return `
      <div class="event-card">
        <div class="event-date"><b>${day}</b><span>${mon}</span></div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
            <h3 style="font-size:20px;">${e.name}</h3>
            <span class="status-pill ${statusClass[e.status] || 'status-upcoming'}">${e.status || 'Upcoming'}</span>
          </div>
          <p style="color:var(--text-muted); font-size:14px; margin:0;">${e.description || ''}${e.sport ? ' · ' + e.sport : ''}</p>
        </div>
      </div>`;
  }).join('');
}

function renderGallery(filter) {
  const grid = document.getElementById('galleryGrid');
  const items = filter && filter !== 'all' ? gallery.filter((g) => g.category === filter) : gallery;
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">Gallery photos will appear here once uploaded from the Admin Panel.</div>`;
    return;
  }
  grid.innerHTML = items.map((g) => `<div class="g-item"><img src="${g.url}" alt="${g.title || ''}" loading="lazy"></div>`).join('');
}

document.getElementById('galleryFilters').addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') return;
  [...document.querySelectorAll('#galleryFilters button')].forEach((b) => b.classList.remove('active'));
  e.target.classList.add('active');
  renderGallery(e.target.dataset.cat);
});

function renderContact() {
  const phone = settings.phone || DEMO_SETTINGS.phone;
  document.getElementById('contactPhone').innerHTML = `<a href="tel:${phone}" style="color:inherit;">${phone}</a>`;
  document.getElementById('callNowBtn').href = `tel:${phone}`;
}

/* ------------------------------------------------------------- booking */
const modal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const bookingSuccess = document.getElementById('bookingSuccess');

function openModal() {
  bookingForm.style.display = 'block';
  bookingSuccess.classList.remove('show');
  modal.classList.add('open');
}
function closeModal() { modal.classList.remove('open'); }

['openBookingBtn', 'openBookingBtn2', 'openBookingBtn3'].forEach((id) => {
  document.getElementById(id).addEventListener('click', openModal);
});
document.getElementById('closeBookingBtn').addEventListener('click', closeModal);
document.getElementById('closeSuccessBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function populateBookingFacilitySelect() {
  const sel = document.getElementById('bf-facility');
  sel.innerHTML = facilities.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
}

function updatePricePreview() {
  const facilityId = document.getElementById('bf-facility').value;
  const date = document.getElementById('bf-date').value;
  const start = document.getElementById('bf-start').value;
  const duration = document.getElementById('bf-duration').value;
  const el = document.getElementById('pricePreview');
  if (!facilityId || !date || !start) {
    el.innerHTML = 'Select a facility, date and time to see pricing';
    return;
  }
  const { price } = window.PricingEngine.resolvePrice({ facilityId, date, startTime: start, duration, rules: pricingRules });
  el.innerHTML = `Estimated price: <b>${window.PricingEngine.formatBDT(price)}</b>`;
}
['bf-facility', 'bf-date', 'bf-start', 'bf-duration'].forEach((id) => {
  document.getElementById(id).addEventListener('change', updatePricePreview);
});

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBookingBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const facilityId = document.getElementById('bf-facility').value;
  const facility = facilities.find((f) => f.id === facilityId);
  const date = document.getElementById('bf-date').value;
  const startTime = document.getElementById('bf-start').value;
  const duration = document.getElementById('bf-duration').value;
  const { price } = window.PricingEngine.resolvePrice({ facilityId, date, startTime, duration, rules: pricingRules });

  const booking = {
    facilityId,
    facilityName: facility ? facility.name : '',
    date, startTime, duration: Number(duration),
    price: price,
    customerName: document.getElementById('bf-name').value,
    phone: document.getElementById('bf-phone').value,
    team: document.getElementById('bf-team').value || null,
    notes: document.getElementById('bf-notes').value || null,
    status: 'pending',
    createdAt: DEMO_MODE ? new Date().toISOString() : firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (!DEMO_MODE) {
      await db.collection(COLLECTIONS.bookings).add(booking);
    }
    bookingForm.style.display = 'none';
    bookingSuccess.classList.add('show');
  } catch (err) {
    alert('Something went wrong submitting your request. Please call us directly at ' + (settings.phone || DEMO_SETTINGS.phone) + '.');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Booking Request';
  }
});

loadContent();
