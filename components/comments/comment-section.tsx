"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { commentFormSchema, type CommentFormValues } from "@/lib/validation/comment.schema";
import * as commentService from "@/lib/services/comment.service";
import * as notificationService from "@/lib/services/notification.service";
import { initials, timeAgo } from "@/lib/format";
import type { Comment } from "@/types/comment";

type CommentTarget = { kind: "project"; projectId: string } | { kind: "task"; taskId: string; projectId: string };

interface CommentSectionProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
  /** Kept structurally loose so both useWorkspace()'s getMemberById and usePlatform()'s getUser can be passed directly. */
  getAuthorName: (uid: string) => string | undefined;
  target: CommentTarget;
  /** Compact = inside a dialog alongside other fields (smaller heading, tighter spacing). Default = a standalone tab/section. */
  variant?: "default" | "compact";
  /**
   * PHASE F — candidate uids to notify when a NEW comment is posted (e.g.
   * [task.assignedTo, task.ownerId, project.managerId] for a task comment,
   * or a project's [ownerId, managerId, ...memberIds] for a project
   * comment). The author is excluded automatically (see notifyUsers()), so
   * callers can pass the raw set without pre-filtering. Omit entirely to
   * skip comment notifications for this instance.
   */
  notifyRecipientIds?: Array<string | null | undefined>;
  /** Same lookup shape as getAuthorName — gates each recipient's notification against their stored "task-comments"/"project-comments" preference without an extra Firestore read. */
  getRecipientPreferences?: (uid: string) => Record<string, boolean> | undefined;
  /** Task title or project name, used in the notification message (e.g. `${author} commented on "${entityLabel}".`). Required for notifications to actually fire — silently skipped if notifyRecipientIds is given without this. */
  entityLabel?: string;
}

/**
 * A discussion thread on either a project or a task. Manages its own scoped
 * Firestore subscription directly via lib/services/comment.service.ts
 * (never useWorkspace()/usePlatform()) — same deliberate choice as
 * components/tasks/subtask-checklist.tsx: comments are only ever needed
 * while this specific project page or task dialog is open, so a global,
 * always-on listener for every comment in the organization would be wasted.
 * Still "go through a service function" per this repo's data-access rule,
 * just not through the global providers — and it's the one component this
 * app renders from both the individual-contributor shell and the admin
 * console, so it takes no dependency on either provider's shape.
 */
export function CommentSection({
  organizationId,
  currentUserId,
  currentUserName,
  getAuthorName,
  target,
  variant = "default",
  notifyRecipientIds,
  getRecipientPreferences,
  entityLabel,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    // target.kind/target's id never actually change within one mount here —
    // the project page remounts per project via routing, and the task
    // dialogs remount per task via key={task?.id ?? "new"} (this repo's
    // standard convention) — so this subscription effect only runs once.
    const onData = (data: Comment[]) => {
      setComments(data);
      setLoaded(true);
    };
    const onError = (message: string) => {
      setListError(message);
      setLoaded(true);
    };
    const unsubscribe =
      target.kind === "project"
        ? commentService.subscribeToProjectComments(organizationId, target.projectId, onData, onError)
        : commentService.subscribeToTaskComments(organizationId, target.taskId, onData, onError);
    return unsubscribe;
  }, [organizationId, target]);

  async function onSubmit(values: CommentFormValues) {
    setActionError(null);
    try {
      const commentId = await commentService.createComment({
        organizationId,
        authorId: currentUserId,
        content: values.content,
        projectId: target.projectId,
        taskId: target.kind === "task" ? target.taskId : null,
      });
      reset({ content: "" });

      // Best-effort — a failed notification fan-out must never surface as a
      // "your comment failed to post" error, since the comment itself has
      // already been written successfully by this point.
      if (notifyRecipientIds && notifyRecipientIds.length > 0 && entityLabel) {
        notificationService
          .notifyUsers({
            organizationId,
            actorId: currentUserId,
            recipientIds: notifyRecipientIds,
            type: target.kind === "task" ? "task_commented" : "project_commented",
            title: "New comment",
            message:
              target.kind === "task"
                ? `${currentUserName} commented on "${entityLabel}".`
                : `${currentUserName} commented on project "${entityLabel}".`,
            href: target.kind === "task" ? "/tasks" : `/projects/${target.projectId}`,
            projectId: target.projectId,
            taskId: target.kind === "task" ? target.taskId : null,
            commentId,
            getPreferences: getRecipientPreferences,
          })
          .catch((error) => console.error("CommentSection: notifyUsers failed", error));
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to post comment.");
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditValue(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(comment: Comment) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setActionError(null);
    try {
      await commentService.updateComment(comment.id, trimmed);
      cancelEdit();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update comment.");
    }
  }

  async function handleDelete(comment: Comment) {
    const confirmed = window.confirm("Delete this comment? This can't be undone.");
    if (!confirmed) return;
    setActionError(null);
    try {
      await commentService.deleteComment(comment.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete comment.");
    }
  }

  const heading = variant === "compact" ? "text-sm font-medium text-foreground" : "text-base font-semibold tracking-tight text-foreground";

  return (
    <div className={variant === "compact" ? "space-y-2.5 border-t border-border pt-4" : "space-y-4"}>
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className={heading}>Discussion{comments.length > 0 ? ` (${comments.length})` : ""}</span>
      </div>

      {listError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{listError}</span>
        </div>
      )}

      {!loaded && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {loaded && !listError && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet — start the discussion below.</p>
      )}

      {comments.length > 0 && (
        <ul className={variant === "compact" ? "max-h-56 space-y-3 overflow-y-auto" : "space-y-4"}>
          {comments.map((comment) => {
            const authorName = getAuthorName(comment.authorId) ?? "Unknown";
            const isAuthor = comment.authorId === currentUserId;
            const wasEdited = comment.updatedAt !== comment.createdAt;
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="flex items-start gap-2.5">
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  <AvatarFallback>{initials(authorName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{authorName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(comment.createdAt)}
                      {wasEdited ? " · edited" : ""}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-1.5 space-y-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={3}
                        autoFocus
                        maxLength={2000}
                      />
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={() => saveEdit(comment)} disabled={!editValue.trim()}>
                          <Check />
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                          <X />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{comment.content}</p>
                  )}

                  {isAuthor && !isEditing && (
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(comment)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2.5">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback>{initials(currentUserName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Textarea placeholder="Add a comment..." rows={2} maxLength={2000} {...register("content")} />
          {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
