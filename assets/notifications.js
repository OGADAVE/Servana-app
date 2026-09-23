// ═══════════════════════════════════════════════════════
// SERVANA — OneSignal Push Notification Utility
// Free alternative to Firebase Cloud Messaging (FCM)
// Free tier: Unlimited subscribers, unlimited notifications
//
// WHY ONESIGNAL OVER FCM:
//   • FCM requires Cloud Functions (Blaze plan = $$$) to
//     send notifications from server-side triggers.
//   • OneSignal provides its own free server infrastructure,
//     so you send pushes without needing Cloud Functions.
//   • Unlimited web push on free plan forever.
//   • REST API to trigger notifications from anywhere.
//
// SETUP (15 minutes):
//   1. Create free account at onesignal.com
//   2. New App → Web Push → "Typical Site"
//   3. Enter your site URL (e.g. https://servana.app)
//   4. Copy App ID → ONESIGNAL_APP_ID below
//   5. Copy REST API Key → ONESIGNAL_REST_API_KEY below
//   6. Download OneSignalSDKWorker.js from your dashboard
//      and place it at the ROOT of your site
//      (same folder as index.html, NOT in /assets/)
//   7. Your site MUST be on HTTPS for web push to work
// ═══════════════════════════════════════════════════════

// ── ✏️  CONFIGURE THESE ──────────────────────────────────
const ONESIGNAL_APP_ID      = "YOUR_ONESIGNAL_APP_ID";
const ONESIGNAL_REST_API_KEY = "YOUR_ONESIGNAL_REST_API_KEY"; // Keep private!
// ────────────────────────────────────────────────────────

let oneSignalInitialised = false;

// ── Initialise OneSignal ─────────────────────────────────
/**
 * Call this once on every page after the user is logged in.
 * It loads the OneSignal SDK and registers the browser for push.
 *
 * @param {string} userId - Firebase Auth UID (used as external user ID)
 * @param {object} tags   - User metadata tags (role, city, etc.)
 */
export async function initNotifications(userId, tags = {}) {
  if (oneSignalInitialised || !userId) return;

  try {
    await loadOneSignalSDK();

    await window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId:              ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true, // for local dev

        // Prompt settings
        promptOptions: {
          slidedown: {
            enabled:   true,
            actionMessage: "Servana would like to send you notifications for booking updates and messages.",
            acceptButtonText: "Allow",
            cancelButtonText: "Later",
            // Delay prompt by 5 seconds after page load
            delay: { pageViews: 1, timeDelay: 5 }
          }
        },

        // Welcome notification shown right after subscribing
        welcomeNotification: {
          title:   "Welcome to Servana! 🎉",
          message: "You'll now get instant updates on your bookings.",
          url:     "./dashboard.html"
        },

        notifyButton: { enable: false } // We handle our own UI
      });

      // Link OneSignal subscriber to Servana Firebase user
      await OneSignal.login(userId);

      // Tag user with metadata for targeted notifications
      await OneSignal.User.addTags({
        servana_uid: userId,
        role:        tags.role     || "seeker",
        city:        tags.city     || "unknown",
        platform:    "web",
        ...tags
      });

      oneSignalInitialised = true;
      console.log("[OneSignal] Initialised for user:", userId);
    });

  } catch (err) {
    // Notification errors should never break the app
    console.warn("[OneSignal] Init failed (non-critical):", err.message);
  }
}

// ── Request permission explicitly ────────────────────────
export async function requestPermission() {
  try {
    await window.OneSignalDeferred?.push(async (OneSignal) => {
      await OneSignal.Notifications.requestPermission();
    });
  } catch (err) {
    console.warn("[OneSignal] Permission request failed:", err.message);
  }
}

// ── Check if notifications are enabled ───────────────────
export async function isSubscribed() {
  return new Promise(resolve => {
    window.OneSignalDeferred?.push(async (OneSignal) => {
      const subscribed = await OneSignal.User.PushSubscription.optedIn;
      resolve(!!subscribed);
    }) ?? resolve(false);
  });
}

// ── Send a notification via REST API ─────────────────────
// ⚠️  NOTE: REST API calls with the key should be made from
// your server/Cloud Functions in production. This client-side
// implementation is for development/MVP only.
// In production, move this to a secure backend endpoint.

