import "server-only";
import { randomBytes, createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { logActivity } from "@/lib/server/activity";
import { sendInvitationEmail, EmailNotConfiguredError, EmailDeliveryError } from "@/lib/server/email";
import { reserveUserId, releaseUserId, attachUidToUserId } from "@/lib/server/user-ids";
import type { InvitationRole, InvitationStatus, PlatformInvitation, PublicInvitationView } from "@/types/invitation";
import type { EmploymentType, FunctionalRole } from "@/types/user";

const INVITATION_TTL_DAYS = Number(process.env.INVITATION_TTL_DAYS ?? 7);

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiryFromNow(): string {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function invitationFromDoc(id: string, data: FirebaseFirestore.DocumentData): PlatformInvitation {
  return {
    id,
    organizationId: data.organizationId,
    invitedBy: data.invitedBy,
    email: data.email,
    name: data.name,
    role: data.role,
    teamId: data.teamId,
    projectIds: data.projectIds ?? [],
    functionalRole: data.functionalRole ?? null,
    employmentType: data.employmentType ?? null,
    userId: data.userId ?? null,
    collegeName: data.collegeName ?? null,
    branch: data.branch ?? null,
    passedOutYear: data.passedOutYear ?? null,
    academicYear: data.academicYear ?? null,
    domain: data.domain ?? null,
    secondaryDomain: data.secondaryDomain ?? null,
    linkedinUrl: data.linkedinUrl ?? null,
    githubUrl: data.githubUrl ?? null,
    phone: data.phone ?? null,
    emailSent: data.emailSent ?? false,
    status: data.status,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    acceptedAt: data.acceptedAt ?? null,
    cancelledAt: data.cancelledAt ?? null,
  };
}

export interface CreateInvitationInput {
  organizationId: string;
  invitedBy: string;
  email: string;
  name: string;
  role: InvitationRole;
  teamId: string | null;
  projectIds: string[];
  functionalRole: FunctionalRole | null;
  employmentType: EmploymentType | null;
  /** Raw (un-normalized) User ID, or null. Reserved atomically before the invitation is created — see lib/server/user-ids.ts. */
  userId: string | null;
  collegeName: string | null;
  branch: string | null;
  passedOutYear: number | null;
  academicYear: string | null;
  domain: string | null;
  secondaryDomain: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  phone: string | null;
}

export async function createInvitation(input: CreateInvitationInput): Promise<{ invitation: PlatformInvitation; rawToken: string }> {
  const db = getAdminDb();
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingPending = await db
    .collection("invitations")
    .where("organizationId", "==", input.organizationId)
    .where("email", "==", normalizedEmail)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingPending.empty) {
    throw new ApiError(409, "There's already a pending invitation for this email.");
  }

  const existingUser = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (!existingUser.empty) {
    throw new ApiError(409, "A user with this email already has a TASKORA account.");
  }

  const rawToken = generateToken();
  const now = new Date().toISOString();
  const ref = db.collection("invitations").doc();

  // Reserve the User ID BEFORE writing the invitation — if this throws
  // (already taken), no invitation doc is created at all, so a failed
  // attempt never leaves a dangling pending invitation behind.
  let userId: string | null = null;
  if (input.userId) {
    userId = await reserveUserId(input.userId, input.organizationId, ref.id);
  }

  const record = {
    organizationId: input.organizationId,
    invitedBy: input.invitedBy,
    email: normalizedEmail,
    name: input.name,
    role: input.role,
    teamId: input.teamId,
    projectIds: input.projectIds,
    functionalRole: input.functionalRole,
    employmentType: input.employmentType,
    userId,
    collegeName: input.collegeName,
    branch: input.branch,
    passedOutYear: input.passedOutYear,
    academicYear: input.academicYear,
    domain: input.domain,
    secondaryDomain: input.secondaryDomain,
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
    phone: input.phone,
    // Set once the caller (the Route Handler, which owns the actual send
    // attempt — it needs org/team lookups already in scope there) knows the
    // real outcome — see setInvitationEmailStatus below. Never optimistic.
    emailSent: false,
    status: "pending" as InvitationStatus,
    tokenHash: hashToken(rawToken),
    expiresAt: expiryFromNow(),
    createdAt: now,
    acceptedAt: null,
    cancelledAt: null,
  };

  try {
    await ref.set(record);
  } catch (error) {
    // Roll back the reservation if the invitation write itself fails, so a
    // transient Firestore error never permanently locks a User ID.
    if (userId) await releaseUserId(userId).catch(() => {});
    throw error;
  }

  await logActivity({
    organizationId: input.organizationId,
    actorId: input.invitedBy,
    actorName: input.name,
    action: "user_invited",
    entityType: "invitation",
    entityId: ref.id,
    entityName: input.name,
  });

  return { invitation: invitationFromDoc(ref.id, record), rawToken };
}

export async function resendInvitation(invitationId: string, organizationId: string): Promise<{ invitation: PlatformInvitation; rawToken: string }> {
  const db = getAdminDb();
  const ref = db.collection("invitations").doc(invitationId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.organizationId !== organizationId) {
    throw new ApiError(404, "Invitation not found.");
  }
  if (snap.data()?.status === "cancelled") {
    throw new ApiError(400, "This invitation was cancelled — send a new one instead.");
  }

  const rawToken = generateToken();
  // Reset emailSent — this resend's own outcome (set via
  // setInvitationEmailStatus once the caller actually attempts it) is what
  // matters now, not whatever the previous attempt did.
  const patch = { status: "pending" as InvitationStatus, tokenHash: hashToken(rawToken), expiresAt: expiryFromNow(), emailSent: false };
  await ref.update(patch);

  const data = { ...snap.data(), ...patch } as FirebaseFirestore.DocumentData;
  return { invitation: invitationFromDoc(ref.id, data), rawToken };
}

/** Records whether the most recent send attempt (create or resend) was actually accepted by the email provider. Never affects invitation validity/expiry/status. */
export async function setInvitationEmailStatus(invitationId: string, emailSent: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection("invitations").doc(invitationId).update({ emailSent });
}

export interface AttemptInvitationEmailInput {
  invitationId: string;
  email: string;
  name: string;
  role: InvitationRole;
  teamId: string | null;
  organizationId: string;
  expiresAt: string;
  invitationUrl: string;
  inviterName: string;
}

/**
 * The one real, unconditional Resend send attempt — used by both invitation
 * creation (when email delivery isn't skipped — see EMAIL_DELIVERY_OPTIONAL
 * in app/api/invitations/route.ts) and the explicit "Send Email" action
 * (app/api/invitations/[id]/resend/route.ts), which always attempts a real
 * send regardless of environment since it's a deliberate Admin action.
 * Never claims success unless the provider actually accepted the message —
 * records the real outcome on the invitation doc either way.
 */
export async function attemptInvitationEmail(input: AttemptInvitationEmailInput): Promise<{ emailSent: boolean; emailError: string | null }> {
  let emailSent = false;
  let emailError: string | null = null;
  try {
    const db = getAdminDb();
    const [orgSnap, teamSnap] = await Promise.all([
      db.collection("organizations").doc(input.organizationId).get(),
      input.teamId ? db.collection("teams").doc(input.teamId).get() : Promise.resolve(null),
    ]);
    // "Administrators" only makes sense for an actual admin invite (which
    // never has a team). A teamless USER invite — a supported case since
    // teams are optional at invite time — must not be mislabeled as one.
    const teamName = teamSnap ? ((teamSnap.data()?.name as string) ?? "—") : input.role === "admin" ? "Administrators" : null;

    await sendInvitationEmail({
      recipientEmail: input.email,
      recipientName: input.name,
      organizationName: (orgSnap.data()?.name as string) ?? "your organization",
      teamName,
      inviterName: input.inviterName,
      invitationUrl: input.invitationUrl,
      expiresAt: input.expiresAt,
    });
    emailSent = true;
  } catch (error) {
    // The invitation record itself is still valid and useful (the admin can
    // copy the link manually) even if delivery failed — never claim
    // delivery succeeded when it didn't.
    emailError =
      error instanceof EmailNotConfiguredError
        ? "Email delivery is not yet testable because the transactional email provider is not configured."
        : error instanceof EmailDeliveryError
          ? "The email provider rejected the request."
          : "We couldn't send the invitation email.";
    // Server-log-only — .message on EmailDeliveryError is the provider's own
    // message, never a token/key, but still never surfaced to the client.
    console.error(`[invite] email delivery failed for invitation ${input.invitationId}:`, error instanceof Error ? error.message : error);
  }
  await setInvitationEmailStatus(input.invitationId, emailSent);
  return { emailSent, emailError };
}

export async function cancelInvitation(invitationId: string, organizationId: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("invitations").doc(invitationId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.organizationId !== organizationId) {
    throw new ApiError(404, "Invitation not found.");
  }
  await ref.update({ status: "cancelled" satisfies InvitationStatus, cancelledAt: new Date().toISOString() });

  // Free the User ID for reuse — only if it was never actually activated
  // (an accepted invitation's reservation must never be released; acceptance
  // is guarded separately by status checks in acceptInvitation, so this only
  // ever runs for a still-pending invitation).
  const userId = snap.data()?.userId;
  if (typeof userId === "string" && userId) {
    await releaseUserId(userId).catch(() => {});
  }
}

async function findInvitationByToken(rawToken: string) {
  const db = getAdminDb();
  const tokenHash = hashToken(rawToken);
  const snap = await db.collection("invitations").where("tokenHash", "==", tokenHash).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ref: doc.ref, invitation: invitationFromDoc(doc.id, doc.data()) };
}

