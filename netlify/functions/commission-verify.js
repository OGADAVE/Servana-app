// POST /.netlify/functions/commission-verify   { reference }
// Authorization: Bearer <Firebase ID token of the provider>
const { getAdmin, settleCommission } = require("./lib/commission");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Missing token" });

    let uid;
    try { uid = (await getAdmin().auth.verifyIdToken(token)).uid; }
    catch (_) { return json(401, { error: "Invalid token" }); }

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (_) { return json(400, { error: "Bad JSON" }); }

    const out = await settleCommission(String(body.reference || ""), uid);
    return json(200, out);
  } catch (e) {
    console.error("[commission-verify]", e.message);
    return json(e.status || 500, { error: e.status ? e.message : "Server error" });
  }
};