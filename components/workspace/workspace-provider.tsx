"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import * as projectService from "@/lib/services/project.service";
import * as taskService from "@/lib/services/task.service";
import * as userService from "@/lib/services/user.service";
import * as teamService from "@/lib/services/team.service";
import * as notificationService from "@/lib/services/notification.service";
import * as activityService from "@/lib/services/activity.service";
import * as meetingService from "@/lib/services/meeting.service";
import type { AppNotification } from "@/lib/services/notification.service";
import type { Project, ProjectPriority, ProjectStatus } from "@/types/project";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import type { Team, TeamMember } from "@/types/team";
import type { ActivityLogEntry } from "@/types/activity";
import type { UserRecord } from "@/types/user";
import type { Meeting, MeetingStatus } from "@/types/meeting";

interface CollectionState {
  projects: boolean;
  tasks: boolean;
  members: boolean;
  teams: boolean;
  notifications: boolean;
  activity: boolean;
  meetings: boolean;
}

interface CreateMeetingInput {
  title: string;
  description: string;
  projectId: string | null;
  participantIds: string[];
  startAt: string;
  endAt: string;
  notes: string;
  meetingLink: string | null;
}

interface CreateProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
  teamId: string;
  memberIds: string[];
  managerId?: string | null;
  requirements?: string;
}

interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  reviewerId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate: string;
}

interface WorkspaceContextValue {
  uid: string | null;
  organizationId: string | null;
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  teams: Team[];
  notifications: AppNotification[];
  activity: ActivityLogEntry[];
  meetings: Meeting[];
  loaded: CollectionState;
  errors: Partial<Record<keyof CollectionState, string>>;
  retry: () => void;

