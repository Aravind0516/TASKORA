import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
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
import { apiFetch } from "@/lib/api-client";
import type { Project, ProjectPriority, ProjectStatus, RepositoryProvider } from "@/types/project";

function projectFromDoc(docSnap: QueryDocumentSnapshot): Project {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    teamId: data.teamId,
    name: data.name,
    description: data.description,
    status: data.status,
    priority: data.priority,
    progress: data.progress,
    startDate: data.startDate,
    dueDate: data.dueDate,
    ownerId: data.ownerId,
    managerId: data.managerId ?? null,
    memberIds: data.memberIds ?? [],
    archived: Boolean(data.archived),
    // Absent on every project created before Work Verification existed —
    // default to "off"/"none" so an existing project's behavior is
    // completely unchanged until an Admin deliberately opts it in.
    repositoryUrl: data.repositoryUrl ?? null,
    repositoryProvider: data.repositoryProvider ?? "NONE",
    memberAssignmentVersions: (data.memberAssignmentVersions as Record<string, number> | undefined) ?? {},
    workVerificationEnabled: Boolean(data.workVerificationEnabled),
    verificationFrequency: data.verificationFrequency ?? "DAILY",
    submissionStatus: data.submissionStatus === "SUBMITTED" ? "SUBMITTED" : "NONE",
    submittedAt: data.submittedAt ? toIso(data.submittedAt) : null,
    requirementDocument: data.requirementDocument ?? null,
    // Absent on every project created before this field existed — default
    // to "" (never null/undefined) so callers can always treat it as a
    // plain string, matching `description`.
    requirements: typeof data.requirements === "string" ? data.requirements : "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function subscribeToProjects(
  organizationId: string,
  onData: (projects: Project[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "projects"), where("organizationId", "==", organizationId), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(projectFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "projects"))
  );
}

export function subscribeToProject(
  organizationId: string,
  projectId: string,
  onData: (project: Project | null) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    doc(db, "projects", projectId),
    (snapshot) => {
      if (!snapshot.exists() || snapshot.data().organizationId !== organizationId) {
        onData(null);
        return;
      }
      onData(projectFromDoc(snapshot as QueryDocumentSnapshot));
    },
    (error) => onError(getFirestoreErrorMessage(error, "project"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllProjects(onData: (projects: Project[]) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    query(collection(db, "projects"), orderBy("updatedAt", "desc")),
    (snapshot) => onData(snapshot.docs.map(projectFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "projects:all"))
  );
}

/**
 * A plain member's own projects only — NOT every project in the
 * organization. Projects may be assigned to specific employees; organization
 * membership alone must never be sufficient to see a project someone hasn't
 * been added to. Two separate listeners (a project's assigned manager isn't
 * necessarily also in memberIds, and vice versa) merged and de-duplicated by
 * project id — each query constrains exactly the field firestore.rules'
 * corresponding read branch checks (managerId or memberIds), directly off
 * the project document itself with no get() involved, so both are provably
 * safe for any org member regardless of which projects exist. Admin/Super
 * Admin keep using subscribeToProjects (unrestricted, unchanged) instead —
 * this is for role "user" callers only (see workspace-provider.tsx).
 */
export function subscribeToMyProjects(
  organizationId: string,
  uid: string,
  onData: (projects: Project[]) => void,
  onError: (message: string) => void
): () => void {
  const managed = new Map<string, Project>();
  const asMember = new Map<string, Project>();
  function emit() {
    const merged = new Map([...managed, ...asMember]);
    onData(Array.from(merged.values()));
  }
  const unsubManaged = onSnapshot(
    query(collection(db, "projects"), where("organizationId", "==", organizationId), where("managerId", "==", uid)),
    (snapshot) => {
      managed.clear();
      snapshot.docs.forEach((d) => managed.set(d.id, projectFromDoc(d)));
      emit();
    },
    (error) => onError(getFirestoreErrorMessage(error, "projects:mine:managed"))
  );
  const unsubMember = onSnapshot(
    query(collection(db, "projects"), where("organizationId", "==", organizationId), where("memberIds", "array-contains", uid)),
    (snapshot) => {
      asMember.clear();
      snapshot.docs.forEach((d) => asMember.set(d.id, projectFromDoc(d)));
      emit();
    },
    (error) => onError(getFirestoreErrorMessage(error, "projects:mine:member"))
  );
  return () => {
    unsubManaged();
    unsubMember();
  };
}

export interface ProjectInput {
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
  ownerId: string;
  managerId: string | null;
  memberIds: string[];
  repositoryUrl?: string | null;
  /** See types/project.ts — pass only when the save newly assigns someone. */
  memberAssignmentVersions?: Record<string, number>;
  workVerificationEnabled?: boolean;
  /** Plain-text project requirements — see types/project.ts's `requirements`. */
  requirements?: string;
}

/** github.com/... vs. anything else — evidence-context labeling only, never used to decide what TASKORA trusts. */
export function inferRepositoryProvider(repositoryUrl: string | null | undefined): RepositoryProvider {
  return repositoryUrl && /(^|\/\/)(www\.)?github\.com\//i.test(repositoryUrl) ? "GITHUB" : "NONE";
}

export async function createProject(input: ProjectInput): Promise<string> {
  try {
    const ref = doc(collection(db, "projects"));
    const now = serverTimestamp();
    await setDoc(ref, {
      ...input,
      progress: input.status === "Completed" ? 100 : 0,
      archived: false,
      repositoryUrl: input.repositoryUrl?.trim() || null,
      repositoryProvider: inferRepositoryProvider(input.repositoryUrl),
      workVerificationEnabled: Boolean(input.workVerificationEnabled),
      verificationFrequency: "DAILY",
      requirements: input.requirements ?? "",
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:create"));
  }
}

export async function updateProject(
  projectId: string,
  patch: Partial<ProjectInput> & { progress?: number; archived?: boolean }
): Promise<void> {
  try {
    const { repositoryUrl, ...rest } = patch;
    await updateDoc(doc(db, "projects", projectId), {
      ...rest,
      ...(repositoryUrl !== undefined
        ? { repositoryUrl: repositoryUrl?.trim() || null, repositoryProvider: inferRepositoryProvider(repositoryUrl) }
        : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:update"));
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "projects", projectId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:delete"));
  }
}

export interface SubmitProjectResult {
  onTime: boolean;
  awardedCount: number;
}

/**
 * The formal "submit" milestone — goes through the Admin SDK (see
 * lib/server/project-submission.ts) rather than a plain client write,
 * because it must use a SERVER timestamp (never the browser clock) to
 * decide on-time vs late, and because it fans out PROJECT_SUBMISSION/
 * ON_TIME_PROJECT credit awards to every project member atomically.
 */
export function submitProject(projectId: string): Promise<SubmitProjectResult> {
  return apiFetch<SubmitProjectResult>(`/api/projects/${projectId}/submit`, { method: "POST" });
}
