import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { EmploymentType, FunctionalRole, UserProfile, UserRecord, UserRole, UserStatus } from "@/types/user";

interface CreateUserProfileInput {
  name: string;
  email: string;
}

/**
 * Public self-registration ("Get Started"). Always creates role "user" with
 * no organization — firestore.rules enforces this server-side regardless of
 * what this function sends, so this isn't just client-side politeness. A
 * self-registered account only gains an organization by accepting an
 * invitation (lib/server/invitations.ts), which is a separate Auth account
 * lifecycle entirely (see components/invitations/invite-landing-view.tsx).
 */
export async function createUserProfile(uid: string, { name, email }: CreateUserProfileInput): Promise<void> {
  const profile: UserProfile = {
    uid,
    name,
    email,
    role: "user",
    organizationId: null,
    teamIds: [],
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", uid), profile);
}

export async function updateUserProfile(uid: string, patch: { name: string; title?: string; functionalRole?: FunctionalRole }): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "users:update"));
  }
}

/** Self-editable only — see firestore.rules' users/{uid} update rule (isSelf branch). */
export async function updateNotificationPreferences(uid: string, notificationPreferences: Record<string, boolean>): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { notificationPreferences, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "users:updateNotificationPreferences"));
  }
}

export interface SessionIdentity {
  role: UserRole;
  organizationId: string | null;
}

/**
 * Authoritative role/organization lookup — reads the signed-in user's own
 * Firebase ID token custom claims (set exclusively by the Admin SDK on
 * invitation acceptance; see PHASE 19). Never a Firestore read: the token
 * itself is the server-issued, tamper-proof source of truth, and every
 * Firestore security rule checks these exact same claims. A self-registered
 * account has no claims at all, which correctly resolves to the
 * least-privileged "user" with no organization.
 *
 * Pass `forceRefresh: true` right after an operation that may have changed
 * the current user's own claims (e.g. just became an org's first admin).
 */
export async function getSessionIdentity(user: User, forceRefresh = false): Promise<SessionIdentity> {
  try {
    const result = await user.getIdTokenResult(forceRefresh);
    const role = result.claims.role;
    const organizationId = result.claims.organizationId;
    return {
      role: role === "super_admin" || role === "admin" ? role : "user",
      organizationId: typeof organizationId === "string" ? organizationId : null,
    };
  } catch (error) {
    console.error("Failed to read session claims", error);
    return { role: "user", organizationId: null };
  }
}

function userFromDoc(docSnap: QueryDocumentSnapshot | DocumentSnapshot): UserRecord {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    uid: docSnap.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    organizationId: data.organizationId ?? null,
    teamIds: data.teamIds ?? [],
    title: data.title,
    functionalRole: data.functionalRole as FunctionalRole | undefined,
    notificationPreferences: data.notificationPreferences ?? undefined,
    status: (data.status ?? "active") as UserStatus,
    userId: data.userId ?? undefined,
    employmentType: data.employmentType as EmploymentType | undefined,
    collegeName: data.collegeName ?? undefined,
    branch: data.branch ?? undefined,
    passedOutYear: data.passedOutYear ?? undefined,
    academicYear: data.academicYear ?? undefined,
    domain: data.domain ?? undefined,
    secondaryDomain: data.secondaryDomain ?? undefined,
    linkedinUrl: data.linkedinUrl ?? undefined,
    githubUrl: data.githubUrl ?? undefined,
    phone: data.phone ?? undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** One user's own (or, for an Admin, any org member's) real-time record — used by the intern dashboard, My Profile, and the admin user detail view instead of a separate profile collection. */
export function subscribeToUser(uid: string, onData: (user: UserRecord | null) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => onData(snap.exists() ? userFromDoc(snap) : null),
    (error) => onError(getFirestoreErrorMessage(error, "users:self"))
  );
}

export async function getUserOnce(uid: string): Promise<UserRecord | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? userFromDoc(snap) : null;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "users:getOnce"));
  }
}

/** Real-time roster of every user in one organization — used by both the Admin Users page and the real User-facing Team page. */
export function subscribeToOrgUsers(
  organizationId: string,
  onData: (users: UserRecord[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "users"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(userFromDoc).sort((a, b) => a.name.localeCompare(b.name))),
    (error) => onError(getFirestoreErrorMessage(error, "users"))
  );
}

export function subscribeToAllUsers(
  onData: (users: UserRecord[]) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => onData(snapshot.docs.map(userFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "users:all"))
  );
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { status, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "users:updateStatus"));
  }
}

/** Assigns/reassigns which team(s) a user belongs to — Admin-only per firestore.rules (users/{uid} update allows "teamIds" for an admin of the same org). */
export async function updateUserTeams(uid: string, teamIds: string[]): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { teamIds, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "users:updateTeams"));
  }
}
