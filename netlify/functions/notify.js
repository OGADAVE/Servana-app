
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

async function readFirebaseDocument(collectionName, id, apiKey, token) {
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(id || "")) {
    return null;
  }

  const url =
    `https://firestore.googleapis.com/v1/projects/servana-59172/databases/(default)/documents/${collectionName}/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;

  return response.json();
}

const stringField = (doc, name) =>
  doc?.fields?.[name]?.stringValue || "";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID;
  const restKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!apiKey || !appId || !restKey) {
    console.error("[notify] Required environment variables are missing.");

    return json(503, {
      error: "Push notifications are not configured"
    });
  }

  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";

  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return json(401, { error: "Sign-in required" });
  }

  const token = match[1];
  let callerUid;

  // Validate the Firebase ID token.
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken: token })
      }
    );

    const result = await response.json().catch(() => ({}));

    callerUid = result.users?.[0]?.localId;

    if (!response.ok || !callerUid) {
      return json(401, {
        error: "Invalid or expired sign-in token"
      });
    }
  } catch (err) {
    console.error("[notify] Token validation failed:", err.message);

    return json(502, {
      error: "Could not validate sign-in"
    });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const {
    targetUserId,
    title,
    message,
    url,
    data = {}
  } = payload;

  if (
    typeof targetUserId !== "string" ||
    !targetUserId.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 100 ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 500 ||
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return json(400, {
      error: "Invalid recipient, title, message, or data"
    });
  }

  const type = typeof data.type === "string" ? data.type : "";

  let authorized = false;

  const bookingTypes = new Set([
    "new_booking",
    "booking_accepted",
    "job_completed",
    "payment_submitted",
    "payment_confirmed",
    "booking_declined"
  ]);

  // Booking notifications: sender and recipient must be
  // the two parties attached to the actual Firestore booking.
  if (bookingTypes.has(type)) {
    if (!data.bookingId) {
      return json(400, {
        error: "bookingId is required"
      });
    }

    const booking = await readFirebaseDocument(
      "bookings",
      data.bookingId,
      apiKey,
      token
    );

    if (!booking) {
      return json(403, {
        error: "Booking not found or not accessible"
      });
    }

    const seekerId = stringField(booking, "seekerId");
    const providerId = stringField(booking, "providerId");

    authorized =
      (callerUid === seekerId && targetUserId === providerId) ||
      (callerUid === providerId && targetUserId === seekerId);
  }

  // Chat notifications: both users must belong to the chat.
  else if (type === "new_message") {
    if (!data.chatId) {
      return json(400, {
        error: "chatId is required"
      });
    }

    const chat = await readFirebaseDocument(
      "chats",
      data.chatId,
      apiKey,
      token
    );

    const participants =
      chat?.fields?.participants?.arrayValue?.values || [];

    const participantIds = participants
      .map(item => item.stringValue)
      .filter(Boolean);

    authorized =
      participantIds.includes(callerUid) &&
      participantIds.includes(targetUserId) &&
      callerUid !== targetUserId;
  }

  // Commission notifications must use a trusted server-side
  // workflow, not an arbitrary browser request.
  else {
    return json(403, {
      error: "This notification type is not allowed from the browser"
    });
  }

  if (!authorized) {
    return json(403, {
      error: "You are not authorized to notify this recipient"
    });
  }

  let safeUrl = "https://servana.top/dashboard.html";

  if (typeof url === "string" && url.trim()) {
    try {
      const parsed = new URL(url, "https://servana.top");

      if (
        parsed.protocol === "https:" &&
        parsed.hostname === "servana.top"
      ) {
        safeUrl = parsed.href;
      }
    } catch {
      // Keep the safe default URL.
    }
  }

  try {
    const response = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${restKey}`
        },
        body: JSON.stringify({
          app_id: appId,
          target_channel: "push",
          include_aliases: {
            external_id: [targetUserId]
          },
          headings: { en: title.trim() },
          contents: { en: message.trim() },
          url: safeUrl,
          data,
          chrome_web_icon:
            "https://servana.top/assets/images/icon-192.png",
          priority: 10,
          ttl: 86400
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.errors?.length) {
      console.error(
        "[notify] OneSignal rejected request:",
        result.errors || response.status
      );

      return json(502, {
        error: "Push provider rejected the notification"
      });
    }

    return json(200, {
      ok: true,
      id: result.id || null
    });
  } catch (err) {
    console.error("[notify] OneSignal request failed:", err.message);

    return json(502, {
      error: "Failed to reach push service"
    });
  }
};