  getMemberById: (id: string) => TeamMember | undefined;
  getProjectById: (id: string) => Project | undefined;
  getTeamsForMember: (memberId: string) => Team[];
  getProjectsForMember: (memberId: string) => Project[];
  getTasksByProjectId: (projectId: string) => Task[];
  getActivityByProjectId: (projectId: string) => ActivityLogEntry[];
  getActivityByActorId: (actorId: string) => ActivityLogEntry[];

  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: CreateProjectInput) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: CreateTaskInput) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createMeeting: (input: CreateMeetingInput) => Promise<void>;
  updateMeeting: (id: string, input: CreateMeetingInput) => Promise<void>;
  updateMeetingStatus: (id: string, status: MeetingStatus) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function memberFromUser(user: UserRecord): TeamMember {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "admin" || user.role === "super_admin" ? "Admin" : "Team Member",
    title: user.title ?? "Team Member",
    functionalRole: user.functionalRole,
    notificationPreferences: user.notificationPreferences,
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // organizationId comes from AuthProvider — the one place Firebase ID token
  // custom claims are resolved (see the 2026-09-07 role-resolution
  // consolidation) — never re-derived here.
  const { user, organizationId, role, loading: identityLoading } = useAuth();
  const uid = user?.uid ?? null;
  // Projects may be assigned to specific employees — organization membership
  // alone is never sufficient for a plain "user" to see a project (or its
  // tasks/activity). Admin/Super Admin keep the exact same unrestricted,
  // organization-wide subscriptions as before this changed; only the "user"
  // branch below narrows to what that account is actually authorized for.
  const isPrivileged = role === "admin" || role === "super_admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawUsers, setRawUsers] = useState<(UserRecord)[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loaded, setLoaded] = useState<CollectionState>({
    projects: false,
    tasks: false,
    members: false,
    teams: false,
    notifications: false,
    activity: false,
    meetings: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CollectionState, string>>>({});
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setErrors({});
    setLoaded({ projects: false, tasks: false, members: false, teams: false, notifications: false, activity: false, meetings: false });
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    // WorkspaceProvider only ever mounts inside ProtectedRoute's authenticated
    // branch, so uid is unmounted-away (not cleared) when it becomes null.
    if (!uid || identityLoading) return;

    const markLoaded = (key: keyof CollectionState) =>
      setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const setError = (key: keyof CollectionState, message: string) => {
      setErrors((prev) => ({ ...prev, [key]: message }));
      markLoaded(key);
    };

    // No organization yet (self-registered, not-yet-invited account) —
    // there is nothing to subscribe to; every collection is a clean empty
    // state rather than an error.
    if (!organizationId) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        setProjects([]);
        setTasks([]);
        setRawUsers([]);
        setTeams([]);
        setMeetings([]);
        setLoaded({ projects: true, tasks: true, members: true, teams: true, notifications: false, activity: true, meetings: true });
      });
      const unsubscribe = notificationService.subscribeToNotifications(
        uid,
        (data) => {
          setNotifications(data);
          markLoaded("notifications");
        },
        (message) => setError("notifications", message)
      );
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    const unsubscribers = [
      isPrivileged
        ? projectService.subscribeToProjects(
            organizationId,
            (data) => {
              setProjects(data);
              markLoaded("projects");
            },
            (message) => setError("projects", message)
          )
        : projectService.subscribeToMyProjects(
            organizationId,
            uid,
            (data) => {
              setProjects(data);
              markLoaded("projects");
            },
            (message) => setError("projects", message)
          ),
      userService.subscribeToOrgUsers(
        organizationId,
        (data) => {
          setRawUsers(data);
          markLoaded("members");
        },
        (message) => setError("members", message)
      ),
      teamService.subscribeToTeams(
        organizationId,
        (data) => {
          setTeams(data);
          markLoaded("teams");
        },
        (message) => setError("teams", message)
      ),
      notificationService.subscribeToNotifications(
        uid,
        (data) => {
          setNotifications(data);
          markLoaded("notifications");
        },
        (message) => setError("notifications", message)
      ),
      meetingService.subscribeToMyMeetings(
        organizationId,
        uid,
        (data) => {
          setMeetings(data);
          markLoaded("meetings");
        },
        (message) => setError("meetings", message)
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid, organizationId, identityLoading, retryKey, isPrivileged]);

  // Tasks and activity both inherit project-level authorization for a plain
  // "user" (see project.service.ts's subscribeToMyProjects and
  // task.service.ts's subscribeToTasksForProjects) — they can only be
  // correctly scoped once this account's REAL authorized project set is
  // known, so these two effects depend on `projects` (via a stable,
  // joined-ids key so they don't re-subscribe on every snapshot, only when
  // the actual SET of projects changes) and wait for `loaded.projects`
  // before subscribing at all, rather than briefly subscribing to an empty
  // project list and flashing "no tasks" before the real list arrives.
  // Admin/Super Admin are unaffected either way — their org-wide
  // subscriptions never depended on `projects` to begin with.
  const myProjectIdsKey = useMemo(() => (isPrivileged ? "" : [...projects.map((p) => p.id)].sort().join(",")), [isPrivileged, projects]);

  useEffect(() => {
    if (!uid || identityLoading || !organizationId) return;
    if (!isPrivileged && !loaded.projects) return;

    const markLoaded = (key: keyof CollectionState) =>
      setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const setError = (key: keyof CollectionState, message: string) => {
      setErrors((prev) => ({ ...prev, [key]: message }));
      markLoaded(key);
    };

    if (isPrivileged) {
      const unsubscribe = taskService.subscribeToTasks(
        organizationId,
        (data) => {
          setTasks(data);
          markLoaded("tasks");
        },
        (message) => setError("tasks", message)
      );
      return unsubscribe;
    }

    const projectIds = myProjectIdsKey ? myProjectIdsKey.split(",") : [];
    const unsubscribe = taskService.subscribeToTasksForProjects(
      organizationId,
      projectIds,
      (data) => {
        setTasks(data);
        markLoaded("tasks");
      },
      (message) => setError("tasks", message)
    );
    return unsubscribe;
  }, [uid, identityLoading, organizationId, isPrivileged, myProjectIdsKey, loaded.projects, retryKey]);

  useEffect(() => {
    if (!uid || identityLoading || !organizationId) return;
    if (!isPrivileged && !loaded.projects) return;

    const markLoaded = (key: keyof CollectionState) =>
      setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const setError = (key: keyof CollectionState, message: string) => {
      setErrors((prev) => ({ ...prev, [key]: message }));
      markLoaded(key);
    };

    if (isPrivileged) {
      const unsubscribe = activityService.subscribeToActivity(
        organizationId,
        (data) => {
          setActivity(data);
          markLoaded("activity");
        },
        (message) => setError("activity", message)
      );
      return unsubscribe;
    }

    const projectIds = myProjectIdsKey ? myProjectIdsKey.split(",") : [];
    const resultsByKey = new Map<string, ActivityLogEntry[]>();
    function emit() {
      setActivity(Array.from(resultsByKey.values()).flat());
      markLoaded("activity");
    }
    const unsubscribers = [
      activityService.subscribeToOrgLevelVisibleActivity(
        organizationId,
        (data) => {
          resultsByKey.set("__org__", data);
          emit();
        },
        (message) => setError("activity", message)
      ),
      ...projectIds.map((projectId) =>
        activityService.subscribeToProjectVisibleActivity(
          organizationId,
          projectId,
          (data) => {
            resultsByKey.set(projectId, data);
            emit();
          },
          (message) => setError("activity", message)
        )
      ),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid, identityLoading, organizationId, isPrivileged, myProjectIdsKey, loaded.projects, retryKey]);

  const members = useMemo(() => rawUsers.map(memberFromUser), [rawUsers]);

  const getMemberById = useCallback((id: string) => members.find((m) => m.id === id), [members]);
  const getProjectById = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);
  const getTeamsForMember = useCallback((memberId: string) => teams.filter((t) => t.memberIds.includes(memberId)), [teams]);
  const getProjectsForMember = useCallback(
    (memberId: string) => projects.filter((p) => p.ownerId === memberId || p.memberIds.includes(memberId)),
    [projects]
  );
  const getTasksByProjectId = useCallback((projectId: string) => tasks.filter((t) => t.projectId === projectId), [tasks]);
  const getActivityByProjectId = useCallback(
    (projectId: string) => activity.filter((a) => a.entityType === "project" && a.entityId === projectId),
    [activity]
  );
  const getActivityByActorId = useCallback((actorId: string) => activity.filter((a) => a.actorId === actorId), [activity]);

  const actorName = user?.displayName ?? user?.email ?? "Someone";

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      const id = await projectService.createProject({
        organizationId,
        teamId: input.teamId,
        name: input.name,
        description: input.description,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate,
        dueDate: input.dueDate,
        ownerId: uid,
        managerId: input.managerId ?? null,
        memberIds: input.memberIds.includes(uid) ? input.memberIds : [uid, ...input.memberIds],
        requirements: input.requirements ?? "",
      });
      await activityService.logActivity({
        organizationId,
        actorId: uid,
        actorName,
        action: "project_created",
        entityType: "project",
        entityId: id,
        entityName: input.name,
        projectId: id,
      });
      const now = new Date().toISOString();
      return {
        id,
        organizationId,
        teamId: input.teamId,
        name: input.name,
        description: input.description,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate,
        dueDate: input.dueDate,
        memberIds: input.memberIds,
        ownerId: uid,
        managerId: input.managerId ?? null,
        archived: false,
        progress: input.status === "Completed" ? 100 : 0,
        // This shell's create-project dialog doesn't expose Work
        // Verification settings (Admin-only, see components/admin/
        // project-form-dialog.tsx) — every project it creates starts with
        // the feature off, same as the real Firestore write already defaults to.
        repositoryUrl: null,
        repositoryProvider: "NONE",
        workVerificationEnabled: false,
        verificationFrequency: "DAILY",
        submissionStatus: "NONE",
        submittedAt: null,
        requirementDocument: null,
        requirements: input.requirements ?? "",
        createdAt: now,
        updatedAt: now,
      } satisfies Project;
    },
    [uid, organizationId, actorName]
  );

  const updateProject = useCallback(
    async (id: string, input: CreateProjectInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      await projectService.updateProject(id, input);
      await activityService.logActivity({
        organizationId,
        actorId: uid,
        actorName,
        action: "project_updated",
        entityType: "project",
        entityId: id,
        entityName: input.name,
        projectId: id,
      });
    },
    [uid, organizationId, actorName]
  );

  const updateProjectStatus = useCallback(
    async (id: string, status: ProjectStatus) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      await projectService.updateProject(id, { status, progress: status === "Completed" ? 100 : undefined });
      await activityService.logActivity({
        organizationId,
        actorId: uid,
        actorName,
        action: status === "Completed" ? "project_completed" : "project_updated",
        entityType: "project",
        entityId: id,
        entityName: projects.find((p) => p.id === id)?.name ?? "",
        projectId: id,
      });
    },
    [uid, organizationId, actorName, projects]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const projectTasks = tasks.filter((t) => t.projectId === id);
      await Promise.all(projectTasks.map((t) => taskService.deleteTask(t.id)));
      await projectService.deleteProject(id);
    },
    [tasks]
  );

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      const project = projects.find((p) => p.id === input.projectId);
      const id = await taskService.createTask({
        organizationId,
        teamId: project?.teamId ?? "",
        projectId: input.projectId,
        ownerId: uid,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assignedTo,
        reviewerId: input.reviewerId ?? null,
        estimatedHours: input.estimatedHours ?? null,
        actualHours: input.actualHours ?? null,
        dueDate: input.dueDate,
      });
      await activityService.logActivity({
        organizationId,
        actorId: uid,
        actorName,
        action: "task_created",
        entityType: "task",
        entityId: id,
        entityName: input.title,
        projectId: input.projectId,
      });
      if (input.assignedTo) await notificationService.notifyTaskAssigned(id);
      const now = new Date().toISOString();
      return {
        id,
        organizationId,
        teamId: project?.teamId ?? "",
        projectId: input.projectId,
        ownerId: uid,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assignedTo,
        reviewerId: input.reviewerId ?? null,
        estimatedHours: input.estimatedHours ?? null,
        actualHours: input.actualHours ?? null,
        assignmentVersion: input.assignedTo ? 1 : 0,
        dueDate: input.dueDate,
        labels: [],
        createdAt: now,
        updatedAt: now,
      } satisfies Task;
    },
    [uid, organizationId, actorName, projects]
  );

  const updateTask = useCallback(
    async (id: string, input: CreateTaskInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      const existing = tasks.find((t) => t.id === id);
      // Only a real change of assignee is a new assignment event — re-saving
      // the same assignee, or any unrelated edit, leaves assignmentVersion
      // (and therefore the notification identity) untouched.
      const assignmentChanged = Boolean(existing) && existing!.assignedTo !== input.assignedTo;
      await taskService.updateTask(id, {
        organizationId,
        teamId: existing?.teamId ?? "",
        projectId: input.projectId,
        ownerId: existing?.ownerId ?? uid,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assignedTo,
        reviewerId: input.reviewerId ?? null,
        estimatedHours: input.estimatedHours ?? null,
        actualHours: input.actualHours ?? null,
        dueDate: input.dueDate,
        assignmentVersion: assignmentChanged ? (existing?.assignmentVersion ?? 0) + 1 : undefined,
      });
      await activityService.logActivity({
        organizationId,
        actorId: uid,
        actorName,
        action: "task_status_changed",
        entityType: "task",
        entityId: id,
        entityName: input.title,
        projectId: input.projectId,
      });
      const getPreferences = (memberUid: string) => getMemberById(memberUid)?.notificationPreferences;
      if (assignmentChanged && input.assignedTo) await notificationService.notifyTaskAssigned(id);
      if (existing && existing.status !== input.status) {
        const recipients = [input.assignedTo];
        if (input.status === "In Review" && input.reviewerId) recipients.push(input.reviewerId);
        await notificationService.notifyUsers({
          organizationId,
          actorId: uid,
          recipientIds: recipients,
          type: input.status === "Completed" ? "task_completed" : "task_status_changed",
          title: input.status === "Completed" ? "Task completed" : "Status changed",
          message: `Task "${input.title}" moved to ${input.status}.`,
          href: "/tasks",
          projectId: input.projectId,
          taskId: id,
          getPreferences,
        });
      }
    },
    [uid, organizationId, actorName, tasks, getMemberById]
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      const task = tasks.find((t) => t.id === id);
      const statusChanged = task ? task.status !== status : false;
      await taskService.updateTaskStatus(id, status);
      if (task && statusChanged) {
        await activityService.logActivity({
          organizationId,
          actorId: uid,
          actorName,
          action: status === "Completed" ? "task_completed" : "task_status_changed",
          entityType: "task",
          entityId: id,
          entityName: task.title,
          projectId: task.projectId,
        });
        const recipients = [task.assignedTo];
        if (status === "In Review" && task.reviewerId) recipients.push(task.reviewerId);
        await notificationService.notifyUsers({
          organizationId,
          actorId: uid,
          recipientIds: recipients,
          type: status === "Completed" ? "task_completed" : "task_status_changed",
          title: status === "Completed" ? "Task completed" : "Status changed",
          message: `Task "${task.title}" moved to ${status}.`,
          href: "/tasks",
          projectId: task.projectId,
          taskId: id,
          getPreferences: (memberUid) => getMemberById(memberUid)?.notificationPreferences,
        });
      }
    },
    [uid, organizationId, actorName, tasks, getMemberById]
  );

  const deleteTask = useCallback(async (id: string) => {
    await taskService.deleteTask(id);
  }, []);

  const createMeeting = useCallback(
    async (input: CreateMeetingInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      await meetingService.createMeeting({
        organizationId,
        organizerId: uid,
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        participantIds: input.participantIds,
        startAt: input.startAt,
        endAt: input.endAt,
        notes: input.notes,
        meetingLink: input.meetingLink,
      });
      await notificationService.notifyUsers({
        organizationId,
        actorId: uid,
        recipientIds: input.participantIds,
        type: "meeting_created",
        title: "New meeting",
        message: `You have been added to the meeting "${input.title}".`,
        href: "/meetings",
        projectId: input.projectId,
        getPreferences: (memberUid) => getMemberById(memberUid)?.notificationPreferences,
      });
    },
    [uid, organizationId, getMemberById]
  );

  const updateMeeting = useCallback(
    async (id: string, input: CreateMeetingInput) => {
      if (!uid || !organizationId) throw new Error("You must be logged in.");
      const existing = meetings.find((m) => m.id === id);
      await meetingService.updateMeeting(id, {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        participantIds: input.participantIds,
        startAt: input.startAt,
        endAt: input.endAt,
        notes: input.notes,
        meetingLink: input.meetingLink,
      });
      const scheduleChanged = existing && (existing.startAt !== input.startAt || existing.endAt !== input.endAt);
      if (scheduleChanged) {
        await notificationService.notifyUsers({
          organizationId,
          actorId: uid,
          recipientIds: input.participantIds,
          type: "meeting_updated",
          title: "Meeting changed",
          message: `Meeting time changed: "${input.title}".`,
          href: "/meetings",
          projectId: input.projectId,
          getPreferences: (memberUid) => getMemberById(memberUid)?.notificationPreferences,
        });
      }
    },
    [uid, organizationId, meetings, getMemberById]
  );

  const updateMeetingStatus = useCallback(async (id: string, status: MeetingStatus) => {
    await meetingService.updateMeeting(id, { status });
  }, []);

  const deleteMeeting = useCallback(async (id: string) => {
    await meetingService.deleteMeeting(id);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await notificationService.markNotificationRead(id);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await notificationService.markAllNotificationsRead(unreadIds);
  }, [notifications]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      uid,
      organizationId,
      projects,
      tasks,
      members,
      teams,
      notifications,
      activity,
      meetings,
      loaded,
      errors,
      retry,
      getMemberById,
      getProjectById,
      getTeamsForMember,
      getProjectsForMember,
      getTasksByProjectId,
      getActivityByProjectId,
      getActivityByActorId,
      createProject,
      updateProject,
      updateProjectStatus,
      deleteProject,
      createTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      createMeeting,
      updateMeeting,
      updateMeetingStatus,
      deleteMeeting,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      uid,
      organizationId,
      projects,
      tasks,
      members,
      teams,
      notifications,
      activity,
      meetings,
      loaded,
      errors,
      retry,
      getMemberById,
      getProjectById,
      getTeamsForMember,
      getProjectsForMember,
      getTasksByProjectId,
      getActivityByProjectId,
      getActivityByActorId,
      createProject,
      updateProject,
      updateProjectStatus,
      deleteProject,
      createTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      createMeeting,
      updateMeeting,
      updateMeetingStatus,
      deleteMeeting,
      markNotificationRead,
      markAllNotificationsRead,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
