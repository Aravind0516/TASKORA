"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dailyWorkUpdateFormSchema, EVIDENCE_TYPES, EVIDENCE_TYPE_LABELS, type DailyWorkUpdateFormValues } from "@/lib/validation/daily-work-update.schema";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import * as notificationService from "@/lib/services/notification.service";
import { formatDate } from "@/lib/format";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import type { Task } from "@/types/task";

const NO_TASK = "none";

const STATUS_META: Record<DailyWorkUpdate["status"], { icon: typeof CheckCircle2; label: string; className: string }> = {
  SUBMITTED: { icon: HelpCircle, label: "Submitted — awaiting review", className: "text-muted-foreground" },
  VERIFIED: { icon: CheckCircle2, label: "Verified by Manager", className: "text-[#0ca30c]" },
  PARTIALLY_VERIFIED: { icon: AlertTriangle, label: "Partially verified", className: "text-amber-600 dark:text-amber-400" },
  NEEDS_CLARIFICATION: { icon: HelpCircle, label: "Needs clarification", className: "text-amber-600 dark:text-amber-400" },
};

interface DailyUpdatePanelProps {
  organizationId: string;
  projectId: string;
  projectName: string;
  uid: string;
  userName: string;
  tasks: Task[];
  /** Today's update for this project + this user, if one already exists (from the parent's single shared subscription). null while none has been submitted yet today. */
  todayUpdate: DailyWorkUpdate | null;
  /** This user's own recent updates for this project (excluding today's), newest first. */
  recentUpdates: DailyWorkUpdate[];
  notifyRecipientIds: Array<string | null | undefined>;
  getRecipientPreferences?: (uid: string) => Record<string, boolean> | undefined;
  /** Preselects the Task field — set when arriving here via a task's own "Daily Work Update" button, so the employee doesn't have to re-pick a task TASKORA already knows. Only applied to a fresh (not-yet-submitted) form; never overrides an existing todayUpdate's own taskId. */
  initialTaskId?: string | null;
}

const emptyEvidence = { type: EVIDENCE_TYPES[0], url: "", title: "", description: "" };

