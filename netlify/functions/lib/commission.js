// Shared commission-settlement logic for Netlify functions.
// Server-side only: verifies the Paystack charge with the SECRET key, cross-checks the
// amount against the provider's real pending commissions in Firestore, then marks them paid.
//
// Required Netlify environment variables:
//   PAYSTACK_SECRET_KEY       sk_live_... / sk_test_...
//   FIREBASE_SERVICE_ACCOUNT  the full service-account JSON (one line)
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function getAdmin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { db: getFirestore(), auth: getAuth(), FieldValue };
}

const REF_RE = /^[A-Za-z0-9_.=-]{6,100}$/;
const MAX_BOOKINGS = 40;

async function paystackVerify(reference) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw Object.assign(new Error("PAYSTACK_SECRET_KEY is not configured"), { status: 500 });
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.status || !body.data) {
    throw Object.assign(new Error("Could not verify payment with Paystack"), { status: 502 });
  }
  return body.data;
}

/**
 * @param {string} reference     Paystack transaction reference
 * @param {string|null} uid      the signed-in provider (verify endpoint) or null (webhook)
 */
async function settleCommission(reference, uid) {
  if (!REF_RE.test(reference || "")) throw Object.assign(new Error("Invalid reference"), { status: 400 });

  const fb = getAdmin();
  const db = fb.db;
  const payRef = db.collection("commissionPayments").doc(reference);

  const done = await payRef.get();
  if (done.exists) {
    if (uid && done.data().providerId !== uid) throw Object.assign(new Error("Forbidden"), { status: 403 });
    return { ok: true, already: true, amount: done.data().amount };
  }

  const tx = await paystackVerify(reference);
  if (tx.status !== "success")  throw Object.assign(new Error("Payment not successful"), { status: 402 });
  if (tx.currency !== "NGN")    throw Object.assign(new Error("Unexpected currency"), { status: 400 });

  const meta = tx.metadata || {};
  if (meta.type !== "commission" || !meta.providerId) {
    throw Object.assign(new Error("Not a commission payment"), { status: 400 });
  }
  if (uid && meta.providerId !== uid) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const ids = [...new Set(String(meta.bookingIds || "").split(",").map(s => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > MAX_BOOKINGS) throw Object.assign(new Error("Invalid booking list"), { status: 400 });

  const result = await db.runTransaction(async t => {
    if ((await t.get(payRef)).exists) return { ok: true, already: true };   // lost a race: already settled

    const refs  = ids.map(id => db.collection("bookings").doc(id));
    const snaps = await t.getAll(...refs);
    let sum = 0;
    for (const s of snaps) {
      const b = s.data();
      if (!s.exists || b.providerId !== meta.providerId || b.commissionStatus !== "pending" ||
          !(Number(b.commissionAmount) > 0)) {
        throw Object.assign(new Error("A booking in this payment is not payable"), { status: 409 });
      }
      sum += Number(b.commissionAmount);
    }
    if (Math.round(sum * 100) !== Number(tx.amount)) {
      throw Object.assign(new Error("Amount does not match outstanding commission"), { status: 409 });
    }

    const now = fb.FieldValue.serverTimestamp();
    snaps.forEach(s => t.update(s.ref, {
      commissionStatus: "paid", commissionPaidAt: now, commissionPaymentRef: reference, updatedAt: now
    }));
    t.set(payRef, {
      providerId: meta.providerId, amount: sum, bookingIds: ids,
      paystackId: tx.id || null, createdAt: now
    });
    return { ok: true, amount: sum };
  });
  return result;
}

module.exports = { getAdmin, settleCommission };