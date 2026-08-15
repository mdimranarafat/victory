/**
 * VICTORY SPORTS ARENA — Pricing engine
 * ------------------------------------------------
 * A pricing RULE looks like:
 * {
 *   id, facilityId, dayType: "weekday" | "weekend" | "all",
 *   startTime: "18:00", endTime: "22:00",   // 24h "HH:MM"
 *   duration: 60,                            // minutes this price is for
 *   price: 1500,                             // base price (BDT)
 *   weekendPrice: null,                      // optional override, else dayType handles it
 *   specialPrice: null,                      // optional, e.g. holiday override, takes priority
 *   active: true
 * }
 *
 * Nothing here invents a number — if no matching active rule exists,
 * callers should show "Contact for pricing" rather than guessing.
 */

function isWeekend(dateObj) {
  // Friday is the weekend start in Bangladesh; Fri/Sat treated as weekend.
  const day = dateObj.getDay(); // 0 = Sun ... 5 = Fri, 6 = Sat
  return day === 5 || day === 6;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Find the applicable rule + resolved price for a facility/date/time/duration.
 * Returns { price, rule } or { price: null, rule: null } when nothing matches
 * (caller should render "Contact for pricing").
 */
function resolvePrice({ facilityId, date, startTime, duration, rules }) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const weekend = isWeekend(dateObj);
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + Number(duration);

  const candidates = (rules || []).filter((r) => {
    if (!r.active) return false;
    if (r.facilityId !== facilityId) return false;
    if (Number(r.duration) !== Number(duration)) return false;
    if (r.dayType === "weekend" && !weekend) return false;
    if (r.dayType === "weekday" && weekend) return false;

    const ruleStart = timeToMinutes(r.startTime);
    const ruleEnd = timeToMinutes(r.endTime);
    // booking window must fall fully inside the rule's time window
    return startMin >= ruleStart && endMin <= ruleEnd;
  });

  if (candidates.length === 0) return { price: null, rule: null };

  // Prefer the most specific match: special > weekend-specific > general
  const withSpecial = candidates.find((r) => r.specialPrice != null);
  if (withSpecial) {
    return { price: Number(withSpecial.specialPrice), rule: withSpecial };
  }

  const rule = candidates[0];
  if (weekend && rule.weekendPrice != null) {
    return { price: Number(rule.weekendPrice), rule };
  }
  return { price: Number(rule.price), rule };
}

function formatBDT(amount) {
  if (amount == null) return "Contact for pricing";
  return "৳" + Number(amount).toLocaleString("en-BD");
}

// Exposed globally for plain-<script> usage in index.html / admin.html
window.PricingEngine = { resolvePrice, formatBDT, isWeekend, timeToMinutes };
