// ═══════════════════════════════════════════════════════
// SERVANA — Netlify Serverless Function: /notify
// Secure OneSignal proxy — REST key never exposed to client
//
// SETUP (one-time in Netlify dashboard):
//   1. Go to your site → Site Settings → Environment Variables
//   2. Add:  ONESIGNAL_APP_ID      = your_app_id
//            ONESIGNAL_REST_API_KEY = your_rest_api_key
//            NOTIFY_SECRET          = any_random_string_you_choose
//   3. Deploy — done. The frontend calls this function instead.
//
// HOW IT'S CALLED (from assets/notifications.js):
//   POST /.netlify/functions/notify
//   Headers: { "x-notify-secret": NOTIFY_SECRET }
//   Body:    { targetUserId, title, message, url, data }
// ═══════════════════════════════════════════════════════

exports.handler = async (event) => {
  // ── Only accept POST ──────────────────────────────────
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Validate shared secret ────────────────────────────
  // This prevents random people from sending push notifications through your account
  const secret         = event.headers["x-notify-secret"];
  const expectedSecret = process.env.NOTIFY_SECRET;

  if (!expectedSecret) {
    console.error("[notify] NOTIFY_SECRET environment variable not set.");
    return { statusCode: 500, body: JSON.stringify({ error: "Server misconfiguration" }) };
  }

  if (!secret || secret !== expectedSecret) {
    console.warn("[notify] Rejected — invalid or missing secret.");
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // ── Parse body ────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { targetUserId, title, message, url, data } = payload;

  // ── Validate payload ──────────────────────────────────
  if (!targetUserId || !title || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields: targetUserId, title, message" })
    };
  }

  // ── Env vars ──────────────────────────────────────────
  const APP_ID   = process.env.ONESIGNAL_APP_ID;
  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!APP_ID || !REST_KEY) {
    console.error("[notify] OneSignal env vars not set.");
    return { statusCode: 500, body: JSON.stringify({ error: "Push service not configured" }) };
  }

  // ── Send via OneSignal REST API ───────────────────────
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${REST_KEY}`
      },
      body: JSON.stringify({
        app_id:          APP_ID,
        target_channel:  "push",
        include_aliases: { external_id: [targetUserId] },
        headings:        { en: title },
        contents:        { en: message },
        url:             url || "https://servana.app/dashboard.html",
        data:            data || {},
        chrome_web_icon: "https://servana.app/assets/images/icon-192.png",
        priority:        10,
        ttl:             86400 // 24 hours
      })
    });

    const result = await response.json();

    if (result.errors?.length) {
      console.warn("[notify] OneSignal errors:", result.errors);
    } else {
      console.log("[notify] Sent to:", targetUserId, "| id:", result.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: result.id, errors: result.errors || [] })
    };

  } catch (err) {
    console.error("[notify] Fetch error:", err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Failed to reach push service", detail: err.message })
    };
  }
};
