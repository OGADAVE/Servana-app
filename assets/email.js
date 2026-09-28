// ═══════════════════════════════════════════════════════
// SERVANA — EmailJS Utility v2.0
// 2-template system (free tier compatible)
//
// Template 1: servana_user_email  → all user-facing emails
// Template 2: servana_admin_email → all admin/system alerts
//
// HOW TO USE IN ANY PAGE:
//   import { sendWelcomeEmail } from "./assets/email.js";
//   sendWelcomeEmail("Ada Okafor", "ada@email.com", "seeker");
//   // That's it — non-blocking, never crashes the app
// ═══════════════════════════════════════════════════════

// ── ✏️  YOUR CONFIG ──────────────────────────────────────
const CONFIG = {
  publicKey:   "ZjEg-j4VgpnD-HoWX",  // EmailJS public key
  serviceId:   "service_qcb99rh",
  adminEmail:  "noreplyservanaapp@gmail.com",
  siteUrl:     "https://servana.app",
  templates: {
    user:  "template_8lqauun",  // Template: servana_user_email
    admin: "template_xp0heym"   // Template: servana_admin_email
  }
};
// ────────────────────────────────────────────────────────

// ── State ─────────────────────────────────────────────────
let _loaded    = false;
let _initPromise = null;

// Email queue — prevents duplicate sends and rate limit issues
const _queue   = [];
let   _sending = false;

// ── SDK Loader ────────────────────────────────────────────
function _loadSDK() {
  if (_initPromise) return _initPromise;
  _initPromise = new Promise((resolve, reject) => {
    if (window.emailjs) {
      window.emailjs.init(CONFIG.publicKey);
      _loaded = true; resolve(); return;
    }
    const script    = document.createElement("script");
    script.src      = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.async    = true;
    script.onload   = () => {
      window.emailjs.init(CONFIG.publicKey);
      _loaded = true;
      console.log("[EmailJS] SDK loaded ✓");
      resolve();
    };
    script.onerror  = () => {
      _initPromise = null; // Allow retry
      reject(new Error("[EmailJS] SDK failed to load. Check internet connection."));
    };
    document.head.appendChild(script);
  });
  return _initPromise;
}

// ── Queue Processor ───────────────────────────────────────
// Sends emails one at a time with a 300ms gap between each
// to avoid hitting EmailJS rate limits
async function _processQueue() {
  if (_sending || !_queue.length) return;
  _sending = true;
  while (_queue.length) {
    const { templateId, params, resolve, reject, attempt } = _queue.shift();
    try {
      await _loadSDK();
      const result = await window.emailjs.send(
        CONFIG.serviceId,
        templateId,
        { ...params, year: new Date().getFullYear(), site_url: CONFIG.siteUrl }
      );
      console.log(`[EmailJS] ✓ Sent "${templateId}" (${result.status})`);
      resolve(result);
    } catch (err) {
      console.warn(`[EmailJS] ✗ "${templateId}" attempt ${attempt}:`, err?.text || err?.message || err);
      if (attempt < 3) {
        // Re-queue with incremented attempt count after a delay
        await _delay(500 * attempt);
        _queue.unshift({ templateId, params, resolve, reject, attempt: attempt + 1 });
      } else {
        console.error(`[EmailJS] ✗ "${templateId}" failed after 3 attempts — continuing app flow.`);
        resolve(null); // Resolve (not reject) so it never crashes the app
      }
    }
    await _delay(300); // Throttle between sends
  }
  _sending = false;
}

// ── Core Send ─────────────────────────────────────────────
function _send(templateId, params) {
  // Validate required fields
  if (!params.to_email && !params.admin_email) {
    console.warn(`[EmailJS] Skipped "${templateId}" — no recipient email provided.`);
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    _queue.push({ templateId, params, resolve, reject, attempt: 1 });
    _processQueue();
  });
}

