// ═══════════════════════════════════════════════════════
// SERVANA — Notification System v3.0
// Dual-layer: Firestore (in-app panel) + OneSignal (push)
//
// HOW IT WORKS:
//   Every notify() call does TWO things:
//   1. Writes a document to Firestore /notifications/{id}
//      → This powers the in-app notification bell panel
//   2. Sends a push via OneSignal through Netlify function
//      → This wakes the device when app is not open
//
// USAGE (import from any page):
//   import { notify, notifyNewBooking } from "./assets/notifications.js";
//   notifyNewBooking(providerUid, booking);
// ═══════════════════════════════════════════════════════

import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Config ────────────────────────────────────────────
const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID";    // ← Set this
const NOTIFY_SECRET    = "YOUR_NOTIFY_SECRET_HERE";   // ← Match Netlify env var
const NOTIFY_URL       = "/.netlify/functions/notify";

let oneSignalInitialised = false;

// ═══════════════════════════════════════════════════════
// CORE — write to Firestore + send push
// ═══════════════════════════════════════════════════════

/**
 * Send an in-app + push notification to a specific user.
 * Always writes to Firestore. Sends push if OneSignal is configured.
 *
 * @param {string} recipientUid
 * @param {object} notification
 *   { title, body, type, url, data }
 */
export async function notify(recipientUid, notification) {
  if (!recipientUid || !notification?.title) return;

  // ── Layer 1: Firestore in-app notification ──────────
  try {
    await addDoc(collection(db, "notifications"), {
      userId:    recipientUid,
      title:     notification.title,
      body:      notification.body || notification.message || "",
      type:      notification.type || "general",
      url:       notification.url  || "",
      data:      notification.data || {},
      read:      false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    // Non-blocking — notification panel degrades gracefully
    console.warn("[Notify] Firestore write failed:", err.message);
  }

  // ── Layer 2: OneSignal push (fire-and-forget) ───────
  _sendPush(recipientUid, notification);
}

// ═══════════════════════════════════════════════════════
// PRE-BUILT TRIGGERS — call these from any page
// ═══════════════════════════════════════════════════════

/** Provider receives new booking request */
export const notifyNewBooking = (providerUid, booking) =>
  notify(providerUid, {
    title: "🔔 New Booking Request!",
    body:  `${booking.seekerName || "A customer"} wants to book "${booking.service || "your service"}" on ${booking.date || ""}`,
    type:  "new_booking",
    url:   "./provider.html",
    data:  { bookingId: booking.id, type: "new_booking" }
  });

/** Seeker gets notified that their booking was accepted */
export const notifyBookingAccepted = (seekerUid, booking) =>
  notify(seekerUid, {
    title: "✅ Booking Accepted!",
    body:  `${booking.providerName || "Your provider"} accepted your booking for "${booking.service || ""}"`,
    type:  "booking_accepted",
    url:   "./bookings.html",
    data:  { bookingId: booking.id, type: "booking_accepted" }
  });

/** Seeker gets notified that job is done — time to pay */
export const notifyJobCompleted = (seekerUid, booking) =>
  notify(seekerUid, {
    title: "🏆 Job Completed!",
    body:  `Your "${booking.service || "service"}" is done. Please pay ₦${(booking.serviceFee||0).toLocaleString("en-NG")} to the provider now.`,
    type:  "job_completed",
    url:   "./bookings.html",
    data:  { bookingId: booking.id, type: "job_completed" }
  });

/** Provider gets notified that seeker uploaded payment receipt */
export const notifyPaymentSubmitted = (providerUid, booking) =>
  notify(providerUid, {
    title: "💳 Payment Receipt Submitted",
    body:  `${booking.seekerName || "Your customer"} has submitted their payment receipt for ₦${(booking.serviceFee||0).toLocaleString("en-NG")}. Please confirm.`,
    type:  "payment_submitted",
    url:   "./provider.html",
    data:  { bookingId: booking.id, type: "payment_submitted" }
  });

/** Seeker gets notified that provider confirmed payment */
export const notifyPaymentConfirmed = (seekerUid, booking) =>
  notify(seekerUid, {
    title: "✅ Payment Confirmed",
    body:  `${booking.providerName || "The provider"} confirmed receipt of your ₦${(booking.serviceFee||0).toLocaleString("en-NG")} payment. Transaction complete!`,
    type:  "payment_confirmed",
    url:   "./bookings.html",
    data:  { bookingId: booking.id, type: "payment_confirmed" }
  });

/** Seeker gets notified that booking was declined */
export const notifyBookingDeclined = (seekerUid, booking) =>
  notify(seekerUid, {
    title: "❌ Booking Declined",
    body:  `Your booking for "${booking.service || ""}" was declined. Find another provider on Servana.`,
    type:  "booking_declined",
    url:   "./seeker.html",
    data:  { bookingId: booking.id, type: "booking_declined" }
  });

/** Either party gets a new chat message */
export const notifyNewMessage = (recipientUid, senderName, messagePreview) =>
  notify(recipientUid, {
    title: `💬 ${senderName || "New Message"}`,
    body:  (messagePreview || "").length > 80
             ? (messagePreview || "").slice(0, 80) + "…"
             : (messagePreview || ""),
    type:  "new_message",
    url:   "./chat.html",
    data:  { type: "new_message" }
  });

/** Provider — commission cleared, bookings unlocked */
export const notifyCommissionCleared = (providerUid) =>
  notify(providerUid, {
    title: "🎉 Commission Paid — Bookings Unlocked!",
    body:  "Your outstanding commission has been cleared. You can now accept new booking requests.",
    type:  "commission_cleared",
    url:   "./provider.html",
    data:  { type: "commission_cleared" }
  });

// ═══════════════════════════════════════════════════════
// ONESIGNAL — push layer (non-critical, fire-and-forget)
// ═══════════════════════════════════════════════════════

async function _sendPush(targetUserId, notification) {
  if (!NOTIFY_URL || ONESIGNAL_APP_ID === "YOUR_ONESIGNAL_APP_ID") return;
  try {
    await fetch(NOTIFY_URL, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-notify-secret": NOTIFY_SECRET
      },
      body: JSON.stringify({
        targetUserId,
        title:   notification.title,
        message: notification.body || notification.message || "",
        url:     notification.url  || "",
        data:    notification.data || {}
      })
    });
  } catch (err) {
    // Push is always non-critical
    console.warn("[Notify] Push failed (non-critical):", err.message);
  }
}