export function DailyUpdatePanel({
  organizationId,
  projectId,
  projectName,
  uid,
  userName,
  tasks,
  todayUpdate,
  recentUpdates,
  notifyRecipientIds,
  getRecipientPreferences,
  initialTaskId,
}: DailyUpdatePanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const isReviewed = todayUpdate && todayUpdate.status !== "SUBMITTED";
  const showForm = !todayUpdate || editing;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DailyWorkUpdateFormValues>({
    resolver: zodResolver(dailyWorkUpdateFormSchema),
    defaultValues: { taskId: initialTaskId ?? undefined, workSummary: "", completedWork: "", blockers: "", tomorrowPlan: "", evidence: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "evidence" });

  useEffect(() => {
    if (todayUpdate) {
      reset({
        taskId: todayUpdate.taskId ?? undefined,
        workSummary: todayUpdate.workSummary,
        completedWork: todayUpdate.completedWork,
        blockers: todayUpdate.blockers,
        tomorrowPlan: todayUpdate.tomorrowPlan,
        evidence: todayUpdate.evidence,
      });
    }
  }, [todayUpdate, reset]);

  // Reactive, not just the initial defaultValues — covers arriving at an
  // already-mounted panel (e.g. Tabs keeps this mounted while hidden) via a
  // second "Daily Work Update" click from a different task. Never runs once
  // a real update already exists for today — that update's own taskId
  // already won via the effect above.
  useEffect(() => {
    if (!todayUpdate && initialTaskId) {
      setValue("taskId", initialTaskId);
    }
  }, [initialTaskId, todayUpdate, setValue]);

  async function onSubmit(values: DailyWorkUpdateFormValues) {
    setSubmitting(true);
    setError(null);
    const taskId = values.taskId && values.taskId !== NO_TASK ? values.taskId : null;
    const evidence = values.evidence.map((e) => ({ ...e, submittedAt: new Date().toISOString() }));
    try {
      if (todayUpdate) {
        await dailyUpdateService.editOwnDailyUpdate(todayUpdate.id, {
          taskId,
          workSummary: values.workSummary,
          completedWork: values.completedWork,
          blockers: values.blockers,
          tomorrowPlan: values.tomorrowPlan,
          evidence,
        });
      } else {
        await dailyUpdateService.createDailyUpdate({
          organizationId,
          projectId,
          taskId,
          userId: uid,
          date: dailyUpdateService.todayDateKey(),
          workSummary: values.workSummary,
          completedWork: values.completedWork,
          blockers: values.blockers,
          tomorrowPlan: values.tomorrowPlan,
          evidence,
        });
        if (notifyRecipientIds.length > 0) {
          notificationService
            .notifyUsers({
              organizationId,
              actorId: uid,
              recipientIds: notifyRecipientIds,
              type: "daily_update_submitted",
              title: "Daily update submitted",
              message: `${userName} submitted today's work update on "${projectName}".`,
              href: `/projects/${projectId}`,
              getPreferences: getRecipientPreferences,
            })
            .catch((e) => console.error("DailyUpdatePanel: notifyUsers failed", e));
        }
      }
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit your update.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Daily Work Update</CardTitle>
          <CardDescription>Submit your work so your progress can be reviewed and recognized.</CardDescription>
        </CardHeader>

        {!showForm && todayUpdate ? (
          <CardContent className="space-y-4">
            <ReadOnlyUpdate update={todayUpdate} tasks={tasks} />
            {todayUpdate.status === "SUBMITTED" && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit today&apos;s update
              </Button>
            )}
            {isReviewed && <ReviewFeedback update={todayUpdate} />}
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="duw-task">Task (optional)</Label>
                  <Controller
                    control={control}
                    name="taskId"
                    render={({ field }) => (
                      <Select value={field.value || NO_TASK} onValueChange={(v) => field.onChange(v === NO_TASK ? undefined : v)}>
                        <SelectTrigger id="duw-task" className="w-full">
                          <SelectValue placeholder="Project-level update" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TASK}>Project-level update</SelectItem>
                          {tasks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="duw-summary">Today&apos;s Work</Label>
                <Textarea id="duw-summary" rows={3} placeholder="What did you work on today?" {...register("workSummary")} />
                {errors.workSummary && <p className="text-xs text-destructive">{errors.workSummary.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duw-completed">Completed Today</Label>
                <Textarea id="duw-completed" rows={2} placeholder="What did you finish?" {...register("completedWork")} />
                {errors.completedWork && <p className="text-xs text-destructive">{errors.completedWork.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duw-blockers">Blockers</Label>
                <Textarea id="duw-blockers" rows={2} placeholder="Anything blocking you? (optional)" {...register("blockers")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duw-plan">Tomorrow&apos;s Plan</Label>
                <Textarea id="duw-plan" rows={2} placeholder="What's next? (optional)" {...register("tomorrowPlan")} />
              </div>

              <div className="space-y-2.5 border-t border-border pt-4">
                <Label className="text-sm font-medium text-foreground">Work Evidence</Label>
                {fields.length === 0 && (
                  <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    No work evidence attached. Your manager may request supporting evidence.
                  </p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`evidence.${index}.type`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="w-48 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EVIDENCE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {EVIDENCE_TYPE_LABELS[t]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon-sm" className="ml-auto shrink-0" aria-label="Remove evidence" onClick={() => remove(index)}>
                        <Trash2 />
                      </Button>
                    </div>
                    <Input placeholder="Evidence URL" {...register(`evidence.${index}.url`)} />
                    {errors.evidence?.[index]?.url && <p className="text-xs text-destructive">{errors.evidence[index]?.url?.message}</p>}
                    <Input placeholder="Description (optional)" {...register(`evidence.${index}.description`)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append(emptyEvidence)}>
                  <Plus />
                  Add Evidence
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              {editing && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={submitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Daily Update"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      {recentUpdates.length > 0 && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Daily Update History</CardTitle>
            <CardDescription>Your past submissions on this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 divide-y divide-border">
            {recentUpdates.slice(0, 7).map((u) => {
              const meta = STATUS_META[u.status];
              const Icon = meta.icon;
              const task = u.taskId ? tasks.find((t) => t.id === u.taskId) : null;
              return (
                <div key={u.id} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{formatDate(u.date)}</span>
                    <span className={`flex items-center gap-1.5 text-xs ${meta.className}`}>
                      <Icon className="size-3.5" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {task ? task.title : "Project-level"} · {u.workSummary}
                    {u.evidence.length > 0 && ` · ${u.evidence.length} evidence item${u.evidence.length === 1 ? "" : "s"}`}
                  </p>
                  {u.reviewerComment && <p className="mt-0.5 text-xs text-foreground">&quot;{u.reviewerComment}&quot;</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadOnlyUpdate({ update, tasks }: { update: DailyWorkUpdate; tasks: Task[] }) {
  const task = update.taskId ? tasks.find((t) => t.id === update.taskId) : null;
  return (
    <div className="space-y-3 text-sm">
      {task && <p className="text-xs text-muted-foreground">Task: {task.title}</p>}
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Today&apos;s Work</p>
        <p className="mt-1 text-foreground">{update.workSummary}</p>
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Completed</p>
        <p className="mt-1 text-foreground">{update.completedWork}</p>
      </div>
      {update.blockers && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Blockers</p>
          <p className="mt-1 text-foreground">{update.blockers}</p>
        </div>
      )}
      {update.evidence.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Evidence</p>
          <ul className="mt-1 space-y-1">
            {update.evidence.map((e, i) => (
              <li key={i}>
                <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {EVIDENCE_TYPE_LABELS[e.type]}
                </a>
                {e.description && <span className="text-muted-foreground"> — {e.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ReviewFeedback({ update }: { update: DailyWorkUpdate }) {
  const meta = STATUS_META[update.status];
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-border p-3.5">
      <p className={`flex items-center gap-1.5 text-sm font-medium ${meta.className}`}>
        <Icon className="size-4" />
        {meta.label}
      </p>
      {update.reviewerComment && (
        <div className="mt-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Manager comment</p>
          <p className="mt-1 text-sm text-foreground">&quot;{update.reviewerComment}&quot;</p>
        </div>
      )}
    </div>
  );
}
