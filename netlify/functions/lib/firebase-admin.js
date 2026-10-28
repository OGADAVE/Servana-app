// Shared Firebase Admin initialisation for Netlify functions.
// Needs the Netlify environment variable FIREBASE_SERVICE_ACCOUNT (the full service-account JSON).
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function getAdmin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { db: getFirestore(), auth: getAuth(), FieldValue };
}

module.exports = { getAdmin };
