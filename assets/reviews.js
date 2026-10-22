// ═══════════════════════════════════════════════════════
// SERVANA — reviews.js
//
// One review per booking: the review document id IS the booking id, so a booking
// can never be reviewed twice. The review, the booking's `reviewed` flag and the
// provider's rating aggregate are written in ONE transaction, and Firestore rules
// (getAfter) verify that the rating change matches the review being created, so a
// client cannot rewrite anybody's rating by hand.
// ═══════════════════════════════════════════════════════
import { db } from "./firebase.js";
import {
  doc, collection, query, where, getDocs, limit, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export class ReviewError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function submitReview({ user, booking, rating, comment }) {
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5))              throw new ReviewError("bad_rating", "Please choose a rating from 1 to 5.");
  if (!user?.uid || !booking?.id)       throw new ReviewError("missing", "Review data missing. Please close and try again.");
  const text = String(comment || "").trim().slice(0, 1000);

  const bookingRef = doc(db, "bookings",  booking.id);
  const reviewRef  = doc(db, "reviews",   booking.id);
  const providerId = booking.providerId;
  const provRef    = doc(db, "providers", providerId);

  await runTransaction(db, async tx => {
    const [bSnap, rSnap, pSnap] = await Promise.all([tx.get(bookingRef), tx.get(reviewRef), tx.get(provRef)]);
    const b = bSnap.data();
    if (!bSnap.exists() || b.seekerId !== user.uid || b.status !== "completed" || b.providerId !== providerId) {
      throw new ReviewError("not_reviewable", "This booking can't be reviewed.");
    }
    if (rSnap.exists() || b.reviewed === true) throw new ReviewError("already", "You've already reviewed this booking.");
    if (!pSnap.exists())                       throw new ReviewError("no_provider", "This provider no longer exists.");

    const p = pSnap.data();
    const oldCount  = Number(p.reviewCount) || 0;
    const oldRating = Number(p.rating) || 0;
    const newCount  = oldCount + 1;
    const newRating = Math.round(((oldRating * oldCount + r) / newCount) * 100) / 100;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(p.ratingBreakdown || {}) };
    breakdown[r] = (Number(breakdown[r]) || 0) + 1;

    tx.set(reviewRef, {
      bookingId: booking.id, seekerId: user.uid, seekerName: String(user.displayName || "").slice(0, 120),
      providerId, providerName: String(b.providerName || "").slice(0, 120),
      rating: r, comment: text, createdAt: serverTimestamp()
    });
    tx.update(bookingRef, { reviewed: true, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.update(provRef, {
      rating: newRating, reviewCount: newCount, ratingBreakdown: breakdown,
      lastReviewedAt: serverTimestamp(), lastReviewBookingId: booking.id
    });
  });
}

export async function getProviderReviews(providerId, limitCount = 50) {
  const snap = await getDocs(query(collection(db, "reviews"), where("providerId", "==", providerId), limit(limitCount)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
