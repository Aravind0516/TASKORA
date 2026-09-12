// One-off script to grant the very first Super Admin their role. There is no
// UI path to do this (by design — see PHASE 19: "Do NOT make superadmin
// access simply request.auth != null"), so it must be run manually, once,
// by whoever controls the Firebase project's service account credentials.
//
// Usage:
//   node scripts/bootstrap-super-admin.mjs someone@example.com
//
// Requires the same server-only env vars as the app's Admin SDK
// (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
// FIREBASE_ADMIN_PRIVATE_KEY — see .env.example) available in the shell
// this is run from, and that the target email already has a real Firebase
// Auth account (register normally through the app first, then run this).

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/bootstrap-super-admin.mjs <email>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in the environment.");
  process.exit(1);
}

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth(app);
const db = getFirestore(app);

const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { role: "super_admin", organizationId: null });
await db.collection("users").doc(user.uid).set(
  { uid: user.uid, role: "super_admin", organizationId: null, status: "active", updatedAt: FieldValue.serverTimestamp() },
  { merge: true }
);

console.log(`${email} (${user.uid}) is now a Super Admin. They must log out and back in (or wait for their ID token to refresh) to see it take effect.`);
