// ═══════════════════════════════════════════════════════
// SERVANA — paystack.js
// Providers pay their platform commission here. Seekers never pay through Paystack
// (they pay the provider directly), so there is no seeker-side payment code.
//
// SECURITY: the browser only OPENS the checkout. Whether a commission counts as paid is
// decided by the server (netlify/functions/commission-verify.js + paystack-webhook.js),
// which verifies the charge with Paystack's secret key.
// ═══════════════════════════════════════════════════════
import { auth } from "./firebase.js";

// Public key (safe in the browser). Replace with your pk_live_… before launch.
export const PAYSTACK_PUBLIC_KEY = "pk_test_YOUR_PUBLIC_KEY_HERE";

const MAX_BOOKINGS_PER_PAYMENT = 40;

export const paystackConfigured = () =>
  /^pk_(test|live)_[A-Za-z0-9]{10,}$/.test(PAYSTACK_PUBLIC_KEY);

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Paystack. Check your connection."));
    document.head.appendChild(s);
  });
}

/**
 * Pay a provider's pending commissions.
 * @param {string} email
 * @param {{id:string, commissionAmount:number}[]} bookings  pending-commission bookings
 * @returns {Promise<{paid:number}>} resolves after the SERVER confirmed the payment
 */
export async function payCommission({ email, bookings, onClose }) {
  if (!paystackConfigured()) throw new Error("Payments are not configured yet. Please contact support.");
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");

  const batch = bookings.slice(0, MAX_BOOKINGS_PER_PAYMENT);
  const total = batch.reduce((s, b) => s + Number(b.commissionAmount || 0), 0);
  if (!(total > 0)) throw new Error("Nothing to pay.");

  await loadPaystackScript();
  const reference = `SVC-COM-${user.uid.slice(0, 6)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await new Promise((resolve, reject) => {
    let settled = false;
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(total * 100),
      currency: "NGN",
      ref: reference,
      metadata: { type: "commission", providerId: user.uid, bookingIds: batch.map(b => b.id).join(",") },
      callback: () => { settled = true; resolve(); },
      onClose:  () => { if (!settled) { onClose?.(); reject(Object.assign(new Error("Payment cancelled."), { cancelled: true })); } }
    });
    handler.openIframe();
  });

  // The server decides whether this commission is paid.
  const token = await user.getIdToken();
  const res = await fetch("/.netlify/functions/commission-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reference })
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "We could not confirm your payment yet. It will be applied automatically within a few minutes; contact support if it is not.");
  return { paid: out.amount ?? total };
}
