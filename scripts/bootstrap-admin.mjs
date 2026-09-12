// One-off script to bootstrap the very first Admin of an organization —
// creates the organization (if it doesn't exist yet) and grants a real
// Firebase Auth account the "admin" role + that organizationId, entirely
// via the Admin SDK. This exists because the normal path (Super Admin →
// Add Administrator → invitation email) needs a working Super Admin session
// *and* a configured email provider — this script skips straight to a
// working Admin account for local development/testing.
//
// This is intentionally NOT a client-reachable feature: it requires the
// Firebase project's service account credentials to run at all, so it can
// never be triggered by a browser, and it never lets a caller choose an
// arbitrary uid to promote without knowing their real email up front.
//
// Usage:
//   node scripts/bootstrap-admin.mjs admin@example.com "Acme Inc"
//
// - <email> must already be a real Firebase Auth account (register normally
//   through the app first, then run this).
// - The organization name is matched case-sensitively against any existing
//   `organizations.name` — if found, that org is reused (its existing data
//   is left untouched); otherwise a new one is created.
//
// Requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
// FIREBASE_ADMIN_PRIVATE_KEY (see .env.example) in the environment.

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
const orgName = process.argv[3];
if (!email || !orgName) {
  console.error('Usage: node scripts/bootstrap-admin.mjs <email> "<organization name>"');
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

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "organization";
}

const existing = await db.collection("organizations").where("name", "==", orgName).limit(1).get();

let orgId;
if (!existing.empty) {
  orgId = existing.docs[0].id;
  console.log(`Reusing existing organization "${orgName}" (${orgId}) — its existing data is untouched.`);
} else {
  const ref = db.collection("organizations").doc();
  orgId = ref.id;
  const now = new Date().toISOString();
  await ref.set({
    id: ref.id,
    name: orgName,
    slug: slugify(orgName),
    description: "",
    plan: "Free",
    ownerId: user.uid,
    adminIds: [],
    memberIds: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created organization "${orgName}" (${orgId}).`);
}

await auth.setCustomUserClaims(user.uid, { role: "admin", organizationId: orgId });

await db.collection("users").doc(user.uid).set(
  {
    uid: user.uid,
    email,
    role: "admin",
    organizationId: orgId,
    status: "active",
    teamIds: [],
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
);

await db.collection("organizations").doc(orgId).set(
  {
    ownerId: user.uid,
    adminIds: FieldValue.arrayUnion(user.uid),
    memberIds: FieldValue.arrayUnion(user.uid),
    updatedAt: new Date().toISOString(),
  },
  { merge: true }
);

console.log(
  `${email} (${user.uid}) is now the Admin of "${orgName}" (${orgId}). ` +
    "They must log out and back in (or wait for their ID token to refresh) for it to take effect."
);
