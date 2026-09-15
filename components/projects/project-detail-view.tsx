"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
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
            <ProjectStatusControl status={project.status} onStatusChange={handleStatusChange} saving={statusSaving} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="Project actions" />}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={deleting}>
                  <Trash2 />
                  {deleting ? "Deleting..." : "Delete project"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({project.memberIds.length})</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables ({deliverables.length})</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          {project.workVerificationEnabled && <TabsTrigger value="work-verification">Work Verification</TabsTrigger>}
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
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>{tasks.length} tasks in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskTable tasks={tasks} />
            </CardContent>
          </Card>
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
              <CardTitle>Files</CardTitle>
              <CardDescription>Documents and files attached to this project</CardDescription>
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
    </div>
  );
}
