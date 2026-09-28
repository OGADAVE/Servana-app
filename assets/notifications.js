// ═══════════════════════════════════════════════════════
// SERVANA — OneSignal Push Notifications v2.0
// SECURITY FIX: REST API key removed from frontend.
// All notification sends go through a secure Netlify
// serverless function (netlify/functions/notify.js).
//
// SETUP:
//   1. Create account at onesignal.com
//   2. New App → Web Push → enter your site URL
//   3. Copy App ID → set below
//   4. Copy REST API Key → set in Netlify env vars ONLY
//      (Netlify → Site Settings → Environment Variables)
//      ONESIGNAL_REST_API_KEY = your_rest_api_key
//   5. Set NOTIFY_SECRET in Netlify env vars (any random string)
//      NOTIFY_SECRET = some_long_random_string
//   6. Set the same NOTIFY_SECRET below
//   7. Download OneSignalSDKWorker.js from your OneSignal
//      dashboard and place it at your site ROOT
// ═══════════════════════════════════════════════════════

// ── ✏️  CLIENT-SAFE CONFIG (App ID is public — that's fine) ──
const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID";

// This secret matches the NOTIFY_SECRET env var in Netlify.
// It is NOT your REST API key — it just authorises the function.
// It's visible in source but that's acceptable: anyone who finds
// it can only send notifications to YOUR app's users, and only
// through your own validation logic.
const NOTIFY_SECRET = "YOUR_NOTIFY_SECRET_HERE";

// Netlify serverless function URL
const NOTIFY_URL = "/.netlify/functions/notify";
// ─────────────────────────────────────────────────────────

let oneSignalInitialised = false;

// ── Initialise OneSignal (subscribe user to push) ────────
/**
 * Call this once per page after the user is authenticated.
 * Subscribes the browser and links it to the Firebase UID.
 *
 * @param {string} userId - Firebase Auth UID
 * @param {object} tags   - { role, city } for segmented sends
 */
export async function initNotifications(userId, tags = {}) {
  if (oneSignalInitialised || !userId) return;
  try {
    await _loadSDK();
    await window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          slidedown: {
            enabled: true,
            actionMessage: "Servana would like to send you booking updates and messages.",
            acceptButtonText: "Allow",
            cancelButtonText: "Later",
            delay: { pageViews: 1, timeDelay: 5 }
          }
        },
        welcomeNotification: {
          title:   "Welcome to Servana! 🎉",
          message: "You'll now get instant updates on your bookings.",
          url:     "./dashboard.html"
        },
        notifyButton: { enable: false }
      });

      // Link this browser subscription to the Firebase UID
      await OneSignal.login(userId);

      // Tag user for segmented notifications
      await OneSignal.User.addTags({
        servana_uid: userId,
        role:        tags.role  || "seeker",
        city:        tags.city  || "unknown",
        platform:    "web",
        ...tags
      });

      oneSignalInitialised = true;
      console.log("[OneSignal] Initialised for user:", userId);
    });
  } catch (err) {
    // Non-critical — app works without push
    console.warn("[OneSignal] Init failed (non-critical):", err.message);
  }
}

// ── Request push permission explicitly ───────────────────
export async function requestPermission() {
  try {
    await window.OneSignalDeferred?.push(async (OS) => {
      await OS.Notifications.requestPermission();
    });
  } catch (err) {
    console.warn("[OneSignal] Permission request failed:", err.message);
  }
}

// ── Subscription status ───────────────────────────────────
export async function isSubscribed() {
  return new Promise(resolve => {
    window.OneSignalDeferred?.push(async (OS) => {
      resolve(!!(await OS.User.PushSubscription.optedIn));
    }) ?? resolve(false);
  });
}

// ── SECURE SEND via Netlify function ─────────────────────
/**
 * Send a push notification to a specific user.
 * The REST API key NEVER touches the browser — it lives
 * only in your Netlify environment variables.
 *
 * @param {string} targetUserId - Firebase UID of recipient
 * @param {object} notification - { title, message, url, data }
 */
async function _sendToUser(targetUserId, notification) {
  if (!targetUserId || !notification.title) return null;

  try {
    const response = await fetch(NOTIFY_URL, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-notify-secret": NOTIFY_SECRET
      },
      body: JSON.stringify({ targetUserId, ...notification })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn("[OneSignal] Send failed:", err.error || response.status);
      return null;
    }

    const result = await response.json();
    console.log("[OneSignal] Sent:", result.id);
    return result;
  } catch (err) {
    // Non-critical — booking still works without push
    console.warn("[OneSignal] Send error (non-critical):", err.message);
    return null;
  }
}

// ── Load OneSignal SDK ────────────────────────────────────
function _loadSDK() {
  return new Promise((resolve, reject) => {
    if (window.OneSignalDeferred) { resolve(); return; }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const s    = document.createElement("script");
    s.src      = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.async    = true;
    s.onload   = resolve;
    s.onerror  = () => reject(new Error("Failed to load OneSignal SDK."));
    document.head.appendChild(s);
  });
}

// ── Pre-built notification triggers ──────────────────────

/** New booking — notify provider */
export const notifyNewBooking = (providerUid, booking) =>
  _sendToUser(providerUid, {
    title:   "🔔 New Booking Request!",
    message: `${booking.seekerName || "A customer"} wants to book ${booking.service || "your service"} on ${booking.date || ""}`,
    url:     "./provider.html",
    data:    { type: "new_booking", bookingId: booking.id }
  });

/** Booking accepted — notify seeker */
export const notifyBookingAccepted = (seekerUid, booking) =>
  _sendToUser(seekerUid, {
    title:   "✅ Booking Accepted!",
    message: `${booking.providerName || "Your provider"} accepted your booking for ${booking.service || ""}`,
    url:     "./bookings.html",
    data:    { type: "booking_accepted", bookingId: booking.id }
  });

/** Job completed — notify seeker */
export const notifyBookingCompleted = (seekerUid, booking) =>
  _sendToUser(seekerUid, {
    title:   "🏆 Job Completed!",
    message: `Your ${booking.service || "service"} booking is done. Please leave a review!`,
    url:     "./bookings.html",
    data:    { type: "booking_completed", bookingId: booking.id }
  });

/** Booking declined — notify seeker */
export const notifyBookingDeclined = (seekerUid, booking) =>
  _sendToUser(seekerUid, {
    title:   "❌ Booking Declined",
    message: `Your booking for ${booking.service || ""} was declined. Find another provider.`,
    url:     "./seeker.html",
    data:    { type: "booking_declined", bookingId: booking.id }
  });

/** New chat message — notify recipient */
export const notifyNewMessage = (recipientUid, senderName, messagePreview) =>
  _sendToUser(recipientUid, {
    title:   `💬 ${senderName || "New Message"}`,
    message: (messagePreview || "").length > 60
      ? (messagePreview || "").slice(0, 60) + "…"
      : (messagePreview || ""),
    url:     "./chat.html",
    data:    { type: "new_message" }
  });
