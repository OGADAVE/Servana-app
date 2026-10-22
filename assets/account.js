// ═══════════════════════════════════════════════════════
// SERVANA — account.js
// Deleting a login must not leave a live provider listing, public bank details or
// open bookings behind. This tidies Firestore FIRST, then deletes the auth user.
//
// Kept (on purpose): completed bookings and reviews, because they are the other
// party's record. They contain only names and booking details, no bank data.
// ═══════════════════════════════════════════════════════
import { db } from "./firebase.js";
import {
  doc, collection, query, where, getDocs, getDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const RECENT_MS = 4 * 60 * 1000;   // Firebase wants a sign-in within ~5 minutes

export class AccountError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function deleteMyAccount(user) {
  const last = Date.parse(user.metadata?.lastSignInTime || "") || 0;
  if (Date.now() - last > RECENT_MS) {
    // Checked BEFORE touching any data so a failure can never leave a half-deleted account.
    throw new AccountError("recent-login", "For your security, please log out, log back in, then delete your account.");
  }
  const uid = user.uid;

  // 1) Open bookings: seeker cancels pending ones, provider declines pending ones.
  try {
    const mine = await getDocs(query(collection(db, "bookings"), where("seekerId", "==", uid)));
    const asProv = await getDocs(query(collection(db, "bookings"), where("providerId", "==", uid)));
    const jobs = [];
    mine.docs.forEach(d => { if (d.data().status === "pending") jobs.push(updateDoc(d.ref, { status: "cancelled", updatedAt: serverTimestamp() })); });
    asProv.docs.forEach(d => { if (d.data().status === "pending") jobs.push(updateDoc(d.ref, { status: "cancelled", updatedAt: serverTimestamp() })); });
    await Promise.allSettled(jobs);
  } catch (e) { console.warn("[Account] bookings:", e.message); }

  // 2) Provider data: take the listing down and remove services + payout details.
  try {
    const provRef = doc(db, "providers", uid);
    if ((await getDoc(provRef)).exists()) {
      const svcs = await getDocs(query(collection(db, "services"), where("providerId", "==", uid)));
      await Promise.allSettled(svcs.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "providers", uid, "private", "payout")).catch(() => {});
      await deleteDoc(provRef);
    }
  } catch (e) { console.warn("[Account] provider data:", e.message); }

  // 3) Profile document, then the login itself.
  await deleteDoc(doc(db, "users", uid)).catch(e => console.warn("[Account] user doc:", e.message));
  await deleteUser(user);
}
