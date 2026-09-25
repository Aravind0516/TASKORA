"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformRole } from "@/components/platform/use-platform-role";
import * as organizationService from "@/lib/services/organization.service";
import * as userService from "@/lib/services/user.service";
import * as teamService from "@/lib/services/team.service";
import * as projectService from "@/lib/services/project.service";
import * as taskService from "@/lib/services/task.service";
import * as activityService from "@/lib/services/activity.service";
import * as invitationService from "@/lib/services/invitation.service";
import * as notificationService from "@/lib/services/notification.service";
import { bumpAssignmentVersions, newlyAssignedIds, projectAssigneeIds, repositoryUrlError } from "@/lib/projects/assignment";
import { apiFetch } from "@/lib/api-client";
import { nowIso } from "@/lib/format";
import { systemServices as seedSystemServices } from "@/lib/mock-data/platform-data";
import type { OrganizationDoc } from "@/types/organization";
import type { UserRecord } from "@/types/user";
import type { Team } from "@/types/team";
import type { Project } from "@/types/project";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import type { ActivityLogEntry, ActivityType } from "@/types/activity";
import type { PlatformInvitation } from "@/types/invitation";
import type {
  Organization,
  PlatformAdmin,
  PlatformUser,
  PlatformTeam,
  PlatformProject,
  PlatformTask,
  PlatformActivityEntry,
  SystemServiceStatus,
} from "@/types/platform";

// This provider is the seam between the REAL multi-tenant Firestore backend
// (organizations/users/teams/projects/tasks/activityLogs/invitations, all
// scoped by organizationId — see firestore.rules) and the Admin/Super Admin
// UI built in the frontend-only phase, which expects the exact display
// shapes in types/platform.ts (Organization, PlatformAdmin, PlatformUser, …
// all Title-Case status/priority, matching StatusBadge/PersonStatusBadge).
// Every admin/superadmin view component is unchanged — only this file maps
// real Firestore documents into those display shapes.

function toDisplayOrg(doc: OrganizationDoc): Organization {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    industry: doc.industry ?? "",
    contactEmail: doc.contactEmail ?? "",
    plan: doc.plan,
    subscriptionStatus: doc.subscriptionStatus,
    trialStartedAt: doc.trialStartedAt,
    trialEndsAt: doc.trialEndsAt,
    subscriptionStartedAt: doc.subscriptionStartedAt,
    subscriptionEndsAt: doc.subscriptionEndsAt,
    status: doc.status === "suspended" ? "Suspended" : "Active",
    adminId: doc.adminIds[0] ?? "",
    createdAt: doc.createdAt,
    lastActivityAt: doc.updatedAt,
  };
}

function toDisplayUser(user: UserRecord, allProjects: Project[]): PlatformUser {
  return {
    id: user.id,
    organizationId: user.organizationId ?? "",
    name: user.name,
    email: user.email,
    title: user.title ?? "Team Member",
    functionalRole: user.functionalRole,
    teamIds: user.teamIds,
    // Derived from the real source of truth (projects.memberIds) — this
    // used to be permanently hardcoded to [], which silently showed "0
    // projects" for every user on the admin Users page regardless of actual
    // membership.
    projectIds: allProjects.filter((p) => p.memberIds.includes(user.id)).map((p) => p.id),
    status: user.status === "invited" ? "Invited" : user.status === "suspended" ? "Suspended" : "Active",
    joinedAt: typeof user.createdAt === "string" ? user.createdAt : nowIso(),
    lastActiveAt: typeof user.updatedAt === "string" ? user.updatedAt : nowIso(),
    notificationPreferences: user.notificationPreferences,
    userId: user.userId,
    employmentType: user.employmentType,
    collegeName: user.collegeName,
    branch: user.branch,
    passedOutYear: user.passedOutYear,
    domain: user.domain,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
  };
}

function toDisplayAdmin(user: UserRecord): PlatformAdmin {
  return {
    id: user.id,
    organizationId: user.organizationId ?? "",
    name: user.name,
    email: user.email,
    status: user.status === "suspended" ? "Suspended" : "Active",
    joinedAt: typeof user.createdAt === "string" ? user.createdAt : nowIso(),
    lastActiveAt: typeof user.updatedAt === "string" ? user.updatedAt : nowIso(),
  };
}

