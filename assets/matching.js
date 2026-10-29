// ═══════════════════════════════════════════════════════
// SERVANA — matching.js
//
// ONE place that decides "can this seeker book this service
// from this provider?". Used by seeker.html (listing + booking),
// booking.js (transactional create) and provider.html (previews).
// Pure functions: no Firebase imports, no DOM, easy to test.
//
// DATA MODEL
//   services/{serviceId}   (authoritative for identity + price)
//     providerId   string  REQUIRED  owner (providers/{uid})
//     name         string  REQUIRED
//     price        number  REQUIRED  > 0, NGN
//     active       bool    default true
//     categoryId   string  id of a /category doc (the slug, e.g. "plumbers")
//     serviceMode  "onsite" | "remote" | "both"      default "onsite"
//     serviceCoverage "city" | "state"   (onsite only) default "city": the area is
//                  derived from the provider's CURRENT country/state/city.
//     serviceAreas [{country, state, city}]  optional explicit override. Blank city =
//                  whole state, blank state = whole country.
//   providers/{uid}        isPublic, suspended, available, country/state/city
//   config/platform        commissionRate (percent), minBooking (NGN)
//
// MONEY MODEL
//   Seeker pays the provider directly after the job and pays NO platform fee.
//   The provider owes Servana commissionRate% of serviceFee once the provider
//   confirms they received payment.
// ═══════════════════════════════════════════════════════

export const DEFAULT_COMMISSION_PCT = 5;

const str  = v => (typeof v === "string" ? v.trim() : "");
const norm = v => str(v).toLocaleLowerCase();
const same = (a, b) => norm(a) === norm(b);

export const slugify = name =>
  String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const isPriced = v => Number.isFinite(Number(v)) && Number(v) > 0;

/** Commission owed on a fee, in whole naira. pct is a percentage (5 = 5%). */
export const commissionFor = (fee, pct = DEFAULT_COMMISSION_PCT) =>
  Math.round((Number(fee) * Number(pct)) / 100);

const yes = () => ({ eligible: true, reason: "" });
const no  = reason => ({ eligible: false, reason });

// ── Provider state (identical defaults everywhere) ─────
// A provider doc with no `available` field counts as AVAILABLE, exactly
// like the provider dashboard's toggle.
export const isProviderListed = p =>
  !!p && p.isPublic !== false && p.deleted !== true &&
  p.suspended !== true && p.status !== "suspended";

export const isProviderAvailable = p => !!p && p.available !== false;

// A provider who owes more commission than the allowed amount stays VISIBLE but cannot take new bookings.
// `commissionDue` is a public, rule-protected field on the provider document (admins lower it when a
// commission payment is approved); the allowed amount is config/platform.commissionBlockAbove (default 0).
export const isCommissionBlocked = (p, above = 0) => (Number(p?.commissionDue) || 0) > (Number(above) || 0);

export const isServiceActive = s =>
  !!s && s.active !== false && !!str(s.providerId) && !!str(s.name) && isPriced(s.price);

export const serviceCategoryId = (svc, prov) =>
  str(svc.categoryId) || slugify(prov?.category);

// ── Location ───────────────────────────────────────────
export function serviceAreas(svc, prov) {
  if (Array.isArray(svc.serviceAreas) && svc.serviceAreas.length) return svc.serviceAreas;
  // Derived from the provider's CURRENT location so moving house never leaves stale areas.
  if (svc.serviceCoverage === "state") return [{ country: prov.country, state: prov.state, city: "" }];
  return [{ country: prov.country, state: prov.state, city: prov.city || prov.location }];
}

function areaCovers(area, loc) {
  if (!area || (!str(area.country) && !str(area.city))) return false; // an empty area covers nothing
  if (str(area.country) && !same(area.country, loc.country)) return false;
  if (str(area.state)   && !same(area.state,   loc.state))   return false;
  if (str(area.city)    && !same(area.city,    loc.city))    return false;
  return true;
}

export const hasLocation = loc => !!(str(loc?.city) || str(loc?.state) || str(loc?.country));