/** Public, read-only validation for the /invite/[token] page — never returns tokenHash, invitedBy, or the invitation id. */
export async function getPublicInvitationView(rawToken: string): Promise<PublicInvitationView> {
  const found = await findInvitationByToken(rawToken);
  if (!found) throw new ApiError(404, "This invitation link is invalid.");
  const { invitation } = found;

  const effectiveStatus: InvitationStatus =
    invitation.status === "pending" && new Date(invitation.expiresAt).getTime() < Date.now() ? "expired" : invitation.status;

  const db = getAdminDb();
  const [orgSnap, teamSnap, projectSnaps] = await Promise.all([
    db.collection("organizations").doc(invitation.organizationId).get(),
    invitation.teamId ? db.collection("teams").doc(invitation.teamId).get() : Promise.resolve(null),
    Promise.all(invitation.projectIds.map((id) => db.collection("projects").doc(id).get())),
  ]);

  return {
    status: effectiveStatus,
    organizationName: (orgSnap.data()?.name as string) ?? "your organization",
    teamName: teamSnap ? ((teamSnap.data()?.name as string) ?? "—") : null,
    projectNames: projectSnaps.filter((s) => s.exists).map((s) => (s.data()?.name as string) ?? "—"),
    role: invitation.role,
    name: invitation.name,
    email: invitation.email,
    userId: invitation.userId,
    collegeName: invitation.collegeName,
    domain: invitation.domain,
  };
}