// ── Helpers ───────────────────────────────────────────────
const _delay   = ms => new Promise(r => setTimeout(r, ms));
const _ngn     = val => `₦${(parseFloat(val) || 0).toLocaleString("en-NG")}`;
const _cap     = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
const _date    = () => new Date().toLocaleDateString("en-NG", { day:"numeric", month:"long", year:"numeric" });
const _time    = () => new Date().toLocaleTimeString("en-NG", { hour:"2-digit", minute:"2-digit" });

// ═══════════════════════════════════════════════════════
// USER EMAILS — Template: servana_user_email
// ═══════════════════════════════════════════════════════

/**
 * Welcome email — new seeker or provider signup
 * @param {string} name
 * @param {string} email
 * @param {string} role  - "seeker" | "provider"
 * @param {string} city  - optional
 */
export function sendWelcomeEmail(name, email, role = "seeker", city = "") {
  const isProvider = role === "provider";
  return _send(CONFIG.templates.user, {
    to_name:     name  || "Friend",
    to_email:    email || "",
    subject:     `👋 Welcome to Servana, ${(name || "").split(" ")[0]}!`,
    heading:     "Welcome to Servana! 🎉",
    message:     `You've just joined Africa's smartest service marketplace${city ? ` in ${city}` : ""}. ${
      isProvider
        ? "Your provider profile is ready — set it up now to start receiving bookings."
        : "Your personal service genie is ready. Find trusted professionals near you in minutes."
    }`,
    label_1: "Account Type",   value_1: isProvider ? "Service Provider" : "Seeker",
    label_2: "Location",       value_2: city       || "Nigeria",
    label_3: "Status",         value_3: "Active ✅",
    label_4: "Platform",       value_4: "Servana",
    label_5: "Joined",         value_5: _date(),
    action_url:  `${CONFIG.siteUrl}/${isProvider ? "provider.html" : "seeker.html"}`,
    action_text: isProvider ? "Set Up My Profile →" : "Find a Service Now →"
  });
}

/**
 * Booking confirmation — sent to seeker right after booking
 * @param {object} booking - Firestore booking document
 */
export function sendBookingConfirmationToSeeker(booking) {
  return _send(CONFIG.templates.user, {
    to_name:     booking.seekerName     || "Valued Customer",
    to_email:    booking.seekerEmail    || "",
    subject:     `✅ Booking Confirmed — ${booking.bookingRef || ""}`,
    heading:     "Your Booking is Confirmed!",
    message:     `Great news! Your booking for "${booking.service || "a service"}" has been submitted successfully. ${
      booking.providerName
        ? `${booking.providerName} will confirm shortly.`
        : "Your provider will confirm shortly."
    } You can also chat with them directly in the Servana app.`,
    label_1: "Booking Ref",    value_1: booking.bookingRef    || "—",
    label_2: "Service",        value_2: booking.service       || "—",
    label_3: "Provider",       value_3: booking.providerName  || "—",
    label_4: "Date & Time",    value_4: booking.date && booking.time ? `${booking.date} at ${booking.time}` : (booking.date || "—"),
    label_5: "Total",          value_5: _ngn(booking.total    || booking.serviceFee),
    action_url:  `${CONFIG.siteUrl}/bookings.html`,
    action_text: "View My Bookings →"
  });
}

/**
 * New booking alert — sent to provider when they receive a request
 * @param {object} booking       - Firestore booking document
 * @param {string} providerEmail - Provider's email address
 */
export function sendBookingNotificationToProvider(booking, providerEmail) {
  return _send(CONFIG.templates.user, {
    to_name:     booking.providerName  || "Provider",
    to_email:    providerEmail         || "",
    subject:     `🔔 New Booking Request — ${booking.bookingRef || ""}`,
    heading:     "You Have a New Booking Request!",
    message:     `${booking.seekerName || "A customer"} wants to book your service on Servana. Log in now to accept or decline. Providers who respond within 1 hour rank higher and get more bookings!`,
    label_1: "Customer",       value_1: booking.seekerName    || "—",
    label_2: "Service",        value_2: booking.service       || "—",
    label_3: "Date & Time",    value_3: booking.date && booking.time ? `${booking.date} at ${booking.time}` : (booking.date || "—"),
    label_4: "Location",       value_4: booking.address       || "—",
    label_5: "Your Earnings",  value_5: _ngn(booking.serviceFee),
    action_url:  `${CONFIG.siteUrl}/provider.html`,
    action_text: "Accept or Decline →"
  });
}