// ── The rule set: returns {eligible, reason} ───────────
// loc = the seeker's { country, state, city }
// opts.includeOffline  list providers who toggled themselves Offline
// opts.minBooking      platform minimum price (config/platform.minBooking)
// opts.ignoreLocation  skip the service-area check (viewing a deep-linked provider)
export function evaluateMatch(svc, prov, loc = {}, { includeOffline = false, minBooking = 0, ignoreLocation = false, commissionBlockAbove = 0 } = {}) {
  if (!isProviderListed(prov))                       return no("provider_unavailable");
  if (!includeOffline && !isProviderAvailable(prov)) return no("provider_offline");
  if (!isServiceActive(svc))                         return no("service_inactive");
  if (svc.providerId !== prov.id)                    return no("provider_mismatch");
  if (minBooking && Number(svc.price) < Number(minBooking)) return no("below_minimum");

  const mode = svc.serviceMode || "onsite";
  if (!(ignoreLocation || mode === "remote" || mode === "both")) {      // remote can be delivered anywhere
    if (!hasLocation(loc)) return no("location_required");
    if (!serviceAreas(svc, prov).some(a => areaCovers(a, loc))) return no("out_of_area");
  }
  // Checked LAST so people are only told "not accepting" about providers that otherwise match them.
  if (isCommissionBlocked(prov, commissionBlockAbove)) return no("not_accepting");
  return yes();
}

export const REASON_TEXT = {
  provider_unavailable: "This provider is no longer available.",
  provider_offline:     "This provider is offline right now.",
  service_inactive:     "This service is no longer offered.",
  provider_mismatch:    "This service doesn't belong to that provider.",
  below_minimum:        "This service is below the platform minimum booking amount.",
  not_accepting:        "This provider isn't taking new bookings right now.",
  location_required:    "Choose your location first.",
  out_of_area:          "This provider doesn't serve your area.",
  not_found:            "That provider or service no longer exists.",
  own_profile:          "You cannot book your own profile.",
  price_changed:        "The price just changed. Please review and confirm again."
};

// ── Matching engine ────────────────────────────────────
// Returns [{ provider, services:[matching services], startingPrice, accepting }].
// Providers with no eligible service are NOT returned.
export function findMatches({
  providers, services, categoryId = "", keyword = "", loc = {},
  includeOffline = false, minBooking = 0, providerId = "", commissionBlockAbove = 0
}) {
  const byId = new Map(providers.map(p => [p.id, p]));
  const kw   = norm(keyword);
  const out  = new Map();

  for (const s of services) {
    const p = byId.get(s.providerId);
    if (!p) continue;
    if (providerId && p.id !== providerId) continue;
    if (categoryId && serviceCategoryId(s, p) !== categoryId) continue;
    if (kw && ![s.name, s.description, p.name, p.role, p.category, ...(Array.isArray(p.tags) ? p.tags : [])]
          .some(v => norm(v).includes(kw))) continue;

    // A deep-linked provider is shown even offline / outside the seeker's area so the
    // profile is viewable; the booking itself is re-validated with the real location.
    const m = evaluateMatch(s, p, loc, {
      includeOffline: includeOffline || !!providerId,
      minBooking,
      ignoreLocation: !!providerId,
      commissionBlockAbove
    });
    // "not_accepting" providers are still LISTED (so seekers see them) but flagged: accepting === false.
    if (!m.eligible && m.reason !== "not_accepting") continue;

    const e = out.get(p.id) || { provider: p, services: [], startingPrice: Infinity, accepting: m.eligible };
    e.services.push(s);
    e.startingPrice = Math.min(e.startingPrice, Number(s.price));
    out.set(p.id, e);
  }
  return [...out.values()];
}

// ── Booking payload: built ONLY from the authoritative records ──
// commissionRate is snapshotted so later admin changes never alter old bookings.
// Commission AMOUNT is not set here; it is computed when the provider confirms payment.
export function buildBooking({
  user, provider, service, date, time, address, notes, seekerLocation, bookingRef,
  commissionRate = DEFAULT_COMMISSION_PCT
}) {
  const price = Number(service.price);
  return {
    bookingRef,
    seekerId:      user.uid,
    seekerName:    str(user.displayName).slice(0, 120),
    seekerEmail:   str(user.email).slice(0, 254),
    providerId:    provider.id,
    providerName:  str(provider.name).slice(0, 120),
    serviceId:     service.id,
    service:       str(service.name).slice(0, 160),
    categoryId:    serviceCategoryId(service, provider),
    serviceFee:    price,
    platformFee:   0,
    total:         price,
    commissionRate: Number(commissionRate),
    date, time,
    address:       str(address),
    notes:         str(notes),
    seekerLocation: {
      country: str(seekerLocation?.country),
      state:   str(seekerLocation?.state),
      city:    str(seekerLocation?.city)
    },
    status:           "pending",
    paymentStatus:    "awaiting_completion",
    commissionStatus: "not_due"
  };
}
