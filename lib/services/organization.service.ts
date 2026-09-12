import { collection, doc, onSnapshot, updateDoc, serverTimestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import { apiFetch } from "@/lib/api-client";
import type { OrganizationDoc } from "@/types/organization";

function orgFromDoc(docSnap: QueryDocumentSnapshot): OrganizationDoc {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? "",
    industry: data.industry,
    contactEmail: data.contactEmail,
    plan: data.plan,
    ownerId: data.ownerId ?? "",
    adminIds: data.adminIds ?? [],
    memberIds: data.memberIds ?? [],
    status: data.status,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function subscribeToOrganization(
  organizationId: string,
  onData: (organization: OrganizationDoc | null) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    doc(db, "organizations", organizationId),
    (snapshot) => onData(snapshot.exists() ? orgFromDoc(snapshot as QueryDocumentSnapshot) : null),
    (error) => onError(getFirestoreErrorMessage(error, "organizations"))
  );
}

/** Super Admin only — enforced by firestore.rules, not just this function. */
export function subscribeToAllOrganizations(
  onData: (organizations: OrganizationDoc[]) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    collection(db, "organizations"),
    (snapshot) => onData(snapshot.docs.map(orgFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "organizations:all"))
  );
}

/** Self-serve — creates a brand-new organization and makes the caller its admin. See app/api/organizations/self-serve/route.ts. */
export function claimNewOrganization(input: { name: string; description?: string }): Promise<{ organization: OrganizationDoc }> {
  return apiFetch<{ organization: OrganizationDoc }>("/api/organizations/self-serve", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Only non-sensitive profile fields — slug/ownerId/adminIds/memberIds/status are server-controlled (see firestore.rules). */
export async function updateOrganizationProfile(
  organizationId: string,
  patch: { name?: string; description?: string; industry?: string; contactEmail?: string }
): Promise<void> {
  try {
    await updateDoc(doc(db, "organizations", organizationId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "organizations:update"));
  }
}
