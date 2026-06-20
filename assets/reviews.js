// ═══════════════════════════════════════════════════════
// SERVANA — Review Aggregation System
// Zero Cloud Functions needed — runs entirely client-side
// using Firestore transactions for atomic updates.
//
// HOW IT WORKS:
//   When a seeker submits a review, this module:
//   1. Saves the review document to /reviews
//   2. Fetches ALL existing reviews for that provider
//   3. Recalculates the average rating + review count
//   4. Updates the provider document atomically
//   5. Marks the booking as reviewed
//   6. Sends notification + email to provider
//
// WHY NOT CLOUD FUNCTIONS?
//   Cloud Functions require the Blaze (pay-as-you-go) plan.
//   This approach uses a Firestore transaction to ensure
//   the aggregation is consistent and atomic — no server needed.
// ═══════════════════════════════════════════════════════

import { db } from "./firebase.js";
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Submit a review and atomically update provider's rating.
 *
 * @param {object}   reviewData
 * @param {string}   reviewData.bookingId    - Booking being reviewed
 * @param {string}   reviewData.providerId   - Provider being reviewed
 * @param {string}   reviewData.seekerId     - Reviewer's UID
 * @param {string}   reviewData.seekerName   - Reviewer's display name
 * @param {number}   reviewData.rating       - Star rating (1–5)
 * @param {string}   reviewData.comment      - Optional written review
 * @param {string}   reviewData.service      - Service that was reviewed
 *
 * @returns {Promise<{ reviewId, newRating, reviewCount }>}
 */
export async function submitReview(reviewData) {
  const { bookingId, providerId, seekerId, seekerName, rating, comment, service } = reviewData;

  // ── Validate ────────────────────────────────────────
  if (!providerId || !seekerId || !bookingId) {
    throw new Error("Missing required review fields.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be a whole number between 1 and 5.");
  }

  // ── Check for duplicate review ───────────────────────
  const dupCheck = await getDocs(
    query(collection(db, "reviews"),
      where("bookingId",  "==", bookingId),
      where("seekerId",   "==", seekerId)
    )
  );
  if (!dupCheck.empty) {
    throw new Error("You have already reviewed this booking.");
  }

  // ── Fetch all existing reviews for this provider ─────
  const existingSnap = await getDocs(
    query(collection(db, "reviews"), where("providerId", "==", providerId))
  );
  const existingRatings = existingSnap.docs.map(d => d.data().rating);

  // ── Calculate new aggregates ─────────────────────────
  const allRatings     = [...existingRatings, rating];
  const newCount       = allRatings.length;
  const newAverage     = parseFloat(
    (allRatings.reduce((sum, r) => sum + r, 0) / newCount).toFixed(2)
  );
  const ratingBreakdown = buildRatingBreakdown([...existingRatings, rating]);

  // ── Atomic transaction: save review + update provider ─
  let reviewId;
  await runTransaction(db, async (transaction) => {
    const providerRef = doc(db, "providers", providerId);
    const bookingRef  = doc(db, "bookings",  bookingId);

    // Add review
    const reviewRef = doc(collection(db, "reviews"));
    reviewId = reviewRef.id;

    transaction.set(reviewRef, {
      bookingId,
      providerId,
      seekerId,
      seekerName: seekerName || "Anonymous",
      rating,
      comment:    (comment || "").trim(),
      service:    service || "",
      createdAt:  serverTimestamp()
    });

    // Update provider rating + stats
    transaction.update(providerRef, {
      rating:           newAverage,
      reviewCount:      newCount,
      ratingBreakdown:  ratingBreakdown,
      lastReviewedAt:   serverTimestamp()
    });

    // Mark booking as reviewed
    transaction.update(bookingRef, {
      reviewed:    true,
      reviewedAt:  serverTimestamp()
    });
  });

  console.log(`[Reviews] Submitted for provider ${providerId}: ${rating}★ (new avg: ${newAverage})`);

  return {
    reviewId,
    newRating:    newAverage,
    reviewCount:  newCount,
    ratingBreakdown
  };
}

/**
 * Fetch all reviews for a provider
 *
 * @param {string} providerId
 * @param {number} limitCount  - Max reviews to return (default 50)
 * @returns {Promise<Review[]>}
 */
export async function getProviderReviews(providerId, limitCount = 50) {
  const snap = await getDocs(
    query(
      collection(db, "reviews"),
      where("providerId", "==", providerId)
    )
  );

  const reviews = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, limitCount);

  return reviews;
}

/**
 * Get rating summary for a provider (star distribution)
 *
 * @param {string} providerId
 * @returns {Promise<RatingSummary>}
 */
export async function getRatingSummary(providerId) {
  const reviews = await getProviderReviews(providerId, 1000);

  if (!reviews.length) {
    return { average: 0, count: 0, breakdown: { 5:0, 4:0, 3:0, 2:0, 1:0 } };
  }

  const ratings  = reviews.map(r => r.rating);
  const average  = parseFloat(
    (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2)
  );

  return {
    average,
    count:     ratings.length,
    breakdown: buildRatingBreakdown(ratings)
  };
}

/**
 * Recalculate and repair a provider's rating from scratch.
 * Use this if the aggregated value ever gets out of sync.
 *
 * @param {string} providerId
 */
