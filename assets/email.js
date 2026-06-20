// ═══════════════════════════════════════════════════════
// SERVANA — EmailJS Transactional Email Utility
//
// SETUP:
//   1. Sign up at emailjs.com (free: 200 emails/month)
//   2. Add Email Service (Gmail, Outlook, custom SMTP)
//   3. Create 3 email templates (see templates below)
//   4. Get your Public Key from Account → API Keys
//   5. Fill in the config below
//
// TEMPLATES TO CREATE in EmailJS dashboard:
//   • servana_booking_seeker   (sent to customer)
//   • servana_booking_provider (sent to provider)
//   • servana_booking_update   (sent on status change)
// ═══════════════════════════════════════════════════════

// ── ✏️  CONFIGURE THESE ──────────────────────────────────
const EMAILJS_PUBLIC_KEY = "DnTS1uoJNw9-FlVlr";   // Your existing key
const EMAILJS_SERVICE_ID = "service_19uz7ao";       // Your existing service ID

// Template IDs (create these in your EmailJS dashboard)
const TEMPLATES = {
  bookingSeeker:   "servana_booking_seeker",    // Confirmation to customer
  bookingProvider: "servana_booking_provider",  // Notification to provider
  bookingUpdate:   "servana_booking_update",    // Status update to both parties
  welcome:         "servana_welcome",           // New user welcome
};
// ────────────────────────────────────────────────────────

let emailjsLoaded = false;

/**
 * Load and initialise the EmailJS SDK
 * Call this once on page load, or it will auto-init before first send.
 */
export async function initEmailJS() {
  if (emailjsLoaded) return;
  await loadEmailJSScript();
  window.emailjs.init(EMAILJS_PUBLIC_KEY);
  emailjsLoaded = true;
}

function loadEmailJSScript() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { emailjsLoaded = true; resolve(); return; }
    const script  = document.createElement("script");
    script.src    = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.async  = true;
    script.onload = () => { window.emailjs.init(EMAILJS_PUBLIC_KEY); emailjsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load EmailJS SDK."));
    document.head.appendChild(script);
  });
}

/**
 * Send a booking confirmation to the SEEKER (customer)
 *
 * Template variables used:
 *   {{to_name}}, {{to_email}}, {{booking_ref}}, {{service}},
 *   {{provider_name}}, {{date}}, {{time}}, {{address}}, {{total}}
 */
export async function sendBookingConfirmationToSeeker(booking) {
  await initEmailJS();

  const params = {
    to_name:       booking.seekerName       || "Valued Customer",
    to_email:      booking.seekerEmail      || "",
    booking_ref:   booking.bookingRef       || booking.id,
    service:       booking.service          || "Service",
    provider_name: booking.providerName     || "Your Provider",
    date:          booking.date             || "—",
    time:          booking.time             || "—",
    address:       booking.address          || "—",
    total:         `₦${(booking.total || 0).toLocaleString("en-NG")}`,
    service_fee:   `₦${(booking.serviceFee || 0).toLocaleString("en-NG")}`,
    platform_fee:  `₦${(booking.platformFee || 0).toLocaleString("en-NG")}`,
    notes:         booking.notes            || "None",
    year:          new Date().getFullYear(),
  };

  return sendEmail(TEMPLATES.bookingSeeker, params);
}

/**
 * Send a booking notification to the PROVIDER
 *
 * Template variables:
 *   {{to_name}}, {{to_email}}, {{seeker_name}}, {{booking_ref}},
 *   {{service}}, {{date}}, {{time}}, {{address}}, {{service_fee}}, {{notes}}
 */
export async function sendBookingNotificationToProvider(booking, providerEmail) {
  await initEmailJS();

  const params = {
    to_name:      booking.providerName || "Provider",
    to_email:     providerEmail        || "",
    seeker_name:  booking.seekerName   || "A Customer",
    booking_ref:  booking.bookingRef   || booking.id,
    service:      booking.service      || "Service",
    date:         booking.date         || "—",
    time:         booking.time         || "—",
    address:      booking.address      || "—",
    service_fee:  `₦${(booking.serviceFee || 0).toLocaleString("en-NG")}`,
    notes:        booking.notes        || "No additional notes.",
    dashboard_url:"https://servana.app/provider.html",
    year:         new Date().getFullYear(),
  };

  return sendEmail(TEMPLATES.bookingProvider, params);
}

/**
 * Send a booking status update (accepted / completed / cancelled)
 *
 * @param {object} booking    - Booking document
 * @param {string} toEmail    - Recipient email
 * @param {string} toName     - Recipient name
 * @param {string} newStatus  - "accepted" | "completed" | "cancelled"
 */
