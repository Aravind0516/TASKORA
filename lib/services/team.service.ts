import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { Team } from "@/types/team";

function teamFromDoc(docSnap: QueryDocumentSnapshot): Team {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    name: data.name,
    description: data.description ?? "",
    leadUserId: data.leadUserId ?? null,
    memberIds: data.memberIds ?? [],
    createdBy: data.createdBy,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function subscribeToTeams(
  organizationId: string,
  onData: (teams: Team[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "teams"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(teamFromDoc).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())),
    (error) => onError(getFirestoreErrorMessage(error, "teams"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllTeams(onData: (teams: Team[]) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    collection(db, "teams"),
    (snapshot) => onData(snapshot.docs.map(teamFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "teams:all"))
  );
}

export interface TeamInput {
  name: string;
  description: string;
  /** null = no Team Lead assigned yet — a team never requires one to be created. */
  leadUserId?: string | null;
  memberIds?: string[];
}

export async function createTeam(organizationId: string, createdBy: string, input: TeamInput): Promise<string> {
  try {
    const ref = doc(collection(db, "teams"));
    const now = serverTimestamp();
    await setDoc(ref, {
      organizationId,
      name: input.name,
      description: input.description,
      leadUserId: input.leadUserId ?? null,
      memberIds: input.memberIds ?? [],
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "teams:create"));
  }
}

export async function updateTeam(teamId: string, patch: Partial<TeamInput>): Promise<void> {
  try {
    await updateDoc(doc(db, "teams", teamId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "teams:update"));
  }
}

export async function deleteTeam(teamId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "teams", teamId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "teams:delete"));
  }
}

/** Adds a user to a team's roster — used when an Admin assigns an existing user to an existing team from the Users page. */
export async function addMember(teamId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "teams", teamId), { memberIds: arrayUnion(uid), updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "teams:addMember"));
  }
}

/** Removes a user from a team's roster — the other half of reassigning a user to a different team. */
export async function removeMember(teamId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "teams", teamId), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "teams:removeMember"));
  }
}