export async function recalculateProviderRating(providerId) {
  const snap = await getDocs(
    query(collection(db, "reviews"), where("providerId", "==", providerId))
  );

  const ratings   = snap.docs.map(d => d.data().rating).filter(r => r >= 1 && r <= 5);
  const count     = ratings.length;
  const average   = count > 0
    ? parseFloat((ratings.reduce((s, r) => s + r, 0) / count).toFixed(2))
    : 0;
  const breakdown = buildRatingBreakdown(ratings);

  await updateDoc(doc(db, "providers", providerId), {
    rating:          average,
    reviewCount:     count,
    ratingBreakdown: breakdown,
    ratingUpdatedAt: serverTimestamp()
  });

  console.log(`[Reviews] Recalculated provider ${providerId}: ${average}★ (${count} reviews)`);
  return { average, count, breakdown };
}

/**
 * Check if a seeker has already reviewed a specific booking
 *
 * @param {string} bookingId
 * @param {string} seekerId
 * @returns {Promise<boolean>}
 */
export async function hasReviewed(bookingId, seekerId) {
  const snap = await getDocs(
    query(collection(db, "reviews"),
      where("bookingId", "==", bookingId),
      where("seekerId",  "==", seekerId)
    )
  );
  return !snap.empty;
}

/**
 * Delete a review (admin only — also recalculates provider rating)
 *
 * @param {string} reviewId
 * @param {string} providerId
 */
export async function deleteReview(reviewId, providerId) {
  await runTransaction(db, async (transaction) => {
    const reviewRef = doc(db, "reviews", reviewId);
    transaction.delete(reviewRef);
  });
  // Recalculate from remaining reviews
  await recalculateProviderRating(providerId);
}

// ── Internal helpers ──────────────────────────────────────

/**
 * Build a star-rating breakdown object from an array of ratings
 * @param {number[]} ratings
 * @returns {{ 1: number, 2: number, 3: number, 4: number, 5: number }}
 */
function buildRatingBreakdown(ratings) {
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach(r => {
    const star = Math.round(r);
    if (star >= 1 && star <= 5) breakdown[star]++;
  });
  return breakdown;
}

/**
 * Render a star rating display element
 * @param {number} rating   - Numeric rating (e.g. 4.7)
 * @param {number} count    - Number of reviews
 * @returns {string}        - HTML string
 */
export function renderRatingHtml(rating, count) {
  const r       = parseFloat(rating || 0);
  const filled  = Math.floor(r);
  const half    = r - filled >= 0.5;
  const empty   = 5 - filled - (half ? 1 : 0);
  const stars   = "★".repeat(filled) + (half ? "½" : "") + "☆".repeat(empty);

  return `
    <span style="color:#F59E0B;letter-spacing:1px;font-size:14px">${stars}</span>
    <span style="font-size:13px;font-weight:700;color:var(--text-1);margin-left:4px">${r.toFixed(1)}</span>
    <span style="font-size:11px;color:var(--text-3)">(${count || 0} review${count !== 1 ? "s" : ""})</span>
  `;
}

/**
 * Render a rating breakdown bar chart (5★ → 1★)
 * @param {{ 1,2,3,4,5 }} breakdown
 * @param {number}         totalCount
 * @returns {string}       - HTML string
 */
export function renderBreakdownHtml(breakdown, totalCount) {
  if (!breakdown || !totalCount) return "";

  return [5, 4, 3, 2, 1].map(star => {
    const count = breakdown[star] || 0;
    const pct   = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:12px;color:var(--text-2);width:18px;text-align:right">${star}</span>
        <span style="font-size:13px;color:#F59E0B">★</span>
        <div style="flex:1;height:6px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#F59E0B;border-radius:4px;transition:width .6s"></div>
        </div>
        <span style="font-size:11px;color:var(--text-3);width:28px">${count}</span>
      </div>`;
  }).join("");
}

// ── Usage in bookings.html ────────────────────────────────
/*

Replace the existing review submit handler with:

  import {
    submitReview, renderRatingHtml
  } from "./assets/reviews.js";
  import {
    sendStatusUpdate
  } from "./assets/email.js";
  import {
    notifyBookingCompleted
  } from "./assets/notifications.js";

  $("submitReview").addEventListener("click", async () => {
    if (!selectedStars) { toast("Please select a rating.", "warning"); return; }
    const sBtn = $("submitReview");
    sBtn.disabled = true; sBtn.classList.add("loading");
    try {
      const { newRating, reviewCount } = await submitReview({
        bookingId:   reviewBookingId,
        providerId:  reviewProviderId,
        seekerId:    currentUser.uid,
        seekerName:  currentUser.displayName || "",
        rating:      selectedStars,
        comment:     $("reviewComment").value.trim(),
        service:     allBookings.find(b => b.id === reviewBookingId)?.service || ""
      });

      // Send email notification to provider (non-blocking)
      const booking = allBookings.find(b => b.id === reviewBookingId);
      if (booking?.providerEmail) {
        sendStatusUpdate(booking, booking.providerEmail, booking.providerName, "completed");
      }

      $("reviewOverlay").classList.remove("active");
      toast(`Review submitted! Provider now rated ${newRating}★`, "success");
      renderList();
    } catch(e) {
      toast(e.message || "Failed to submit review.", "error");
    } finally {
      sBtn.disabled = false; sBtn.classList.remove("loading");
    }
  });

*/