function toDisplayTeam(team: Team): PlatformTeam {
  return {
    id: team.id,
    organizationId: team.organizationId,
    name: team.name,
    description: team.description,
    leadId: team.leadUserId ?? "",
    memberIds: team.memberIds,
    projectIds: [],
    createdAt: team.createdAt,
  };
}

function toDisplayProject(project: Project): PlatformProject {
  return { ...project };
}

function toDisplayTask(task: Task): PlatformTask {
  return {
    id: task.id,
    organizationId: task.organizationId,
    projectId: task.projectId,
    ownerId: task.ownerId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignedTo || null,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function toDisplayActivity(entry: ActivityLogEntry): PlatformActivityEntry {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    actorId: entry.actorId,
    actorName: entry.actorName,
    action: entry.action as PlatformActivityEntry["action"],
    entityType: entry.entityType as PlatformActivityEntry["entityType"],
    entityName: entry.entityName,
    createdAt: entry.createdAt,
  };
}

interface PlatformContextValue {
  /** The signed-in admin's own organization — null for Super Admin (platform-wide) or an unaffiliated account. */
  currentOrganizationId: string | null;
  /** Friendly message from the most recent Firestore read failure (e.g. permission-denied), or null. Always derived from the real session — never fabricated. */
  dataError: string | null;
  /** True when a dev-only demo role is previewing a shell (Admin/Super Admin) the real signed-in account isn't actually authorized for — data will be empty by design, not broken. */
  isPreviewMismatch: boolean;
  /** True for a genuinely signed-in, non-super-admin account that isn't part of an organization yet (no demo override involved) — the case the "Create Organization" self-serve flow resolves. */
  hasNoOrganization: boolean;
  /** Re-reads the signed-in account's real role/organizationId with a forced token refresh — call after an operation that may have changed the caller's own claims. */
  refreshSession: () => Promise<void>;
  organizations: Organization[];
  admins: PlatformAdmin[];
  users: PlatformUser[];
  teams: PlatformTeam[];
  projects: PlatformProject[];
  tasks: PlatformTask[];
  activity: PlatformActivityEntry[];
  invitations: PlatformInvitation[];
  systemServices: SystemServiceStatus[];

  getOrganization: (id: string | null) => Organization | undefined;
  getAdmin: (id: string) => PlatformAdmin | undefined;
  getAdminForOrg: (orgId: string | null) => PlatformAdmin | undefined;
  getUser: (id: string) => PlatformUser | undefined;
  getTeam: (id: string) => PlatformTeam | undefined;
  getProject: (id: string) => PlatformProject | undefined;
  usersInOrg: (orgId: string | null) => PlatformUser[];
  teamsInOrg: (orgId: string | null) => PlatformTeam[];
  projectsInOrg: (orgId: string | null) => PlatformProject[];
  tasksInOrg: (orgId: string | null) => PlatformTask[];
  tasksInProject: (projectId: string) => PlatformTask[];
  activityInOrg: (orgId: string | null) => PlatformActivityEntry[];
  invitationsInOrg: (orgId: string | null) => PlatformInvitation[];

  createOrganization: (input: Pick<Organization, "name" | "description" | "industry" | "contactEmail">) => Promise<Organization>;
  updateOrganization: (id: string | null, patch: Partial<Pick<Organization, "name" | "description" | "industry" | "contactEmail" | "status">>) => Promise<void>;
  /** Invites a new administrator (via the invitation system) rather than creating an account instantly. */
  createAdmin: (input: { organizationId: string; name: string; email: string }) => Promise<{ emailSent: boolean; emailError: string | null }>;
  updateAdmin: (id: string, patch: { status?: "Active" | "Suspended" }) => Promise<void>;
  createUser: (input: { organizationId: string; name: string; email: string; teamId: string }) => Promise<{ emailSent: boolean; emailError: string | null }>;
  updateUser: (id: string, patch: Partial<Pick<PlatformUser, "name" | "title" | "status" | "teamIds" | "functionalRole">>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  createTeam: (input: { organizationId: string; name: string; description?: string; leadId?: string; memberIds?: string[] }) => Promise<PlatformTeam>;
  updateTeam: (id: string, patch: Partial<{ name: string; description: string; leadId: string; memberIds: string[] }>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  createProject: (
    input: Omit<PlatformProject, "id" | "createdAt" | "updatedAt" | "progress" | "archived" | "repositoryProvider" | "verificationFrequency"> & {
      progress?: number;
    }
  ) => Promise<PlatformProject>;
  updateProject: (id: string, patch: Partial<PlatformProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (input: Omit<PlatformTask, "id" | "createdAt" | "updatedAt" | "ownerId">) => Promise<PlatformTask>;
  updateTask: (id: string, patch: Partial<PlatformTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  logActivity: (entry: Omit<PlatformActivityEntry, "id" | "createdAt">) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  // isDemo is a UI-only signal (which shell/nav renders) — it must never
  // decide what this provider actually queries. Firestore access is always
  // driven by AuthProvider's REAL, verified session identity (role/
  // organizationId from Firebase ID token custom claims), never the
  // dev-only demo role override. A demo preview of "Super Admin" on an
  // account with no real super_admin claim must render an honest empty
  // state, not fire a platform-wide query the real session was never
  // authorized to make (see the 2026-09-06 permission-denied diagnostic:
  // this file previously read `role` from usePlatformRole(), which layers
  // the demo override on top of the real role, so a stale demo selection
  // caused this provider to issue the Super-Admin-only unscoped `subscribeToAllX`
  // queries against a real session that was never granted that claim —
  // firestore.rules correctly denied every one of them). AuthProvider is now
  // the single place role/organizationId are ever resolved from claims —
  // this provider no longer keeps its own copy (see the 2026-09-07
  // role-resolution consolidation).
  const { isDemo } = usePlatformRole();
  const { user, role: realRole, organizationId: currentOrganizationId, loading: identityLoading, refreshSession } = useAuth();

  const isSuper = realRole === "super_admin";
  // True when the currently-rendered UI (possibly demo-overridden) doesn't
  // match what the real session is actually authorized to see — the case
  // that used to silently spam permission-denied. Surfaced in the topbar.
  const isPreviewMismatch = isDemo && !identityLoading && !isSuper && !currentOrganizationId;
  // The real (non-demo) case: a genuinely signed-in, non-super-admin account
  // that just isn't part of an organization yet — first-time Admin, or a
  // self-registered account with no invitation accepted. Distinct from
  // isPreviewMismatch, which is about demo-previewing a shell your real
  // account doesn't back — this is the honest, non-demo empty state.
  const hasNoOrganization = !isDemo && !identityLoading && !isSuper && !currentOrganizationId;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [rawUsers, setRawUsers] = useState<(UserRecord)[]>([]);
  const [rawTeams, setRawTeams] = useState<Team[]>([]);
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawActivity, setRawActivity] = useState<ActivityLogEntry[]>([]);
  const [invitations, setInvitations] = useState<PlatformInvitation[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (identityLoading) return; // still resolving real identity — don't fetch with a stale scope

    const onError = (message: string) => setDataError(message);

    if (isSuper) {
      const unsubscribers = [
        organizationService.subscribeToAllOrganizations((data) => setOrganizations(data.map(toDisplayOrg)), onError),
        userService.subscribeToAllUsers(setRawUsers, onError),
        teamService.subscribeToAllTeams(setRawTeams, onError),
        projectService.subscribeToAllProjects(setRawProjects, onError),
        taskService.subscribeToAllTasks(setRawTasks, onError),
        activityService.subscribeToAllActivity(setRawActivity, onError),
        invitationService.subscribeToAllInvitations(setInvitations, onError),
      ];
      return () => unsubscribers.forEach((unsub) => unsub());
    }

    if (!currentOrganizationId) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        setOrganizations([]);
        setRawUsers([]);
        setRawTeams([]);
        setRawProjects([]);
        setRawTasks([]);
        setRawActivity([]);
        setInvitations([]);
        setDataError(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const orgId = currentOrganizationId;
    const unsubscribers = [
      organizationService.subscribeToOrganization(
        orgId,
        (org) => {
          setOrganizations(org ? [toDisplayOrg(org)] : []);
          if (!org) setDataError("Your organization could not be found.");
        },
        onError
      ),
      userService.subscribeToOrgUsers(orgId, setRawUsers, onError),
      teamService.subscribeToTeams(orgId, setRawTeams, onError),
      projectService.subscribeToProjects(orgId, setRawProjects, onError),
      taskService.subscribeToTasks(orgId, setRawTasks, onError),
      activityService.subscribeToActivity(orgId, setRawActivity, onError),
      invitationService.subscribeToInvitations(orgId, setInvitations, onError),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [isSuper, currentOrganizationId, identityLoading]);

  const admins = useMemo(() => rawUsers.filter((u) => u.role === "admin").map(toDisplayAdmin), [rawUsers]);
  const users = useMemo(
    () => rawUsers.filter((u) => u.role === "user").map((u) => toDisplayUser(u, rawProjects)),
    [rawUsers, rawProjects]
  );
  const teams = useMemo(() => rawTeams.map(toDisplayTeam), [rawTeams]);
  const projects = useMemo(() => rawProjects.map(toDisplayProject), [rawProjects]);
  const tasks = useMemo(() => rawTasks.map(toDisplayTask), [rawTasks]);
  const activity = useMemo(() => rawActivity.map(toDisplayActivity), [rawActivity]);

  const getOrganization = useCallback((id: string | null) => organizations.find((o) => o.id === id), [organizations]);
  const getAdmin = useCallback((id: string) => admins.find((a) => a.id === id), [admins]);
  const getAdminForOrg = useCallback((orgId: string | null) => admins.find((a) => a.organizationId === orgId), [admins]);
  const getUser = useCallback((id: string) => users.find((u) => u.id === id) ?? admins.find((a) => a.id === id) as PlatformUser | undefined, [users, admins]);
  // Reads straight from rawUsers (not the display-mapped users/admins arrays)
  // so it works for admins too — PlatformAdmin has no notificationPreferences
  // field of its own. Backs notifyUsers()'s getPreferences callback below,
  // avoiding a per-recipient Firestore read (the roster is already loaded).
  const getMemberPreferences = useCallback(
    (id: string) => rawUsers.find((u) => u.id === id)?.notificationPreferences,
    [rawUsers]
  );
  const getTeam = useCallback((id: string) => teams.find((t) => t.id === id), [teams]);
  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);
  const usersInOrg = useCallback((orgId: string | null) => users.filter((u) => u.organizationId === orgId), [users]);
  const teamsInOrg = useCallback((orgId: string | null) => teams.filter((t) => t.organizationId === orgId), [teams]);
  const projectsInOrg = useCallback((orgId: string | null) => projects.filter((p) => p.organizationId === orgId), [projects]);
  const tasksInOrg = useCallback((orgId: string | null) => tasks.filter((t) => t.organizationId === orgId), [tasks]);
  const tasksInProject = useCallback((projectId: string) => tasks.filter((t) => t.projectId === projectId), [tasks]);
  const activityInOrg = useCallback(
    (orgId: string | null) => activity.filter((a) => a.organizationId === orgId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activity]
  );
  const invitationsInOrg = useCallback((orgId: string | null) => invitations.filter((i) => i.organizationId === orgId), [invitations]);

  const uid = user?.uid ?? "system";
  const actorName = user?.displayName ?? user?.email ?? "Admin";

  const createOrganization = useCallback<PlatformContextValue["createOrganization"]>(async (input) => {
    const { organization } = await apiFetch<{ organization: OrganizationDoc }>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return toDisplayOrg(organization);
  }, []);

  const updateOrganization = useCallback<PlatformContextValue["updateOrganization"]>(async (id, patch) => {
    if (!id) return;
    if (patch.status) {
      await apiFetch(`/api/organizations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: patch.status === "Suspended" ? "suspended" : "active" }),
      });
      return;
    }
    await organizationService.updateOrganizationProfile(id, {
      name: patch.name,
      description: patch.description,
      industry: patch.industry,
      contactEmail: patch.contactEmail,
    });
  }, []);

  const createAdmin = useCallback<PlatformContextValue["createAdmin"]>(async (input) => {
    const { emailSent, emailError } = await invitationService.createInvitation({
      organizationId: input.organizationId,
      name: input.name,
      email: input.email,
      role: "admin",
      teamId: null,
    });
    return { emailSent, emailError };
  }, []);

  const updateAdmin = useCallback<PlatformContextValue["updateAdmin"]>(async (id, patch) => {
    if (patch.status) await userService.updateUserStatus(id, patch.status === "Suspended" ? "suspended" : "active");
  }, []);

  const createUser = useCallback<PlatformContextValue["createUser"]>(async (input) => {
    const { emailSent, emailError } = await invitationService.createInvitation({
      organizationId: input.organizationId,
      name: input.name,
      email: input.email,
      role: "user",
      teamId: input.teamId,
    });
    return { emailSent, emailError };
  }, []);

  const updateUser = useCallback<PlatformContextValue["updateUser"]>(
    async (id, patch) => {
      if (patch.status) await userService.updateUserStatus(id, patch.status === "Suspended" ? "suspended" : patch.status === "Invited" ? "invited" : "active");
      if (patch.name || patch.title) await userService.updateUserProfile(id, { name: patch.name ?? "" });
      if (patch.teamIds) {
        const previousTeamIds = rawUsers.find((u) => u.id === id)?.teamIds ?? [];
        const nextTeamIds = patch.teamIds;
        await userService.updateUserTeams(id, nextTeamIds);
        // Keep the other side of the relationship consistent: a team's
        // memberIds must reflect exactly who's now assigned to it.
        const removedTeamIds = previousTeamIds.filter((teamId) => !nextTeamIds.includes(teamId));
        const addedTeamIds = nextTeamIds.filter((teamId) => !previousTeamIds.includes(teamId));
        await Promise.all([
          ...removedTeamIds.map((teamId) => teamService.removeMember(teamId, id)),
          ...addedTeamIds.map((teamId) => teamService.addMember(teamId, id)),
        ]);
      }
    },
    [rawUsers]
  );

  const deleteUser = useCallback(async () => {
    // Deliberately unsupported: deleting a Firebase Auth account + all of
    // its data is a privileged, destructive operation best done via a
    // dedicated server route with confirmation — not built in this pass.
    throw new Error("Removing a user account isn't available yet — suspend them instead.");
  }, []);

  const createTeam = useCallback<PlatformContextValue["createTeam"]>(
    async (input) => {
      const leadUserId = input.leadId || null;
      const description = input.description ?? "";
      const id = await teamService.createTeam(input.organizationId, uid, {
        name: input.name,
        description,
        leadUserId,
        memberIds: input.memberIds,
      });
      await activityService.logActivity({
        organizationId: input.organizationId,
        actorId: uid,
        actorName,
        action: "team_created" satisfies ActivityType,
        entityType: "team",
        entityId: id,
        entityName: input.name,
        projectId: null,
      });
      return toDisplayTeam({
        id,
        organizationId: input.organizationId,
        name: input.name,
        description,
        leadUserId,
        memberIds: input.memberIds ?? [],
        createdBy: uid,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    },
    [uid, actorName]
  );

  const updateTeam = useCallback<PlatformContextValue["updateTeam"]>(async (id, patch) => {
    const { leadId, ...rest } = patch;
    await teamService.updateTeam(id, {
      ...rest,
      ...(leadId !== undefined ? { leadUserId: leadId || null } : {}),
    });
  }, []);

  const deleteTeam = useCallback(async (id: string) => {
    await teamService.deleteTeam(id);
  }, []);

  // Backs the "a project assigned to an intern must have a repository URL"
  // rule (lib/projects/assignment.ts) with this console's real roster.
  const isInternUser = useCallback((memberUid: string) => rawUsers.some((u) => u.id === memberUid && u.employmentType === "INTERN"), [rawUsers]);

  const createProject = useCallback<PlatformContextValue["createProject"]>(
    async (input) => {
      const assigneeIds = projectAssigneeIds({ memberIds: input.memberIds, managerId: input.managerId });
      const repoError = repositoryUrlError({ repositoryUrl: input.repositoryUrl, assigneeIds, isIntern: isInternUser });
      if (repoError) throw new Error(repoError);
      const memberAssignmentVersions = bumpAssignmentVersions({}, assigneeIds);
      const id = await projectService.createProject({ ...input, memberAssignmentVersions });
      await activityService.logActivity({
        organizationId: input.organizationId,
        actorId: uid,
        actorName,
        action: "project_created" satisfies ActivityType,
        entityType: "project",
        entityId: id,
        entityName: input.name,
        projectId: id,
      });
      await notificationService.notifyProjectAssigned(id, assigneeIds);
      return {
        ...input,
        id,
        progress: input.status === "Completed" ? 100 : (input.progress ?? 0),
        archived: false,
        repositoryProvider: projectService.inferRepositoryProvider(input.repositoryUrl),
        verificationFrequency: "DAILY",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
    },
    [uid, actorName, isInternUser]
  );

  const updateProject = useCallback<PlatformContextValue["updateProject"]>(
    async (id, patch) => {
      const existing = rawProjects.find((p) => p.id === id);
      if (!existing) throw new Error("This project no longer exists. It may have been deleted.");
      const next = {
        memberIds: patch.memberIds ?? existing.memberIds,
        managerId: patch.managerId !== undefined ? patch.managerId : existing.managerId,
        repositoryUrl: patch.repositoryUrl !== undefined ? patch.repositoryUrl : existing.repositoryUrl,
      };
      const assigneeIds = projectAssigneeIds(next);
      // Checked on every save that touches assignment or the repository —
      // an archive/progress-only patch leaves both unchanged and can't break it.
      if (patch.memberIds !== undefined || patch.managerId !== undefined || patch.repositoryUrl !== undefined) {
        const repoError = repositoryUrlError({ repositoryUrl: next.repositoryUrl, assigneeIds, isIntern: isInternUser });
        if (repoError) throw new Error(repoError);
      }
      const newlyAssigned = newlyAssignedIds(projectAssigneeIds(existing), assigneeIds);
      await projectService.updateProject(id, {
        ...(patch as Partial<projectService.ProjectInput> & { progress?: number; archived?: boolean }),
        ...(newlyAssigned.length > 0 ? { memberAssignmentVersions: bumpAssignmentVersions(existing.memberAssignmentVersions, newlyAssigned) } : {}),
      });
      await notificationService.notifyProjectAssigned(id, newlyAssigned);
    },
    [rawProjects, isInternUser]
  );

  const deleteProject = useCallback(async (id: string) => {
    const projectTasks = tasks.filter((t) => t.projectId === id);
    await Promise.all(projectTasks.map((t) => taskService.deleteTask(t.id)));
    await projectService.deleteProject(id);
  }, [tasks]);

  const createTask = useCallback<PlatformContextValue["createTask"]>(
    async (input) => {
      const id = await taskService.createTask({
        organizationId: input.organizationId,
        teamId: rawProjects.find((p) => p.id === input.projectId)?.teamId ?? "",
        projectId: input.projectId,
        ownerId: uid,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assigneeId ?? "",
        reviewerId: input.reviewerId ?? null,
        estimatedHours: input.estimatedHours ?? null,
        actualHours: input.actualHours ?? null,
        dueDate: input.dueDate,
      });
      if (input.assigneeId) {
        await activityService.logActivity({
          organizationId: input.organizationId,
          actorId: uid,
          actorName,
          action: "task_assigned" satisfies ActivityType,
          entityType: "task",
          entityId: id,
          entityName: input.title,
          projectId: input.projectId,
        });
        await notificationService.notifyTaskAssigned(id);
      }
      return { ...input, id, ownerId: uid, createdAt: nowIso(), updatedAt: nowIso() };
    },
    [uid, actorName, rawProjects]
  );

  const updateTask = useCallback<PlatformContextValue["updateTask"]>(
    async (id, patch) => {
      const existing = rawTasks.find((t) => t.id === id);
      if (!existing) throw new Error("This task no longer exists. It may have been deleted.");

      // Resolve the COMPLETE next state first, then write it once. An earlier
      // version handled a status change in its own branch and returned early,
      // so saving the edit dialog with a new status silently discarded every
      // other edited field (title, assignee, due date, ...) and the
      // reassignment notification along with it.
      const nextStatus = (patch.status as TaskStatus | undefined) ?? existing.status;
      const nextAssignee = patch.assigneeId !== undefined ? (patch.assigneeId ?? "") : existing.assignedTo;
      const nextProjectId = patch.projectId ?? existing.projectId;
      const nextTitle = patch.title ?? existing.title;
      const statusChanged = nextStatus !== existing.status;
      const assignmentChanged = nextAssignee !== existing.assignedTo;
      const statusOnly = Object.keys(patch).every((key) => key === "status");

      if (statusOnly) {
        // Quick actions (e.g. "Mark completed") touch only status/updatedAt.
        if (statusChanged) await taskService.updateTaskStatus(id, nextStatus);
      } else {
        await taskService.updateTask(id, {
          organizationId: existing.organizationId,
          teamId: rawProjects.find((p) => p.id === nextProjectId)?.teamId ?? existing.teamId,
          projectId: nextProjectId,
          ownerId: existing.ownerId,
          title: nextTitle,
          description: patch.description ?? existing.description,
          status: nextStatus,
          priority: (patch.priority as TaskPriority | undefined) ?? existing.priority,
          assignedTo: nextAssignee,
          // `!== undefined` (not `??`) — an explicit null here means "clear
          // it," which `??` would wrongly treat the same as "not touched" and
          // silently keep the old value, making it impossible to ever unset a
          // reviewer/hours field once set.
          reviewerId: patch.reviewerId !== undefined ? patch.reviewerId : existing.reviewerId,
          estimatedHours: patch.estimatedHours !== undefined ? patch.estimatedHours : existing.estimatedHours,
          actualHours: patch.actualHours !== undefined ? patch.actualHours : existing.actualHours,
          dueDate: patch.dueDate ?? existing.dueDate,
          // Bumped only on a real reassignment — the identity of the
          // assignment notification (see lib/server/task-assignment.ts).
          assignmentVersion: assignmentChanged ? existing.assignmentVersion + 1 : undefined,
        });
      }

      if (statusChanged) {
        await activityService.logActivity({
          organizationId: existing.organizationId,
          actorId: uid,
          actorName,
          action: nextStatus === "Completed" ? "task_completed" : "task_status_changed",
          entityType: "task",
          entityId: id,
          entityName: nextTitle,
          projectId: nextProjectId,
        });
        const statusRecipients = [nextAssignee];
        const nextReviewer = patch.reviewerId !== undefined ? patch.reviewerId : existing.reviewerId;
        if (nextStatus === "In Review" && nextReviewer) statusRecipients.push(nextReviewer);
        await notificationService.notifyUsers({
          organizationId: existing.organizationId,
          actorId: uid,
          recipientIds: statusRecipients,
          type: nextStatus === "Completed" ? "task_completed" : "task_status_changed",
          title: nextStatus === "Completed" ? "Task completed" : "Status changed",
          message: `Task "${nextTitle}" moved to ${nextStatus}.`,
          href: "/tasks",
          projectId: nextProjectId,
          taskId: id,
          getPreferences: getMemberPreferences,
        });
      }

      if (assignmentChanged && nextAssignee) {
        await activityService.logActivity({
          organizationId: existing.organizationId,
          actorId: uid,
          actorName,
          action: "task_assigned" satisfies ActivityType,
          entityType: "task",
          entityId: id,
          entityName: nextTitle,
          projectId: nextProjectId,
        });
        await notificationService.notifyTaskAssigned(id);
      }
    },
    [rawTasks, rawProjects, uid, actorName, getMemberPreferences]
  );

  const deleteTask = useCallback(async (id: string) => {
    await taskService.deleteTask(id);
  }, []);

  const logActivity = useCallback<PlatformContextValue["logActivity"]>(
    (entry) => {
      void activityService.logActivity({
        ...entry,
        actorId: entry.actorId || uid,
        actorName: entry.actorName || actorName,
        entityId: "",
        projectId: null,
      });
    },
    [uid, actorName]
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      currentOrganizationId,
      dataError,
      isPreviewMismatch,
      hasNoOrganization,
      refreshSession,
      organizations,
      admins,
      users,
      teams,
      projects,
      tasks,
      activity,
      invitations,
      systemServices: seedSystemServices,
      getOrganization,
      getAdmin,
      getAdminForOrg,
      getUser,
      getTeam,
      getProject,
      usersInOrg,
      teamsInOrg,
      projectsInOrg,
      tasksInOrg,
      tasksInProject,
      activityInOrg,
      invitationsInOrg,
      createOrganization,
      updateOrganization,
      createAdmin,
      updateAdmin,
      createUser,
      updateUser,
      deleteUser,
      createTeam,
      updateTeam,
      deleteTeam,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      logActivity,
    }),
    [
      currentOrganizationId,
      dataError,
      isPreviewMismatch,
      refreshSession,
      hasNoOrganization,
      organizations,
      admins,
      users,
      teams,
      projects,
      tasks,
      activity,
      invitations,
      getOrganization,
      getAdmin,
      getAdminForOrg,
      getUser,
      getTeam,
      getProject,
      usersInOrg,
      teamsInOrg,
      projectsInOrg,
      tasksInOrg,
      tasksInProject,
      activityInOrg,
      invitationsInOrg,
      createOrganization,
      updateOrganization,
      createAdmin,
      updateAdmin,
      createUser,
      updateUser,
      deleteUser,
      createTeam,
      updateTeam,
      deleteTeam,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      logActivity,
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within a PlatformProvider");
  return ctx;
}