// ═══════════════════════════════════════════════════════
// ONESIGNAL SDK — subscribe this browser for push
// ═══════════════════════════════════════════════════════

export async function initPushNotifications(userId, tags = {}) {
  if (oneSignalInitialised || !userId) return;
  if (ONESIGNAL_APP_ID === "YOUR_ONESIGNAL_APP_ID") return; // Not configured
  try {
    await _loadSDK();
    await window.OneSignalDeferred.push(async (OS) => {
      await OS.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          slidedown: {
            enabled: true,
            actionMessage: "Servana would like to send you booking updates.",
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
      await OS.login(userId);
      await OS.User.addTags({
        servana_uid: userId,
        role:   tags.role || "seeker",
        city:   tags.city || "unknown",
        ...tags
      });
      oneSignalInitialised = true;
    });
  } catch (err) {
    console.warn("[OneSignal] Init failed (non-critical):", err.message);
  }
}

function _loadSDK() {
  return new Promise((resolve, reject) => {
    if (window.OneSignalDeferred) { resolve(); return; }
    window.OneSignalDeferred = [];
    const s = document.createElement("script");
    s.src   = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.async = true;
    s.onload  = resolve;
    s.onerror = () => reject(new Error("OneSignal SDK failed to load."));
    document.head.appendChild(s);
  });
}