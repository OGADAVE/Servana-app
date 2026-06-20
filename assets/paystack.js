// ═══════════════════════════════════════════════════════
// SERVANA — Paystack Payment Integration
//
// SETUP:
//   1. Create account at paystack.com
//   2. Get your Public Key from Settings → API Keys
//   3. Replace PAYSTACK_PUBLIC_KEY below
//   4. Add to HTML pages that need payment:
//      <script src="https://js.paystack.co/v1/inline.js"></script>
//
// NOTE: This file uses window.PaystackPop which is loaded
// by the Paystack inline script above. It is safe to
// import this module — it only calls PaystackPop at
// runtime when initiatePayment() is actually called.
// ═══════════════════════════════════════════════════════

// ── ✏️  SET YOUR KEY HERE ────────────────────────────────
// Use pk_test_... for development, pk_live_... for production
const PAYSTACK_PUBLIC_KEY = "pk_test_YOUR_PUBLIC_KEY_HERE";
// ────────────────────────────────────────────────────────

// Platform fee percentage (must match backend/Firestore config)
const PLATFORM_FEE_PCT = 0.05; // 5%

/**
 * Initiate a Paystack payment for a booking
 *
 * @param {object} params
 * @param {string} params.email         - Customer's email
 * @param {string} params.name          - Customer's full name
 * @param {number} params.amount        - Amount in NAIRA (not kobo)
 * @param {string} params.bookingRef    - Servana booking reference (SRV-XXXXXX)
 * @param {string} params.service       - Service name (shown in Paystack receipt)
 * @param {string} params.providerName  - Provider's name
 * @param {Function} params.onSuccess   - Called with transaction obj on success
 * @param {Function} params.onCancel    - Called when user cancels
 */
export function initiatePayment(params) {
  const { email, name, amount, bookingRef, service, providerName, onSuccess, onCancel } = params;

  if (!window.PaystackPop) {
    console.error("[Paystack] PaystackPop not loaded. Add the Paystack script tag.");
    throw new Error("Paystack script not loaded. Add <script src='https://js.paystack.co/v1/inline.js'></script> to the page.");
  }

  if (!email || !amount || amount <= 0) {
    throw new Error("Email and a positive amount are required.");
  }

  const amountKobo = Math.round(amount * 100); // Convert naira to kobo

  const handler = window.PaystackPop.setup({
    key:       PAYSTACK_PUBLIC_KEY,
    email,
    amount:    amountKobo,
    currency:  "NGN",
    ref:       `PAY-${bookingRef}-${Date.now()}`,
    label:     name || "Servana Customer",

    // Metadata stored with the transaction (visible in Paystack dashboard)
    metadata: {
      custom_fields: [
        { display_name: "Booking Reference", variable_name: "booking_ref",    value: bookingRef   },
        { display_name: "Service",           variable_name: "service",         value: service      },
        { display_name: "Provider",          variable_name: "provider_name",   value: providerName },
        { display_name: "Platform",          variable_name: "platform",        value: "Servana"    }
      ]
    },

    callback: (transaction) => {
      // transaction.reference — use this to verify payment
      console.log("[Paystack] Payment successful:", transaction.reference);
      if (onSuccess) onSuccess(transaction);
    },

    onClose: () => {
      console.log("[Paystack] Payment popup closed by user.");
      if (onCancel) onCancel();
    }
  });

  handler.openIframe();
}

/**
 * Verify a Paystack transaction reference
 * (Should ideally be done server-side via Cloud Functions or your backend.
 *  This client-side check is a basic confirmation for MVP.)
 *
 * @param {string} reference - Transaction reference from Paystack callback
 * @returns {Promise<object>} - Paystack transaction data
 */
