// ═══════════════════════════════════════════════════════
// SERVANA — one-time data migration for the v4 release.  SAFE TO RE-RUN.
//
//   cd scripts && npm i firebase-admin
//   node migrate-v4.mjs            # DRY RUN: prints what it would do, writes nothing
//   node migrate-v4.mjs --write    # applies the changes
//
// Needs ./serviceAccount.json (Firebase console > Project settings > Service accounts).
// NEVER commit that file. Run "Seed categories" in the admin console FIRST so categories exist.
//
// What it does
//  1. Embedded providers/{uid}.services[]  -> services/{uid}_{slug}  (deterministic ids: no duplicates)
//  2. Backfills categoryId / serviceMode / serviceCoverage on every service
//  3. Moves bank details out of the PUBLIC provider doc -> providers/{uid}/private/payout, and
//     removes email + bank fields from the public doc
//  4. Keeps providers.suspended in sync with users.suspended
//  5. Recomputes rating / reviewCount / ratingBreakdown from the reviews collection
//     (ratings were never aggregated before, so every provider currently shows 0)
// ═══════════════════════════════════════════════════════
import admin from "firebase-admin";
import { readFileSync } from "fs";

const WRITE = process.argv.includes("--write");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync("./serviceAccount.json", "utf8"))) });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const slug = s => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const key  = s => String(s || "").toLowerCase().trim();
const stats = { servicesCreated: 0, servicesExisting: 0, servicesSkipped: 0, servicesBackfilled: 0,
                payoutMoved: 0, publicFieldsRemoved: 0, suspendedSynced: 0, ratingsFixed: 0 };
const log = (...a) => console.log(...a);
const doWrite = async fn => { if (WRITE) await fn(); };

const catIds = new Map((await db.collection("category").get()).docs.map(d => [key(d.data().name), d.id]));
if (!catIds.size) log("⚠️  No categories found. Run 'Seed categories' in the admin console first.");

const provs   = await db.collection("providers").get();
const provCat = new Map(provs.docs.map(p => [p.id, catIds.get(key(p.data().category)) || slug(p.data().category)]));

// 1) embedded services
for (const p of provs.docs) {
  const embedded = Array.isArray(p.data().services) ? p.data().services : [];
  for (const s of embedded) {
    const name  = String(s?.name || "").trim().slice(0, 160);
    const price = Number(String(s?.price ?? "").replace(/[^0-9.]/g, ""));
    if (!name || !(price > 0)) { stats.servicesSkipped++; log("SKIP bad service:", p.id, JSON.stringify(s)); continue; }
    const ref = db.collection("services").doc(`${p.id}_${slug(name) || "service"}`);
    if ((await ref.get()).exists) { stats.servicesExisting++; continue; }
    await doWrite(() => ref.set({
      providerId: p.id, name, price,
      description: String(s.description || "").slice(0, 500),
      duration: String(s.duration || "").slice(0, 60),
      categoryId: provCat.get(p.id) || "", serviceMode: "onsite", serviceCoverage: "city",
      active: true, createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp()
    }));
    stats.servicesCreated++;
  }
}

// 2) backfill every service
for (const d of (await db.collection("services").get()).docs) {
  const s = d.data(), patch = {};
  if (!s.categoryId && provCat.get(s.providerId)) patch.categoryId = provCat.get(s.providerId);
  if (!s.serviceMode)     patch.serviceMode = "onsite";
  if (!s.serviceCoverage && (s.serviceMode || "onsite") === "onsite") patch.serviceCoverage = "city";
  if (s.active === undefined) patch.active = true;
  if (Object.keys(patch).length) { await doWrite(() => d.ref.update(patch)); stats.servicesBackfilled++; }
}

// 3) bank details + email out of the public provider doc
for (const p of provs.docs) {
  const d = p.data(), del = {};
  if (d.accountNumber || d.bankName || d.accountName) {
    await doWrite(() => p.ref.collection("private").doc("payout").set({
      bankName: d.bankName || "", accountNumber: d.accountNumber || "", accountName: d.accountName || "",
      updatedAt: FV.serverTimestamp()
    }, { merge: true }));
    stats.payoutMoved++;
  }
  for (const f of ["bankName", "accountNumber", "accountName", "email"]) if (f in d) del[f] = FV.delete();
  if (Object.keys(del).length) { await doWrite(() => p.ref.update(del)); stats.publicFieldsRemoved++; }
}

// 4) suspension flags
for (const u of (await db.collection("users").where("role", "==", "provider").get()).docs) {
  const p = provs.docs.find(x => x.id === u.id);
  if (p && (u.data().suspended === true) !== (p.data().suspended === true)) {
    await doWrite(() => p.ref.update({ suspended: u.data().suspended === true }));
    stats.suspendedSynced++;
  }
}

// 5) ratings from reviews
const reviews = await db.collection("reviews").get();
const agg = new Map();
reviews.docs.forEach(r => {
  const { providerId, rating } = r.data();
  const n = Number(rating);
  if (!providerId || !(n >= 1 && n <= 5)) return;
  const a = agg.get(providerId) || { sum: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  a.sum += n; a.count++; a.breakdown[Math.round(n)]++;
  agg.set(providerId, a);
});
for (const [id, a] of agg) {
  const p = provs.docs.find(x => x.id === id);
  if (!p) continue;
  const rating = Math.round((a.sum / a.count) * 100) / 100;
  if (Number(p.data().reviewCount) !== a.count || Number(p.data().rating) !== rating) {
    await doWrite(() => p.ref.update({ rating, reviewCount: a.count, ratingBreakdown: a.breakdown }));
    stats.ratingsFixed++;
  }
}

log({ mode: WRITE ? "WRITE" : "DRY RUN (nothing written)", ...stats });
log("Providers whose category matches no category doc:",
  provs.docs.filter(p => p.data().category && !catIds.has(key(p.data().category))).map(p => p.id));
