// Delivers a notification to a person's PHONES through the Expo push service.
//
// Device tokens are stored by the mobile app at users/{uid}/devices/{id}. The caller has already
// been authorised by notify.js (they are a real party to the booking / chat). On top of that this
// module: honours blocks, rate-limits repeats, and removes tokens Expo reports as dead.
//
// Environment: FIREBASE_SERVICE_ACCOUNT (required), EXPO_ACCESS_TOKEN (optional; needed only if you
// turn on "Enhanced push security" in your Expo account).
const { getAdmin } = require("./firebase-admin");

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

async function sendExpoPush({ callerUid, targetUserId, title, message, data }) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return { configured: false, sent: 0 };

  const { db } = getAdmin();
  const userRef = db.collection("users").doc(targetUserId);

  // 1) Blocked people cannot reach the person they were blocked by.
  const userSnap = await userRef.get();
  if (userSnap.exists && Array.isArray(userSnap.data().blockedUsers) &&
      userSnap.data().blockedUsers.includes(callerUid)) {
    return { configured: true, sent: 0, skipped: "blocked" };
  }

  // 2) Rate limit / de-duplicate: one chat push per 15 s per conversation, one booking push of a kind per 5 min.
  const type = clip(data.type, 40) || "general";
  const rawKey = type === "new_message"
    ? `msg_${data.chatId}_${targetUserId}`
    : `${type}_${data.bookingId || ""}_${targetUserId}`;
  const stateRef = db.collection("pushState").doc(rawKey.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200));
  const windowMs = type === "new_message" ? 15_000 : 5 * 60_000;
  const allowed = await db.runTransaction(async t => {
    const s = await t.get(stateRef);
    if (s.exists && Date.now() - (s.data().at || 0) < windowMs) return false;
    // expireAt lets you add a Firestore TTL policy so this collection cleans itself up.
    t.set(stateRef, { at: Date.now(), callerUid, expireAt: new Date(Date.now() + 24 * 3600 * 1000) });
    return true;
  });
  if (!allowed) return { configured: true, sent: 0, skipped: "rate_limited" };

  // 3) The recipient's phones.
  const devices = await userRef.collection("devices").get();
  const targets = devices.docs
    .map(d => ({ ref: d.ref, token: d.data().token }))
    .filter(d => TOKEN_RE.test(d.token || ""));
  if (!targets.length) return { configured: true, sent: 0 };

  const payloadData = {
    type, bookingId: clip(data.bookingId, 100), chatId: clip(data.chatId, 100),
    senderId: clip(data.senderId, 100), senderName: clip(data.senderName, 100),
  };
  const messages = targets.map(t => ({
    to: t.token, title: clip(title, 100), body: clip(message, 240), data: payloadData,
    sound: "default", channelId: "default", priority: "high", ttl: 86400,
  }));

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const res = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(messages) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[push] Expo rejected the request:", res.status, JSON.stringify(body).slice(0, 300));
    return { configured: true, sent: 0, error: true };
  }

  // 4) Clean up tokens that no longer exist (app uninstalled, token rotated).
  const tickets = Array.isArray(body.data) ? body.data : [];
  let sent = 0;
  await Promise.all(tickets.map(async (tk, i) => {
    if (tk.status === "ok") { sent++; return; }
    if (tk.details?.error === "DeviceNotRegistered") await targets[i].ref.delete().catch(() => {});
    else console.warn("[push] ticket error:", tk.message || tk.details?.error);
  }));
  return { configured: true, sent };
}

module.exports = { sendExpoPush };