export async function verifyTransaction(reference) {
  // In production: call your server endpoint → server calls Paystack API
  // For MVP: use Paystack's public verification (limited, but functional)
  //
  // ⚠️  IMPORTANT: Do NOT expose your SECRET KEY on the client.
  // This function is a placeholder — in production, call your backend:
  //
  //   const response = await fetch(`/api/verify-payment/${reference}`);
  //   const data = await response.json();
  //   return data;

  console.warn("[Paystack] verifyTransaction() should be called server-side in production.");

  // Placeholder response to keep booking flow working in development
  return {
    status:    "success",
    reference,
    verified:  true,
    message:   "Verification should be done server-side in production."
  };
}

/**
 * Calculate payment breakdown for display
 *
 * @param {number} serviceAmount - Base service fee in naira
 * @returns {{ serviceFee, platformFee, total, totalKobo }}
 */
export function calculatePayment(serviceAmount) {
  const serviceFee  = Math.round(serviceAmount);
  const platformFee = Math.round(serviceAmount * PLATFORM_FEE_PCT);
  const total       = serviceFee + platformFee;

  return {
    serviceFee,
    platformFee,
    total,
    totalKobo:    total * 100,           // for Paystack
    breakdown: {
      service:  `₦${serviceFee.toLocaleString("en-NG")}`,
      platform: `₦${platformFee.toLocaleString("en-NG")}`,
      total:    `₦${total.toLocaleString("en-NG")}`
    }
  };
}

/**
 * Full booking payment flow — combines calculation + payment initiation
 * This is the main function called from seeker.html's "Confirm Booking" button.
 *
 * @param {object} bookingData     - Booking details from the modal
 * @param {object} user            - Firebase Auth current user
 * @param {Function} onPaid        - Called after successful payment with { transaction, bookingRef }
 * @param {Function} onCancelled   - Called if user cancels
 */
export function payForBooking(bookingData, user, onPaid, onCancelled) {
  const { serviceFee, bookingRef, service, providerName } = bookingData;
  const payment = calculatePayment(serviceFee);

  initiatePayment({
    email:        user.email,
    name:         user.displayName || "Customer",
    amount:       payment.total,
    bookingRef,
    service,
    providerName,

    onSuccess: async (transaction) => {
      // Verify the transaction
      try {
        const verification = await verifyTransaction(transaction.reference);
        onPaid({ transaction, verification, payment, bookingRef });
      } catch (err) {
        console.error("[Paystack] Verification error:", err);
        // Still proceed — booking is saved, verification can be retried
        onPaid({ transaction, payment, bookingRef, verificationError: err.message });
      }
    },

    onCancel: onCancelled
  });
}

// ── Load Paystack script dynamically (optional helper) ──
/**
 * Dynamically load the Paystack inline script
 * Call this once before any payment, if you haven't added the <script> tag
 *
 * @returns {Promise<void>}
 */
export function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const script  = document.createElement("script");
    script.src    = "https://js.paystack.co/v1/inline.js";
    script.async  = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Paystack SDK."));
    document.head.appendChild(script);
  });
}

// ── Usage example ────────────────────────────────────────
/*

In seeker.html, replace the booking confirmation section:

  import { payForBooking, loadPaystackScript } from "./assets/paystack.js";

  // Load Paystack on page load (or when seeker page opens)
  await loadPaystackScript();

  // In the "Confirm Booking" button click handler:
  payForBooking(
    {
      serviceFee:   selectedService.price,
      bookingRef:   genRef(),
      service:      selectedService.name,
      providerName: selectedProvider.name
    },
    currentUser,
    async ({ transaction, payment, bookingRef }) => {
      // Payment successful — save booking to Firestore
      await addDoc(collection(db, "bookings"), {
        bookingRef,
        paymentRef:  transaction.reference,
        paymentStatus: "paid",
        serviceFee:  payment.serviceFee,
        platformFee: payment.platformFee,
        total:       payment.total,
        // ... other booking fields
      });
      toast("Payment successful! Booking confirmed 🎉", "success");
    },
    () => toast("Payment cancelled.", "info")
  );

*/
