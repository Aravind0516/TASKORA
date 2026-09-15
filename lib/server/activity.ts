import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ActivityEntityType, ActivityType } from "@/types/activity";

interface LogActivityInput {
  organizationId: string;
  actorId: string;
  actorName: string;
  action: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Server-controlled activity log writer — used by Route Handlers only.
 * Client writes to `activityLogs` are denied entirely by firestore.rules
 * (see PHASE 17: "prefer server-controlled creation for sensitive audit
 * events"), so every entry that matters (org/team/invitation/admin events)
 * is written here with the Admin SDK, which bypasses rules by design.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await getAdminDb().collection("activityLogs").add({
      ...input,
      metadata: input.metadata ?? {},
      // This writer is only ever called for sensitive platform events (see
      // doc comment above) — kept in sync with firestore.rules'
      // isSensitiveActivityAction() list. A plain member's activity query
      // filters on this field, so it never surfaces here.
      visibleToMembers: false,
      // Sensitive platform events (org/admin/invitation lifecycle) never
      // belong to a single project.
      projectId: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Never let an audit-log write failure fail the primary operation.
    console.error("[activity] failed to log", input.action, error);
  }
}
