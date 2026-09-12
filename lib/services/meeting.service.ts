import {
  collection,
  deleteDoc,
  doc,
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
import type { Meeting, MeetingStatus } from "@/types/meeting";

function meetingFromDoc(docSnap: QueryDocumentSnapshot): Meeting {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    title: data.title,
    description: data.description ?? "",
    projectId: data.projectId ?? null,
    organizerId: data.organizerId,
    participantIds: data.participantIds ?? [],
    startAt: toIso(data.startAt),
    endAt: toIso(data.endAt),
    status: data.status ?? "Scheduled",
    notes: data.notes ?? "",
    meetingLink: data.meetingLink ?? null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function byStartAtAsc(a: Meeting, b: Meeting): number {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

/**
 * A regular member only ever sees meetings they organize or attend — never
 * every meeting in the organization (unlike projects/tasks, which are
 * org-wide readable). Two separate equality/array-contains queries merged
 * client-side (never a single OR query) — same reasoning this repo already
 * applies elsewhere: firestore.rules' read rule needs to be provable
 * directly from each query's own filter, and organizerId==uid /
 * participantIds array-contains uid are two different provable shapes that
 * don't collapse into one query.
 */
export function subscribeToMyMeetings(
  organizationId: string,
  uid: string,
  onData: (meetings: Meeting[]) => void,
  onError: (message: string) => void
): () => void {
  const organized = new Map<string, Meeting>();
  const attended = new Map<string, Meeting>();

  function emit() {
    const merged = new Map([...organized, ...attended]);
    onData(Array.from(merged.values()).sort(byStartAtAsc));
  }

  const unsubOrganized = onSnapshot(
    query(collection(db, "meetings"), where("organizationId", "==", organizationId), where("organizerId", "==", uid)),
    (snapshot) => {
      organized.clear();
      snapshot.docs.forEach((d) => organized.set(d.id, meetingFromDoc(d)));
      emit();
    },
    (error) => onError(getFirestoreErrorMessage(error, "meetings:organized"))
  );
  const unsubAttended = onSnapshot(
    query(collection(db, "meetings"), where("organizationId", "==", organizationId), where("participantIds", "array-contains", uid)),
    (snapshot) => {
      attended.clear();
      snapshot.docs.forEach((d) => attended.set(d.id, meetingFromDoc(d)));
      emit();
    },
    (error) => onError(getFirestoreErrorMessage(error, "meetings:attended"))
  );

  return () => {
    unsubOrganized();
    unsubAttended();
  };
}

/** Admin/Super Admin oversight — every meeting in the organization, not just one's own. */
export function subscribeToOrgMeetings(
  organizationId: string,
  onData: (meetings: Meeting[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "meetings"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(meetingFromDoc).sort(byStartAtAsc)),
    (error) => onError(getFirestoreErrorMessage(error, "meetings:org"))
  );
}

export interface MeetingInput {
  organizationId: string;
  organizerId: string;
  title: string;
  description: string;
  projectId: string | null;
  participantIds: string[];
  startAt: string;
  endAt: string;
  notes: string;
  meetingLink: string | null;
}

export async function createMeeting(input: MeetingInput): Promise<string> {
  try {
    const ref = doc(collection(db, "meetings"));
    const now = serverTimestamp();
    await setDoc(ref, { ...input, status: "Scheduled" satisfies MeetingStatus, createdAt: now, updatedAt: now });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "meetings:create"));
  }
}

export async function updateMeeting(
  meetingId: string,
  patch: Partial<Omit<MeetingInput, "organizationId" | "organizerId">> & { status?: MeetingStatus }
): Promise<void> {
  try {
    await updateDoc(doc(db, "meetings", meetingId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "meetings:update"));
  }
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "meetings", meetingId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "meetings:delete"));
  }
}