export interface AcceptInvitationInput {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInvitationResult {
  uid: string;
  organizationId: string;
}

/**
 * The critical PHASE 10/11 flow: validates the invitation, creates the real
 * Firebase Auth account (idempotent — safe to retry), creates users/{uid},
 * grants org/team membership, sets role + organizationId as custom claims
 * (never client-settable), and marks the invitation accepted. Firestore
 * writes are batched atomically; the Auth account creation itself can't
 * join that batch (different service), so it's sequenced first and guarded
 * against "already exists" to avoid duplicate accounts on retry.
 */
export async function acceptInvitation(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
  const found = await findInvitationByToken(input.token);
  if (!found) throw new ApiError(404, "This invitation link is invalid.");
  const { ref, invitation } = found;

  if (invitation.status === "cancelled") throw new ApiError(410, "This invitation was cancelled.");
  if (invitation.status === "accepted") throw new ApiError(410, "This invitation has already been accepted.");
  if (invitation.status === "expired" || new Date(invitation.expiresAt).getTime() < Date.now()) {
    throw new ApiError(410, "This invitation has expired.");
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  let uid: string;
  try {
    const created = await auth.createUser({
      email: invitation.email,
      password: input.password,
      displayName: input.name,
      emailVerified: true,
    });
    uid = created.uid;
  } catch (error) {
    if (isAuthError(error) && error.code === "auth/email-already-exists") {
      // Retry-safe: the account was already created by a previous attempt at
      // this same acceptance (e.g. the client retried after a network blip
      // on the Firestore step below). Reuse it instead of failing.
      const existing = await auth.getUserByEmail(invitation.email);
      uid = existing.uid;
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(uid, { role: invitation.role, organizationId: invitation.organizationId });

  const now = new Date().toISOString();
  const batch = db.batch();

  batch.set(
    db.collection("users").doc(uid),
    {
      uid,
      name: input.name,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      teamIds: invitation.teamId ? [invitation.teamId] : [],
      functionalRole: invitation.functionalRole,
      employmentType: invitation.employmentType,
      userId: invitation.userId,
      collegeName: invitation.collegeName,
      branch: invitation.branch,
      passedOutYear: invitation.passedOutYear,
      academicYear: invitation.academicYear,
      domain: invitation.domain,
      secondaryDomain: invitation.secondaryDomain,
      linkedinUrl: invitation.linkedinUrl,
      githubUrl: invitation.githubUrl,
      phone: invitation.phone,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const orgRef = db.collection("organizations").doc(invitation.organizationId);
  const orgUpdate: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
    memberIds: FieldValue.arrayUnion(uid),
    updatedAt: now,
  };
  if (invitation.role === "admin") {
    orgUpdate.adminIds = FieldValue.arrayUnion(uid);
    const orgSnap = await orgRef.get();
    if (!orgSnap.data()?.ownerId) orgUpdate.ownerId = uid;
  }
  batch.update(orgRef, orgUpdate);

  if (invitation.teamId) {
    batch.update(db.collection("teams").doc(invitation.teamId), {
      memberIds: FieldValue.arrayUnion(uid),
      updatedAt: now,
    });
  }

  // Project assignment(s) chosen by the Admin at invite time — the same
  // memberIds arrayUnion pattern every other project-membership grant in
  // this app already uses; there is no separate projectIds field on
  // users/{uid} (project membership's source of truth has always been
  // projects.memberIds, never the user doc — see admin-users-view's
  // existing (buggy, now-fixed) projectIds derivation).
  for (const projectId of invitation.projectIds) {
    batch.update(db.collection("projects").doc(projectId), {
      memberIds: FieldValue.arrayUnion(uid),
      updatedAt: now,
    });
  }

  batch.update(ref, { status: "accepted" satisfies InvitationStatus, acceptedAt: now });

  await batch.commit();

  if (invitation.userId) {
    await attachUidToUserId(invitation.userId, uid).catch((error) => {
      // Non-fatal: the account is fully activated either way; only
      // login-by-User-ID would be affected, and email/password login always
      // still works. Logged for visibility, never surfaced to the candidate.
      console.error(`[invite] failed to attach uid to User ID ${invitation.userId}:`, error);
    });
  }

  await logActivity({
    organizationId: invitation.organizationId,
    actorId: uid,
    actorName: input.name,
    action: "user_accepted_invitation",
    entityType: "user",
    entityId: uid,
    entityName: input.name,
  });

  return { uid, organizationId: invitation.organizationId };
}

function isAuthError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string";
}