/**
 * Booking status update — accepted, completed, cancelled, disputed
 * @param {object} booking   - Firestore booking document
 * @param {string} toEmail   - Recipient email
 * @param {string} toName    - Recipient name
 * @param {string} newStatus - "accepted" | "completed" | "cancelled" | "disputed"
 */
export function sendStatusUpdate(booking, toEmail, toName, newStatus) {
  const STATUSES = {
    accepted:  {
      emoji:   "✅",
      heading: "Booking Accepted!",
      msg:     `Your provider has accepted your booking and is preparing for the job. Feel free to chat with them in the Servana app if you have any questions before the appointment.`
    },
    completed: {
      emoji:   "🏆",
      heading: "Job Completed!",
      msg:     `Your booking has been marked as completed. We hope everything went perfectly! Your honest review helps other customers find great providers.`
    },
    cancelled: {
      emoji:   "❌",
      heading: "Booking Cancelled",
      msg:     `Your booking has been cancelled. We're sorry for the inconvenience. You can search for another provider and book again anytime on Servana.`
    },
    disputed:  {
      emoji:   "⚠️",
      heading: "Dispute Under Review",
      msg:     `A dispute has been raised for this booking. Our team will review the situation and get back to you within 24–48 hours. Thank you for your patience.`
    }
  };

  const s = STATUSES[newStatus] || {
    emoji:   "📋",
    heading: "Booking Updated",
    msg:     "Your booking status has been updated on Servana."
  };

  return _send(CONFIG.templates.user, {
    to_name:     toName               || "Servana User",
    to_email:    toEmail              || "",
    subject:     `${s.emoji} Booking ${_cap(newStatus)} — ${booking.bookingRef || ""}`,
    heading:     s.heading,
    message:     s.msg,
    label_1: "Booking Ref",    value_1: booking.bookingRef    || "—",
    label_2: "Service",        value_2: booking.service       || "—",
    label_3: "Provider",       value_3: booking.providerName  || "—",
    label_4: "Date",           value_4: booking.date          || "—",
    label_5: "New Status",     value_5: _cap(newStatus),
    action_url:  `${CONFIG.siteUrl}/bookings.html`,
    action_text: "View My Bookings →"
  });
}

/**
 * Review reminder — sent to seeker 1 hour after job marked complete
 * @param {object} booking - Firestore booking document
 */
export function sendReviewReminder(booking) {
  return _send(CONFIG.templates.user, {
    to_name:     booking.seekerName    || "Customer",
    to_email:    booking.seekerEmail   || "",
    subject:     `⭐ How was ${booking.providerName || "your service"}? Leave a review`,
    heading:     "How Did It Go?",
    message:     `Your ${booking.service || "service"} booking with ${booking.providerName || "your provider"} is complete. Your honest review takes less than a minute and helps thousands of people on Servana find great service providers.`,
    label_1: "Service",        value_1: booking.service       || "—",
    label_2: "Provider",       value_2: booking.providerName  || "—",
    label_3: "Date",           value_3: booking.date          || "—",
    label_4: "Amount Paid",    value_4: _ngn(booking.total    || booking.serviceFee),
    label_5: "Booking Ref",    value_5: booking.bookingRef    || "—",
    action_url:  `${CONFIG.siteUrl}/bookings.html`,
    action_text: "Leave a Review ⭐ →"
  });
}