/**
 * Send a push notification to a specific user
 * @param {string}   targetUserId - Firebase UID of recipient
 * @param {object}   notification
 * @param {string}   notification.title
 * @param {string}   notification.message
 * @param {string}   notification.url       - Page to open on click
 * @param {object}   notification.data      - Extra data payload
 */
export async function sendToUser(targetUserId, notification) {
  const { title, message, url = "./dashboard.html", data = {} } = notification;

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id:             ONESIGNAL_APP_ID,
        target_channel:     "push",

        // Target by external user ID (= Firebase UID)
        include_aliases: { external_id: [targetUserId] },

        headings:   { en: title },
        contents:   { en: message },
        url,
        data,

        // Display options
        chrome_web_icon:  "./assets/images/icon-192.png",
        firefox_icon:     "./assets/images/icon-192.png",
        chrome_web_badge: "./assets/images/icon-72.png",
        priority:         10,
        ttl:              86400 // 24 hours
      })
    });

    const result = await response.json();
    if (result.errors) console.warn("[OneSignal] Send errors:", result.errors);
    return result;
  } catch (err) {
    console.warn("[OneSignal] Send failed (non-critical):", err.message);
    return null;
  }
}

// ── Pre-built notification triggers ──────────────────────

/** Notify provider of a new booking request */
export const notifyNewBooking = (providerUid, booking) =>
  sendToUser(providerUid, {
    title:   "🔔 New Booking Request!",
    message: `${booking.seekerName} wants to book ${booking.service} on ${booking.date}`,
    url:     "./provider.html",
    data:    { type: "new_booking", bookingId: booking.id }
  });

/** Notify seeker that their booking was accepted */
export const notifyBookingAccepted = (seekerUid, booking) =>
  sendToUser(seekerUid, {
    title:   "✅ Booking Accepted!",
    message: `${booking.providerName} accepted your booking for ${booking.service}`,
    url:     "./bookings.html",
    data:    { type: "booking_accepted", bookingId: booking.id }
  });

/** Notify seeker that their booking was completed */
export const notifyBookingCompleted = (seekerUid, booking) =>
  sendToUser(seekerUid, {
    title:   "🏆 Job Completed!",
    message: `Your ${booking.service} booking is done. Leave a review!`,
    url:     "./bookings.html",
    data:    { type: "booking_completed", bookingId: booking.id }
  });

/** Notify seeker that their booking was declined */
export const notifyBookingDeclined = (seekerUid, booking) =>
  sendToUser(seekerUid, {
    title:   "❌ Booking Declined",
    message: `Your booking for ${booking.service} was declined. Find another provider.`,
    url:     "./seeker.html",
    data:    { type: "booking_declined", bookingId: booking.id }
  });

/** Notify user of a new chat message */
export const notifyNewMessage = (recipientUid, senderName, messagePreview) =>
  sendToUser(recipientUid, {
    title:   `💬 ${senderName}`,
    message: messagePreview.length > 60 ? messagePreview.slice(0, 60) + "…" : messagePreview,
    url:     "./chat.html",
    data:    { type: "new_message" }
  });

// ── Load OneSignal SDK dynamically ────────────────────────
function loadOneSignalSDK() {
  return new Promise((resolve, reject) => {
    if (window.OneSignalDeferred) { resolve(); return; }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const script  = document.createElement("script");
    script.src    = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async  = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load OneSignal SDK."));
    document.head.appendChild(script);
  });
}

// ── Usage in pages ────────────────────────────────────────
/*

In every authenticated page, after auth state resolves:

  import { initNotifications, notifyNewBooking } from "./assets/notifications.js";

  onAuthStateChanged(auth, async user => {
    if (!user) return;
    // Initialise notifications (non-blocking)
    const snap = await getDoc(doc(db, "users", user.uid));
    initNotifications(user.uid, {
      role: snap.data()?.role || "seeker",
      city: snap.data()?.city || ""
    });
  });

In seeker.html, after booking is confirmed:

  import { notifyNewBooking } from "./assets/notifications.js";
  // Get provider's UID and send notification
  notifyNewBooking(selectedProvider.id, bookingData);

In provider.html, after accepting a booking:

  import { notifyBookingAccepted } from "./assets/notifications.js";
  notifyBookingAccepted(booking.seekerId, booking);

REQUIRED: Place OneSignalSDKWorker.js at your site root.
Download from your OneSignal dashboard → Settings → Workers.

*/
