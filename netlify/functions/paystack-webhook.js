// Paystack -> POST /.netlify/functions/paystack-webhook
// Safety net: settles commission even if the provider closed the tab before the
// browser callback ran. Set this URL in the Paystack dashboard (Settings > API Keys & Webhooks).
const crypto = require("crypto");
const { settleCommission } = require("./lib/commission");

exports.handler = async event => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const sig    = event.headers["x-paystack-signature"] || "";
  if (!secret) return { statusCode: 500, body: "" };

  const expected = crypto.createHmac("sha512", secret).update(event.body || "").digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { statusCode: 401, body: "" };

  try {
    const evt = JSON.parse(event.body || "{}");
    if (evt.event === "charge.success" && evt.data?.metadata?.type === "commission") {
      await settleCommission(String(evt.data.reference || ""), null);
    }
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("[paystack-webhook]", e.message);
    // 4xx = permanent (don't retry); 5xx = let Paystack retry
    return { statusCode: e.status && e.status < 500 ? 200 : 500, body: "" };
  }
};