/**
 * Payment confirmation — sent after successful Paystack payment
 * @param {object} booking     - Firestore booking document
 * @param {string} paymentRef  - Paystack transaction reference
 */
export function sendPaymentConfirmation(booking, paymentRef) {
  return _send(CONFIG.templates.user, {
    to_name:     booking.seekerName    || "Customer",
    to_email:    booking.seekerEmail   || "",
    subject:     `💳 Payment Confirmed — ${_ngn(booking.total || booking.serviceFee)}`,
    heading:     "Payment Successful!",
    message:     `Your payment for ${booking.service || "your service"} has been received and secured. Your money is held safely by Servana until the job is completed.`,
    label_1: "Payment Ref",    value_1: paymentRef              || "—",
    label_2: "Booking Ref",    value_2: booking.bookingRef      || "—",
    label_3: "Service",        value_3: booking.service         || "—",
    label_4: "Provider",       value_4: booking.providerName    || "—",
    label_5: "Amount Paid",    value_5: _ngn(booking.total      || booking.serviceFee),
    action_url:  `${CONFIG.siteUrl}/bookings.html`,
    action_text: "View Booking →"
  });
}

/**
 * Provider payout notification — when payment is released to provider
 * @param {object} provider    - Provider object { name, email }
 * @param {object} booking     - Completed booking
 * @param {number} netAmount   - Amount after platform fee
 */
export function sendPayoutNotification(provider, booking, netAmount) {
  return _send(CONFIG.templates.user, {
    to_name:     provider.name         || "Provider",
    to_email:    provider.email        || "",
    subject:     `💰 Payout Processed — ${_ngn(netAmount)}`,
    heading:     "Your Payment Has Been Processed!",
    message:     `Your earnings for the completed job have been processed and sent to your registered bank account. It may take 1–3 business days to reflect depending on your bank.`,
    label_1: "Service",        value_1: booking.service       || "—",
    label_2: "Customer",       value_2: booking.seekerName    || "—",
    label_3: "Gross Earnings", value_3: _ngn(booking.serviceFee),
    label_4: "Platform Fee",   value_4: _ngn(booking.platformFee),
    label_5: "Net Payout",     value_5: _ngn(netAmount),
    action_url:  `${CONFIG.siteUrl}/provider.html`,
    action_text: "View Earnings Dashboard →"
  });
}

/**
 * Provider verification approved — sent when admin verifies a provider
 * @param {object} provider - Provider object { name, email, role }
 */
export function sendVerificationApproved(provider) {
  return _send(CONFIG.templates.user, {
    to_name:     provider.name         || "Provider",
    to_email:    provider.email        || "",
    subject:     `🛡️ You're Now Verified on Servana!`,
    heading:     "Congratulations — You're Verified! 🛡️",
    message:     `Your Servana provider profile has been reviewed and verified by our team. The blue verified badge is now showing on your profile, helping you get 3× more bookings from customers who trust verified providers.`,
    label_1: "Provider Name",  value_1: provider.name         || "—",
    label_2: "Service",        value_2: provider.role         || "—",
    label_3: "Badge",          value_3: "✓ Verified Provider",
    label_4: "Status",         value_4: "Active & Verified",
    label_5: "Date",           value_5: _date(),
    action_url:  `${CONFIG.siteUrl}/provider.html`,
    action_text: "View My Profile →"
  });
}

// ═══════════════════════════════════════════════════════
// ADMIN EMAILS — Template: servana_admin_email
// ═══════════════════════════════════════════════════════

/**
 * New user registered
 * @param {object} user - { displayName, email, role, city, country }
 */
