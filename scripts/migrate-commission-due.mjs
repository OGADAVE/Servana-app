// ═══════════════════════════════════════════════════════
// SERVANA — initialise providers.commissionDue.  SAFE TO RE-RUN.
//
//   cd scripts
//   node migrate-commission-due.mjs            # DRY RUN: shows what would change
//   node migrate-commission-due.mjs --write    # applies it
//
// providers/{uid}.commissionDue is the public, rule-protected amount a provider owes. The rules use it to stop
// providers who owe commission from taking new bookings (they stay visible). Before this release the amount
// only existed as the sum of each provider's bookings with commissionStatus == "pending", so this sets
// commissionDue to that sum. Needs ./serviceAccount.json (never commit it).
// ═══════════════════════════════════════════════════════
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const WRITE = process.argv.includes("--write");
initializeApp({ credential: cert(JSON.parse(readFileSync("./serviceAccount.json", "utf8"))) });
const db = getFirestore();

const pending = await db.collection("bookings").where("commissionStatus", "==", "pending").get();
const owed = new Map();
pending.docs.forEach(d => {
  const b = d.data();
  const amt = Number(b.commissionAmount);
  if (b.providerId && amt > 0) owed.set(b.providerId, (owed.get(b.providerId) || 0) + amt);
});

const provs = await db.collection("providers").get();
let changed = 0, same = 0;
for (const p of provs.docs) {
  const want = owed.get(p.id) || 0;
  const have = Number(p.data().commissionDue) || 0;
  if (want === have && p.data().commissionDue !== undefined) { same++; continue; }
  console.log(`${p.data().name || p.id}: commissionDue ${have} -> ${want}`);
  if (WRITE) await p.ref.update({ commissionDue: want, updatedAt: FieldValue.serverTimestamp() });
  changed++;
}
console.log({ mode: WRITE ? "WRITE" : "DRY RUN (nothing written)", providers: provs.size, changed, unchanged: same,
              providersOwing: [...owed.keys()].length, totalOwed: [...owed.values()].reduce((a, b) => a + b, 0) });
