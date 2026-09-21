import "server-only";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Firebase Admin SDK — server-only. Every privileged operation in this app
// (creating organizations/admins, issuing invitations, accepting an
// invitation and creating the real Firebase Auth account, setting role
// custom claims) goes through this module from a Route Handler, never from
// a client component. The `server-only` import above makes any accidental
// client-side import of this file a build error instead of a leaked secret.

// A real Firebase/GCP project ID is lowercase letters, digits and hyphens
// only. This is a hard rejection, not a strip-and-continue: a value that
// fails this (contains "=", "_", uppercase letters, or whitespace) is
// exactly the shape of pasting a whole ".env" line — name, "=", and all —
// into a hosting dashboard's Value field instead of just the value, which
// is precisely what broke this once already, silently, as a confusing
// token-audience mismatch far away from the actual misconfiguration.
// Failing loudly at init instead surfaces it as a clear, safe log line the
// moment the wrong value is deployed.
function isPlainProjectId(value: string): boolean {
  return /^[a-z][a-z0-9-]{3,62}$/.test(value);
}

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const missing = [
    !projectId && "FIREBASE_ADMIN_PROJECT_ID",
    !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
    !rawPrivateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`[admin] Missing Firebase Admin env var(s): ${missing.join(", ")}`);
    return null;
  }

  if (!isPlainProjectId(projectId!)) {
    console.error(
      `[admin] FIREBASE_ADMIN_PROJECT_ID is malformed (length ${projectId!.length}). ` +
        `It must be only the bare project ID (e.g. "taskora-38082") — never the variable ` +
        `name, an "=" sign, or surrounding whitespace/quotes. Check the value stored in the ` +
        `hosting provider's environment variables, not just that the variable exists.`
    );
    return null;
  }

  // Private keys are typically stored with literal "\n" sequences in env
  // files/hosting dashboards — they must be un-escaped before use. Some
  // dashboards also preserve a wrapping quote pair verbatim if the value was
  // pasted including the quotes (e.g. copied straight out of the
  // "private_key" field of a downloaded service-account JSON file, quotes
  // and all) — a .env file's parser strips those automatically, but a
  // hosting dashboard's env var UI stores exactly what was typed, so that
  // mistake only surfaces once deployed, never locally.
  let privateKey = rawPrivateKey!.trim();
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----") || !privateKey.trimEnd().endsWith("-----END PRIVATE KEY-----")) {
    console.error(
      `[admin] FIREBASE_ADMIN_PRIVATE_KEY does not look like a valid PEM key after parsing ` +
        `(length ${privateKey.length}, starts with PEM header: ${privateKey.startsWith("-----BEGIN PRIVATE KEY-----")}). ` +
        `Check the stored value for surrounding quotes, truncation, or extra whitespace — never its content.`
    );
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App {
  if (getApps().length) return getApp();

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY (server-only env vars, " +
        "never NEXT_PUBLIC_*) — see .env.example."
    );
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

/** Lazy — only throws (missing-credentials) the first time a Route Handler actually calls it, not at module load / build time. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Server-side documents (organizations, invitations, etc.) are built from
 * TypeScript interfaces with optional fields — e.g. `industry?`,
 * `contactEmail?` on OrganizationDoc — that are simply omitted by callers
 * rather than given a value, which JS represents as `undefined`. The Admin
 * SDK's Firestore client throws on any `undefined` field value by default
 * (unlike the client SDK, which silently drops them), so every write with
 * an omitted optional field would otherwise throw and surface as a bare
 * HTTP 500. `ignoreUndefinedProperties` makes the Admin SDK behave like the
 * client SDK here: drop `undefined` fields instead of throwing.
 *
 * `settings()` may only be called once per underlying Firestore instance —
 * a plain module-scoped boolean guard is NOT enough to enforce that: Next.js
 * (Turbopack, in dev especially) bundles each Route Handler as its own
 * module graph, so two different routes can each get a FRESH copy of this
 * file's module state (their own `let` would each start unset) while still
 * sharing the SAME underlying Firebase App/Firestore singleton via
 * getApps()/getApp() (which Firebase Admin keeps on a process-wide
 * registry). The result: route A's copy calls settings() successfully,
 * then route B's separate copy — believing it's the first caller — calls
 * settings() again on the SAME already-configured Firestore instance, which
 * throws "Firestore has already been initialized." Catching exactly that
 * error (never any other) treats it as the benign, idempotent no-op it
 * actually is: another module copy already applied the identical settings.
 */
export function getAdminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    const alreadyInitialized = error instanceof Error && error.message.includes("already been initialized");
    if (!alreadyInitialized) throw error;
  }
  return db;
}