export function adminNotifyNewUser(user) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `👤 New ${_cap(user.role || "user")}: ${user.displayName || user.email}`,
    alert_type:   "NEW USER REGISTRATION",
    heading:      "A new user has joined Servana",
    message:      `A new ${user.role === "provider" ? "service provider" : "seeker"} account has been created on the Servana platform. ${user.role === "provider" ? "Consider reviewing their profile for verification." : ""}`,
    label_1: "Name",           value_1: user.displayName      || "—",
    label_2: "Email",          value_2: user.email            || "—",
    label_3: "Role",           value_3: _cap(user.role        || "seeker"),
    label_4: "Location",       value_4: [user.city, user.country].filter(Boolean).join(", ") || "—",
    label_5: "Joined",         value_5: _date(),
    action_url:   `${CONFIG.siteUrl}/servana-admin.html`,
    action_text:  "View in Admin Panel →"
  });
}

/**
 * New provider registered
 * @param {object} provider - { name, email, role, category, city, country }
 */
export function adminNotifyNewProvider(provider) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `🛠️ New Provider: ${provider.name || provider.email}`,
    alert_type:   "NEW PROVIDER APPLICATION",
    heading:      "A new provider has registered",
    message:      "A new service provider has joined Servana. Review their profile and verify them if everything checks out. Verified providers get more bookings and build platform trust.",
    label_1: "Name",           value_1: provider.name         || "—",
    label_2: "Email",          value_2: provider.email        || "—",
    label_3: "Service/Role",   value_3: provider.role         || "—",
    label_4: "Category",       value_4: provider.category     || "—",
    label_5: "Location",       value_5: [provider.city, provider.country].filter(Boolean).join(", ") || "—",
    action_url:   `${CONFIG.siteUrl}/servana-admin.html`,
    action_text:  "Review & Verify Provider →"
  });
}

/**
 * New booking placed
 * @param {object} booking - Firestore booking document
 */
export function adminNotifyNewBooking(booking) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `📅 New Booking: ${booking.bookingRef || ""} — ${_ngn(booking.total)}`,
    alert_type:   "NEW BOOKING",
    heading:      "A new booking has been placed",
    message:      "A customer has placed a new service booking on Servana. The platform commission will be collected once the job is marked complete.",
    label_1: "Booking Ref",    value_1: booking.bookingRef    || "—",
    label_2: "Seeker",         value_2: booking.seekerName    || "—",
    label_3: "Provider",       value_3: booking.providerName  || "—",
    label_4: "Service",        value_4: booking.service       || "—",
    label_5: "Platform Fee",   value_5: _ngn(booking.platformFee),
    action_url:   `${CONFIG.siteUrl}/servana-admin.html`,
    action_text:  "View in Admin Panel →"
  });
}

/**
 * Dispute raised — urgent alert
 * @param {object} booking - Firestore booking document
 */
export function adminNotifyDispute(booking) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `⚠️ DISPUTE RAISED — ${booking.bookingRef || ""} [ACTION REQUIRED]`,
    alert_type:   "DISPUTE ALERT — ACTION REQUIRED",
    heading:      "A dispute has been raised",
    message:      "A customer or provider has raised a dispute on a booking. Please review the situation and resolve it as soon as possible. Both parties have been notified that the dispute is under review.",
    label_1: "Booking Ref",    value_1: booking.bookingRef    || "—",
    label_2: "Seeker",         value_2: booking.seekerName    || "—",
    label_3: "Provider",       value_3: booking.providerName  || "—",
    label_4: "Service",        value_4: booking.service       || "—",
    label_5: "Amount at Stake",value_5: _ngn(booking.total),
    action_url:   `${CONFIG.siteUrl}/admin.html`,
    action_text:  "Resolve Dispute Now →"
  });
}

/**
 * Payment alert — when a successful payment comes through
 * @param {object} booking    - Firestore booking document
 * @param {string} paymentRef - Paystack transaction reference
 */
