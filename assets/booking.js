// ═══════════════════════════════════════════════════════
// SERVANA — booking.js
//
// Creates a booking by RE-READING the provider, service and platform
// config inside a transaction. A stale page (old price, provider went
// offline, service deleted, area changed) can therefore never create a
// bad booking, and Firestore rules re-check the same facts server-side.
// ═══════════════════════════════════════════════════════
import { db, genRef } from "./firebase.js";
import {
  doc, collection, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  evaluateMatch, buildBooking, REASON_TEXT, DEFAULT_COMMISSION_PCT
} from "./matching.js";

export class BookingError extends Error {
  constructor(code, message) {
    super(message || REASON_TEXT[code] || "Could not create the booking.");
    this.code = code;
  }
}

/**
 * @param {object} p
 * @param {object} p.user              Firebase auth user
 * @param {string} p.providerId
 * @param {string} p.serviceId
 * @param {number} p.expectedPrice     price the seeker saw; mismatch aborts
 * @param {object} p.seekerLocation    { country, state, city }
 */
export async function createBooking({
  user, providerId, serviceId, expectedPrice,
  date, time, address, notes, seekerLocation
}) {
  if (!user?.uid)                 throw new BookingError("auth", "Please sign in again.");
  if (providerId === user.uid)    throw new BookingError("own_profile");

  const provRef    = doc(db, "providers", providerId);
  const svcRef     = doc(db, "services", serviceId);
  const cfgRef     = doc(db, "config", "platform");
  const bookingDoc = doc(collection(db, "bookings"));
  const bookingRef = genRef();

  return runTransaction(db, async tx => {
    const [provSnap, svcSnap, cfgSnap] = await Promise.all([
      tx.get(provRef), tx.get(svcRef), tx.get(cfgRef)
    ]);
    if (!provSnap.exists() || !svcSnap.exists()) throw new BookingError("not_found");

    const provider = { id: provSnap.id, ...provSnap.data() };
    const service  = { id: svcSnap.id,  ...svcSnap.data() };
    const cfg      = cfgSnap.exists() ? cfgSnap.data() : {};

    const commissionRate = Number.isFinite(Number(cfg.commissionRate))
      ? Number(cfg.commissionRate) : DEFAULT_COMMISSION_PCT;
    const minBooking = Number(cfg.minBooking) || 0;

    // Same rules as the listing.
    const m = evaluateMatch(service, provider, seekerLocation, { minBooking });
    if (!m.eligible) throw new BookingError(m.reason);

    // The seeker confirmed a specific price. If it moved, make them look again.
    if (Number.isFinite(Number(expectedPrice)) && Number(expectedPrice) !== Number(service.price)) {
      throw new BookingError("price_changed");
    }

    const data = {
      ...buildBooking({
        user, provider, service, date, time, address, notes,
        seekerLocation, bookingRef, commissionRate
      }),
      createdAt: serverTimestamp()
    };
    tx.set(bookingDoc, data);
    return { id: bookingDoc.id, bookingRef, data, provider, service };
  });
}
