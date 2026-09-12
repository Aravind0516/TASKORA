import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { logActivity } from "@/lib/server/activity";
import type { OrganizationDoc, OrganizationPlan } from "@/types/organization";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface CreateOrganizationInput {
  name: string;
  description: string;
  industry?: string;
  contactEmail?: string;
  plan: OrganizationPlan;
  createdBy: string;
}

/**
 * PHASE 5 — organization creation is Super Admin-only and does not assign an
 * admin at the same time (matching the existing two-step Super Admin UI:
 * "Add Organization" then, separately, "Add Administrator"). The org exists
 * with no owner until its first admin invitation is accepted — see
 * lib/server/invitations.ts's acceptInvitation, which sets ownerId then.
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<OrganizationDoc> {
  const db = getAdminDb();
  const baseSlug = slugify(input.name) || "organization";

  let slug = baseSlug;
  let attempt = 1;
  while (!(await db.collection("organizations").where("slug", "==", slug).limit(1).get()).empty) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 20) throw new ApiError(500, "Couldn't generate a unique organization slug. Try a different name.");
  }

  const ref = db.collection("organizations").doc();
  const now = new Date().toISOString();
  const org: OrganizationDoc = {
    id: ref.id,
    name: input.name,
    slug,
    description: input.description,
    industry: input.industry,
    contactEmail: input.contactEmail,
    plan: input.plan,
    ownerId: "",
    adminIds: [],
    memberIds: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(org);

  await logActivity({
    organizationId: ref.id,
    actorId: input.createdBy,
    actorName: "Platform",
    action: "organization_created",
    entityType: "organization",
    entityId: ref.id,
    entityName: input.name,
  });

  return org;
}

export interface ClaimOrganizationInput {
  uid: string;
  name: string;
  description?: string;
}

/**
 * Self-serve "create your organization" — for a real, already-authenticated
 * account that isn't part of any organization yet. Creates a brand-new
 * organization and grants the CALLING account (only) role "admin" of it —
 * never an existing organization, never any other uid, never "super_admin".
 * This is the one place outside invitation-acceptance where role/
 * organizationId custom claims are granted, and it only ever runs for the
 * caller's own uid — see app/api/organizations/self-serve/route.ts, which
 * refuses the request outright if the caller already has an organizationId
 * (preventing an admin from spawning a duplicate org on every login, and
 * preventing an existing member from quietly leaving their real org).
 */
export async function claimNewOrganizationForSelf(input: ClaimOrganizationInput): Promise<OrganizationDoc> {
  const organization = await createOrganization({
    name: input.name,
    description: input.description ?? "",
    plan: "Free",
    createdBy: input.uid,
  });

  const auth = getAdminAuth();
  const db = getAdminDb();
  const now = new Date().toISOString();

  await auth.setCustomUserClaims(input.uid, { role: "admin", organizationId: organization.id });

  await db.collection("users").doc(input.uid).set(
    { role: "admin", organizationId: organization.id, status: "active", updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await db.collection("organizations").doc(organization.id).update({
    ownerId: input.uid,
    adminIds: FieldValue.arrayUnion(input.uid),
    memberIds: FieldValue.arrayUnion(input.uid),
    updatedAt: now,
  });

  return { ...organization, ownerId: input.uid, adminIds: [input.uid], memberIds: [input.uid] };
}

export async function setOrganizationStatus(organizationId: string, status: "active" | "suspended", actorId: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("organizations").doc(organizationId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "Organization not found.");

  await ref.update({ status, updatedAt: new Date().toISOString() });
  await logActivity({
    organizationId,
    actorId,
    actorName: "Platform",
    action: status === "suspended" ? "organization_suspended" : "organization_activated",
    entityType: "organization",
    entityId: organizationId,
    entityName: (snap.data()?.name as string) ?? organizationId,
  });
}