export async function sendStatusUpdate(booking, toEmail, toName, newStatus) {
  await initEmailJS();

  const STATUS_MESSAGES = {
    accepted:  "Your booking has been accepted! Your provider is ready for the job.",
    completed: "Your booking has been marked as completed. We hope everything went well!",
    cancelled: "Unfortunately, your booking has been cancelled. You can book again anytime.",
    disputed:  "A dispute has been raised for your booking. Our team will review it shortly.",
  };

  const params = {
    to_name:       toName               || "Servana User",
    to_email:      toEmail              || "",
    booking_ref:   booking.bookingRef   || booking.id,
    service:       booking.service      || "Service",
    new_status:    newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
    status_message:STATUS_MESSAGES[newStatus] || "Your booking status has been updated.",
    date:          booking.date         || "—",
    dashboard_url: "https://servana.app/bookings.html",
    year:          new Date().getFullYear(),
  };

  return sendEmail(TEMPLATES.bookingUpdate, params);
}

/**
 * Send a welcome email to a new user
 *
 * @param {string} toName   - User's full name
 * @param {string} toEmail  - User's email
 * @param {string} role     - "seeker" | "provider"
 */
export async function sendWelcomeEmail(toName, toEmail, role = "seeker") {
  await initEmailJS();

  const params = {
    to_name:    toName  || "Friend",
    to_email:   toEmail || "",
    role:       role.charAt(0).toUpperCase() + role.slice(1),
    action_url: role === "provider"
      ? "https://servana.app/provider.html"
      : "https://servana.app/seeker.html",
    year:       new Date().getFullYear(),
  };

  return sendEmail(TEMPLATES.welcome, params);
}

/**
 * Low-level send function with retry
 * @private
 */
async function sendEmail(templateId, params, retries = 2) {
  if (!window.emailjs) throw new Error("EmailJS not loaded.");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await window.emailjs.send(EMAILJS_SERVICE_ID, templateId, params);
      console.log(`[EmailJS] Sent "${templateId}" →`, result.status, result.text);
      return result;
    } catch (err) {
      console.warn(`[EmailJS] Attempt ${attempt + 1} failed for "${templateId}":`, err);
      if (attempt === retries) {
        // Don't throw — email failure should never block the user flow
        console.error(`[EmailJS] All ${retries + 1} attempts failed for "${templateId}". Booking continues.`);
        return null;
      }
      // Wait before retry (100ms, 300ms, …)
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

// ── EmailJS Template HTML (paste into EmailJS dashboard) ─
/*

=== TEMPLATE 1: servana_booking_seeker ===
Subject: ✅ Booking Confirmed — {{booking_ref}}

Hello {{to_name}},

Your Servana booking has been confirmed! Here are your details:

📋 Booking Reference: {{booking_ref}}
🛠️  Service:          {{service}}
👤 Provider:          {{provider_name}}
📅 Date & Time:       {{date}} at {{time}}
📍 Address:           {{address}}

💰 Price Breakdown:
   Service Fee:     {{service_fee}}
   Platform Fee:    {{platform_fee}}
   Total:           {{total}}

📝 Notes: {{notes}}

Your provider will contact you to confirm. You can also chat directly via the Servana app.

Thank you for using Servana — Your Personal Service Genie!
© {{year}} Servana. Fast help. No stress.


=== TEMPLATE 2: servana_booking_provider ===
Subject: 🔔 New Booking Request — {{booking_ref}}

Hello {{to_name}},

You have a new booking request on Servana!

📋 Booking Reference: {{booking_ref}}
👤 Customer:          {{seeker_name}}
🛠️  Service Requested: {{service}}
📅 Date & Time:       {{date}} at {{time}}
📍 Location:          {{address}}
💰 Your Earnings:     {{service_fee}}

📝 Customer Notes: {{notes}}

Please log in to your provider dashboard to accept or decline this request:
{{dashboard_url}}

Respond quickly — providers who respond within 1 hour get higher rankings!

© {{year}} Servana. Fast help. No stress.


=== TEMPLATE 3: servana_booking_update ===
Subject: 📣 Booking Update — {{new_status}} ({{booking_ref}})

Hello {{to_name}},

Your Servana booking has been updated.

📋 Booking Reference: {{booking_ref}}
🛠️  Service:          {{service}}
📌 New Status:        {{new_status}}

{{status_message}}

View your booking details:
{{dashboard_url}}

Thank you for using Servana!
© {{year}} Servana. Fast help. No stress.

*/
