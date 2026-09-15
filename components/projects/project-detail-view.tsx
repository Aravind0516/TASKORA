"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, ListChecks, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectStatusControl } from "@/components/projects/project-status-control";
import { ProjectStatusStepper } from "@/components/projects/project-status-stepper";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { ProjectTeam } from "@/components/projects/project-team";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ProjectMyTasksPanel } from "@/components/projects/project-my-tasks-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CommentSection } from "@/components/comments/comment-section";
import { AttachmentSection } from "@/components/attachments/attachment-section";
import { DailyUpdatePanel } from "@/components/work-verification/daily-update-panel";
import { ProjectVerificationDashboard } from "@/components/work-verification/project-verification-dashboard";
import { ProjectHealthExplanation } from "@/components/shared/project-health-badge";
import { calculateProjectHealth } from "@/lib/project-health";
import { formatDate } from "@/lib/format";
import { getDeliverablesByProjectId } from "@/lib/mock-data/deliverables";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import type { ProjectStatus } from "@/types/project";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import type { Task } from "@/types/task";

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role } = useAuth();
  const {
    uid,
    organizationId,
    loaded,
    errors,
    retry,
    getProjectById,
    getMemberById,
    getTasksByProjectId,
    getActivityByProjectId,
    updateProjectStatus,
    deleteProject,
  } = useWorkspace();

  const [statusSaving, setStatusSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Lazy initializer (not an effect) — lets a link like
  // /projects/[id]?tab=work-verification land directly on that tab, e.g.
  // from the dashboard's "Submit Daily Update" / manager "Review" CTAs,
  // instead of always opening on Overview and making the user find the tab
  // themselves a second time.
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "overview");
  // Same lazy-init pattern — preselects the Daily Work Update form's Task
  // field when arriving via a link like ?task=<id> (e.g. the "Daily Work
  // Update" button inside a task's own detail dialog, opened from Kanban or
  // My Tasks — different pages, so that button navigates here rather than
  // switching a tab it doesn't have access to).
  const [preselectTaskId, setPreselectTaskId] = useState(() => searchParams.get("task"));
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const loading = !loaded.projects || !loaded.tasks || !loaded.members || !loaded.activity;
  const project = getProjectById(projectId);
  const tasks = getTasksByProjectId(projectId);
  const activity = getActivityByProjectId(projectId);
  const deliverables = getDeliverablesByProjectId(projectId);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  // Work Verification — one shared listener for the whole project (used by
  // both the member's own DailyUpdatePanel and, for an authorized reviewer,
  // the ProjectVerificationDashboard below), only ever subscribed when this
  // project actually has the feature turned on.
  const [dailyUpdates, setDailyUpdates] = useState<DailyWorkUpdate[]>([]);
  useEffect(() => {
    if (!project?.workVerificationEnabled) {
      // Deferred so this never calls setState synchronously inside the
      // effect body — same async pattern used elsewhere in this app for
      // clearing state when a dependency goes away.
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) setDailyUpdates([]);
      });
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = dailyUpdateService.subscribeToProjectDailyUpdates(
      projectId,
      setDailyUpdates,
      () => setDailyUpdates([])
    );
    return unsubscribe;
  }, [project?.workVerificationEnabled, projectId]);

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="mb-4 h-9 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (errors.projects) {
    return <ErrorState message={errors.projects} onRetry={retry} />;
  }

  if (!project) {
    notFound();
  }

  const health = calculateProjectHealth(project, tasks);
  // Same "management data vs. execution data" boundary as TaskFormDialog:
  // an Org Admin, Super Admin, or this specific project's assigned manager
  // gets the full workspace (Tasks/Members/Deliverables, project edit/
  // delete); everyone else gets the trimmed, execution-focused view (My
  // Tasks instead of the full Tasks table) — matching what firestore.rules
  // actually lets each of them do to this project.
  const canManageProject = role === "admin" || role === "super_admin" || project.managerId === uid;
  const canDeleteProject = role === "admin" || role === "super_admin";
  const myTasks = tasks.filter((task) => task.assignedTo === uid);

  async function handleStatusChange(nextStatus: ProjectStatus) {
    if (!project || nextStatus === project.status) return;
    setStatusSaving(true);
    try {
      await updateProjectStatus(project.id, nextStatus);
      setSuccessMessage(`Status updated to ${nextStatus}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  function handleOpenTask(task: Task) {
    setOpenTask(task);
    setTaskDialogOpen(true);
  }

  // Same page, no navigation needed — switch straight to the Work
  // Verification tab with this task preselected, and close the task dialog
  // that triggered it.
  function handleOpenDailyUpdateForTask(task: Task) {
    setPreselectTaskId(task.id);
    setActiveTab("work-verification");
    setTaskDialogOpen(false);
  }

  async function handleDelete() {
    if (!project) return;
    const confirmed = window.confirm(`Delete "${project.name}"? This will also delete its tasks and can't be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.replace("/projects");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete project.");
      setDeleting(false);
    }
  }

  return (
    <div>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
            <PriorityBadge priority={project.priority} />
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Owned by <span className="font-medium text-foreground">{getMemberById(project.ownerId)?.name}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            {project.workVerificationEnabled && (
              <Button size="sm" variant="outline" onClick={() => setActiveTab("work-verification")}>
                <ListChecks />
                Submit Daily Update
              </Button>
            )}
            <ProjectStatusControl status={project.status} onStatusChange={handleStatusChange} saving={statusSaving} />
            {(canManageProject || canDeleteProject) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon-sm" aria-label="Project actions" />}
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageProject && (
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil />
                      Edit project
                    </DropdownMenuItem>
                  )}
                  {canDeleteProject && (
                    <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={deleting}>
                      <Trash2 />
                      {deleting ? "Deleting..." : "Delete project"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDate(project.startDate)} – {formatDate(project.dueDate)}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value ?? "overview")}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canManageProject ? (
            <>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="members">Members ({project.memberIds.length})</TabsTrigger>
              <TabsTrigger value="deliverables">Deliverables ({deliverables.length})</TabsTrigger>
            </>
          ) : (
            <TabsTrigger value="my-tasks">My Tasks ({myTasks.length})</TabsTrigger>
          )}
          <TabsTrigger value="files">Files &amp; Requirements</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          {project.workVerificationEnabled && (
            <TabsTrigger value="work-verification">{canManageProject ? "Work Verification" : "Daily Updates"}</TabsTrigger>
          )}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
              <CardDescription>Calculated from overdue/blocked tasks, progress, and the deadline</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectHealthExplanation health={health} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Current stage and completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProjectStatusStepper status={project.status} />
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Key dates and recent events</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectTimeline project={project} activity={activity} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Task Breakdown</CardTitle>
                <CardDescription>Where each task in this project currently stands</CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {tasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => handleOpenTask(task)}
                          className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {task.title}
                        </button>
                        <StatusBadge status={task.status} className="shrink-0" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Requirements</CardTitle>
                <CardDescription>Requirement documents and reference files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4 shrink-0" />
                  Attached under Files &amp; Requirements
                </p>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("files")}>
                  View Requirements &amp; Files
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>{tasks.length} tasks in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskTable tasks={tasks} onEdit={handleOpenTask} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-tasks" className="mt-4">
          {organizationId && <ProjectMyTasksPanel organizationId={organizationId} projectId={project.id} myTasks={myTasks} onOpenTask={handleOpenTask} />}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>{project.memberIds.length} people on this project</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectTeam project={project} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
              <CardDescription>Artifacts produced by this project</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliverablesList deliverables={deliverables} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Files &amp; Requirements</CardTitle>
              <CardDescription>Project requirement documents and other files — upload the requirement doc here so every assigned member can find it</CardDescription>
            </CardHeader>
            <CardContent>
              {uid && organizationId && (
                <AttachmentSection
                  organizationId={organizationId}
                  currentUserId={uid}
                  getUploaderName={(uploaderUid) => getMemberById(uploaderUid)?.name}
                  target={{ kind: "project", projectId: project.id }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>Project-level conversation, separate from individual task comments</CardDescription>
            </CardHeader>
            <CardContent>
              {uid && organizationId && (
                <CommentSection
                  organizationId={organizationId}
                  currentUserId={uid}
                  currentUserName={getMemberById(uid)?.name ?? user?.displayName ?? user?.email ?? "You"}
                  getAuthorName={(authorUid) => getMemberById(authorUid)?.name}
                  target={{ kind: "project", projectId: project.id }}
                  notifyRecipientIds={[project.ownerId, project.managerId, ...project.memberIds]}
                  getRecipientPreferences={(memberUid) => getMemberById(memberUid)?.notificationPreferences}
                  entityLabel={project.name}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {project.workVerificationEnabled && uid && organizationId && (
          <TabsContent value="work-verification" className="mt-4 space-y-8">
            {(() => {
              const today = dailyUpdateService.todayDateKey();
              const myUpdates = dailyUpdates.filter((u) => u.userId === uid);
              const todayUpdate = myUpdates.find((u) => u.date === today) ?? null;
              const recentUpdates = myUpdates.filter((u) => u.date !== today);
              const canReview = role === "admin" || role === "super_admin" || project.managerId === uid;
              const projectMembers = project.memberIds
                .map((id) => getMemberById(id))
                .filter((m): m is NonNullable<typeof m> => Boolean(m));
              const reviewRecipientIds = [project.managerId, ...projectMembers.filter((m) => m.role === "Admin").map((m) => m.id)];
              return (
                <>
                  <DailyUpdatePanel
                    organizationId={organizationId}
                    projectId={project.id}
                    projectName={project.name}
                    uid={uid}
                    userName={getMemberById(uid)?.name ?? user?.displayName ?? user?.email ?? "You"}
                    tasks={tasks}
                    todayUpdate={todayUpdate}
                    recentUpdates={recentUpdates}
                    notifyRecipientIds={reviewRecipientIds}
                    getRecipientPreferences={(memberUid) => getMemberById(memberUid)?.notificationPreferences}
                    initialTaskId={preselectTaskId}
                  />
                  {canReview && (
                    <ProjectVerificationDashboard
                      organizationId={organizationId}
                      projectId={project.id}
                      projectName={project.name}
                      reviewerUid={uid}
                      members={projectMembers}
                      tasks={tasks}
                      updates={dailyUpdates}
                      getRecipientPreferences={(memberUid) => getMemberById(memberUid)?.notificationPreferences}
                    />
                  )}
                </>
              );
            })()}
          </TabsContent>
        )}

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent updates on this project</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length > 0 ? (
                <RecentActivity entries={activity} />
              ) : (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        key={project.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={() => setSuccessMessage(`"${project.name}" was updated.`)}
      />

      <TaskFormDialog
        key={openTask?.id ?? "none"}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSaved={() => {}}
        task={openTask}
        onOpenDailyUpdate={handleOpenDailyUpdateForTask}
      />
    </div>
  );
}