export function adminNotifyPayment(booking, paymentRef) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `💳 Payment Received — ${_ngn(booking.total)} (${booking.bookingRef || ""})`,
    alert_type:   "PAYMENT RECEIVED",
    heading:      "A payment has been received",
    message:      "A customer has completed payment for a booking on Servana. The platform commission is held until the job is marked complete.",
    label_1: "Payment Ref",    value_1: paymentRef            || "—",
    label_2: "Booking Ref",    value_2: booking.bookingRef    || "—",
    label_3: "Amount",         value_3: _ngn(booking.total),
    label_4: "Platform Fee",   value_4: _ngn(booking.platformFee),
    label_5: "Date & Time",    value_5: `${_date()} ${_time()}`,
    action_url:   `${CONFIG.siteUrl}/admin.html`,
    action_text:  "View in Admin Panel →"
  });
}

/**
 * Provider account suspended
 * @param {object} provider - { name, email, role }
 */
export function adminNotifySuspension(provider) {
  return _send(CONFIG.templates.admin, {
    admin_email:  CONFIG.adminEmail,
    subject:      `🚫 Account Suspended — ${provider.name || provider.email}`,
    alert_type:   "ACCOUNT SUSPENSION",
    heading:      "A provider account has been suspended",
    message:      "You have suspended a provider account on Servana. Their profile is now hidden from seekers and they cannot accept new bookings.",
    label_1: "Name",           value_1: provider.name         || "—",
    label_2: "Email",          value_2: provider.email        || "—",
    label_3: "Role",           value_3: _cap(provider.role    || "provider"),
    label_4: "Action",         value_4: "Suspended",
    label_5: "Date",           value_5: _date(),
    action_url:   `${CONFIG.siteUrl}/admin.html`,
    action_text:  "Manage Providers →"
  });
}

// ═══════════════════════════════════════════════════════
// CONVENIENCE WRAPPER
// Fire-and-forget — call without await, never crashes
// ═══════════════════════════════════════════════════════

/**
 * Safe fire-and-forget email sender
 * Catches all errors silently — perfect for non-critical notifications
 *
 * @example
 *   fireEmail(() => sendWelcomeEmail(name, email, role));
 *   fireEmail(() => adminNotifyNewBooking(booking));
 */
export function fireEmail(emailFn) {
  try {
    emailFn()?.catch(err =>
      console.warn("[EmailJS] Background email failed (non-critical):", err?.text || err?.message || err)
    );
  } catch (err) {
    console.warn("[EmailJS] Email function error (non-critical):", err?.message || err);
  }
}

// ═══════════════════════════════════════════════════════
// QUICK REFERENCE — Email triggers across Servana
//
// login.html (signup):
//   fireEmail(() => sendWelcomeEmail(name, email, role, city));
//   fireEmail(() => adminNotifyNewUser({ displayName: name, email, role, city }));
//   if (role === "provider")
//     fireEmail(() => adminNotifyNewProvider({ name, email, role, city }));
//
// seeker.html (confirm booking):
//   fireEmail(() => sendBookingConfirmationToSeeker(booking));
//   fireEmail(() => sendBookingNotificationToProvider(booking, providerEmail));
//   fireEmail(() => adminNotifyNewBooking(booking));
//
// provider.html (accept booking):
//   fireEmail(() => sendStatusUpdate(booking, booking.seekerEmail, booking.seekerName, "accepted"));
//
// provider.html (complete booking):
//   fireEmail(() => sendStatusUpdate(booking, booking.seekerEmail, booking.seekerName, "completed"));
//   fireEmail(() => sendReviewReminder(booking));
//
// provider.html (decline booking):
//   fireEmail(() => sendStatusUpdate(booking, booking.seekerEmail, booking.seekerName, "cancelled"));
//
// servana-admin.html (dispute resolved):
//   fireEmail(() => sendStatusUpdate(booking, booking.seekerEmail, booking.seekerName, "disputed"));
//   fireEmail(() => adminNotifyDispute(booking));
//
// servana-admin.html (verify provider):
//   fireEmail(() => sendVerificationApproved(provider));
//
// paystack.js (payment success):
//   fireEmail(() => sendPaymentConfirmation(booking, paymentRef));
//   fireEmail(() => adminNotifyPayment(booking, paymentRef));
// ═══════════════════════════════════════════════════════
