"use client";

import { useEffect, useRef, useState } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, CheckCircle2, File as FileIcon, HelpCircle, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dailyWorkUpdateFormSchema,
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
  EVIDENCE_URL_FIELD,
  FILE_EVIDENCE_TYPES,
  type DailyWorkUpdateFormValues,
} from "@/lib/validation/daily-work-update.schema";
import { IMAGE_ATTACHMENT_TYPES, DOCUMENT_ATTACHMENT_TYPES, IMAGE_ATTACHMENT_INPUT_ACCEPT, DOCUMENT_ATTACHMENT_INPUT_ACCEPT, validateAttachmentFile } from "@/lib/validation/attachment";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import * as attachmentService from "@/lib/services/attachment.service";
import * as notificationService from "@/lib/services/notification.service";
import { formatDate, formatFileSize } from "@/lib/format";
import type { DailyWorkUpdate, EvidenceType } from "@/types/daily-work-update";
import type { Attachment } from "@/types/attachment";
import type { Task } from "@/types/task";

const NO_TASK = "none";

const STATUS_META: Record<DailyWorkUpdate["status"], { icon: typeof CheckCircle2; label: string; className: string }> = {
  SUBMITTED: { icon: HelpCircle, label: "Submitted — awaiting review", className: "text-muted-foreground" },
  VERIFIED: { icon: CheckCircle2, label: "Verified by Manager", className: "text-success" },
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

const emptyEvidence = { type: EVIDENCE_TYPES[0], url: "", title: "", description: "", attachmentId: undefined, fileName: undefined };

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

  // Without this, an invalid submission (most commonly: an evidence row
  // whose file upload never succeeded, so it has no attachmentId) simply
  // does nothing visible beyond a small per-row message under that one
  // evidence entry — indistinguishable, from the user's perspective, from
  // "the Submit button is broken." This makes the failure impossible to miss.
  function onInvalid(formErrors: typeof errors) {
    if (formErrors.evidence) {
      setError("One or more evidence items are incomplete — upload the missing file (or remove that evidence entry) before submitting.");
      return;
    }
    setError("Please fix the highlighted fields before submitting.");
  }

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
          <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
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
                  <EvidenceRow
                    key={field.id}
                    control={control}
                    index={index}
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    organizationId={organizationId}
                    projectId={projectId}
                    uid={uid}
                    onRemove={() => remove(index)}
                  />
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

interface EvidenceRowProps {
  control: Control<DailyWorkUpdateFormValues>;
  index: number;
  register: UseFormRegister<DailyWorkUpdateFormValues>;
  setValue: UseFormSetValue<DailyWorkUpdateFormValues>;
  errors: FieldErrors<DailyWorkUpdateFormValues>;
  organizationId: string;
  projectId: string;
  uid: string;
  onRemove: () => void;
}

/**
 * One evidence entry, its input shape entirely driven by the selected type —
 * a URL field for GITHUB_REPOSITORY/GITHUB_COMMIT/GITHUB_PR/DEPLOYMENT/OTHER_URL,
 * a real file upload for SCREENSHOT/DOCUMENT. A generic "Evidence URL" text box for every type was
 * the actual bug this replaces: asking for a URL when the employee has a
 * screenshot to attach makes no sense and doesn't match what the type is
 * supposed to mean.
 *
 * File uploads go through the EXISTING attachments Storage/Firestore flow
 * (lib/services/attachment.service.ts) — never a second upload path — as a
 * project-level attachment (taskId: null; the update's own optional taskId
 * is a separate, independently-changeable field, so tying the file to it
 * would be a moving target). Only `attachmentId`/`fileName` are stored on
 * the evidence entry, never a persistent download URL — see
 * types/daily-work-update.ts's WorkEvidence for why that matters.
 */
function EvidenceRow({ control, index, register, setValue, errors, organizationId, projectId, uid, onRemove }: EvidenceRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const type = useWatch({ control, name: `evidence.${index}.type` }) as EvidenceType;
  const attachmentId = useWatch({ control, name: `evidence.${index}.attachmentId` });
  const fileName = useWatch({ control, name: `evidence.${index}.fileName` });
  const fileSize = useWatch({ control, name: `evidence.${index}.fileSize` });
  const isFileType = FILE_EVIDENCE_TYPES.has(type);
  const urlField = EVIDENCE_URL_FIELD[type];

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = type === "SCREENSHOT";
    const validation = validateAttachmentFile(file, isImage ? IMAGE_ATTACHMENT_TYPES : DOCUMENT_ATTACHMENT_TYPES);
    if (!validation.ok) {
      setUploadError(validation.error ?? "That file can't be uploaded.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const attachment: Attachment = await attachmentService.uploadAttachment(
        { organizationId, projectId, taskId: null, uploadedBy: uid, file },
        setUploadProgress
      );
      setValue(`evidence.${index}.attachmentId`, attachment.id, { shouldValidate: true });
      setValue(`evidence.${index}.fileName`, attachment.fileName);
      setValue(`evidence.${index}.fileSize`, attachment.size);
      setValue(`evidence.${index}.url`, "");
      if (isImage) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    } catch (err) {
      // Never pretend the file was uploaded — no fake URL, no fake success.
      setUploadError(err instanceof Error ? err.message : "Failed to upload file. Firebase Storage may not be available right now.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleRemoveFile() {
    setValue(`evidence.${index}.attachmentId`, undefined);
    setValue(`evidence.${index}.fileName`, undefined);
    setValue(`evidence.${index}.fileSize`, undefined);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadError(null);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={`evidence.${index}.type`}
          render={({ field: f }) => (
            <Select
              value={f.value}
              onValueChange={(next) => {
                if (next === f.value) return;
                handleRemoveFile();
                setValue(`evidence.${index}.url`, "");
                f.onChange(next);
              }}
            >
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
        <Button type="button" variant="ghost" size="icon-sm" className="ml-auto shrink-0" aria-label="Remove evidence" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      {isFileType ? (
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept={type === "SCREENSHOT" ? IMAGE_ATTACHMENT_INPUT_ACCEPT : DOCUMENT_ATTACHMENT_INPUT_ACCEPT}
            className="hidden"
            onChange={handleFileSelected}
          />
          {attachmentId && fileName ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ephemeral local object: URL, not a remote/optimizable image
                <img src={previewUrl} alt={fileName} className="size-8 shrink-0 rounded object-cover" />
              ) : (
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {fileName}
                {typeof fileSize === "number" && <span className="text-muted-foreground"> · {formatFileSize(fileSize)}</span>}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Replace
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={handleRemoveFile} disabled={uploading}>
                <Trash2 />
              </Button>
            </div>
          ) : uploading ? (
            <div className="space-y-1.5 rounded-md border border-border px-2.5 py-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Uploading...
              </p>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              Upload {type === "SCREENSHOT" ? "Screenshot" : "Document"}
            </Button>
          )}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          {errors.evidence?.[index]?.attachmentId && !uploadError && (
            <p className="text-xs text-destructive">{errors.evidence[index]?.attachmentId?.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor={`evidence-${index}-url`} className="text-xs text-muted-foreground">
            {urlField?.label ?? "URL"}
          </Label>
          <Input id={`evidence-${index}-url`} placeholder={urlField?.placeholder ?? "https://..."} {...register(`evidence.${index}.url`)} />
          {errors.evidence?.[index]?.url && <p className="text-xs text-destructive">{errors.evidence[index]?.url?.message}</p>}
        </div>
      )}

      <Input placeholder="Description (optional)" {...register(`evidence.${index}.description`)} />
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
                {e.attachmentId ? (
                  <EvidenceFileLink organizationId={update.organizationId} projectId={update.projectId} attachmentId={e.attachmentId} fileName={e.fileName} label={EVIDENCE_TYPE_LABELS[e.type]} />
                ) : (
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {EVIDENCE_TYPE_LABELS[e.type]}
                  </a>
                )}
                {e.description && <span className="text-muted-foreground"> — {e.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * A SCREENSHOT/DOCUMENT evidence entry has no persistent URL to link to
 * (see WorkEvidence's own doc comment on why) — opening it re-fetches the
 * file through the authenticated SDK on demand, exactly like the
 * Attachments feature's own download button, so storage.rules/firestore.rules'
 * per-project authorization is re-checked every time, not just once at
 * upload.
 */
function EvidenceFileLink({
  organizationId,
  projectId,
  attachmentId,
  fileName,
  label,
}: {
  organizationId: string;
  projectId: string;
  attachmentId: string;
  fileName?: string;
  label: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    setDownloading(true);
    try {
      const storagePath = attachmentService.storagePathFor(organizationId, projectId, null, attachmentId);
      const blobUrl = await attachmentService.downloadAttachmentBlob(storagePath);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName ?? label;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open this file.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={handleOpen} disabled={downloading} className="text-primary hover:underline disabled:opacity-60">
        {downloading ? "Opening..." : (fileName ?? label)}
      </button>
      {error && <span className="text-xs text-destructive">({error})</span>}
    </span>
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
