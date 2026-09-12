"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, File as FileIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import * as attachmentService from "@/lib/services/attachment.service";
import { validateAttachmentFile, ATTACHMENT_INPUT_ACCEPT } from "@/lib/validation/attachment";
import { formatFileSize, timeAgo } from "@/lib/format";
import type { Attachment } from "@/types/attachment";

type AttachmentTarget = { kind: "project"; projectId: string } | { kind: "task"; taskId: string; projectId: string };

interface AttachmentSectionProps {
  organizationId: string;
  currentUserId: string;
  /** Kept structurally loose so both useWorkspace()'s getMemberById and usePlatform()'s getUser can be passed directly. */
  getUploaderName: (uid: string) => string | undefined;
  target: AttachmentTarget;
  /** Compact = inside a dialog alongside other fields (smaller heading, tighter spacing). Default = a standalone tab/section. */
  variant?: "default" | "compact";
}

/**
 * Files attached to a project or a task. Manages its own scoped Firestore +
 * Storage access directly via lib/services/attachment.service.ts (never
 * useWorkspace()/usePlatform()) — same deliberate choice as CommentSection
 * and SubtaskChecklist: attachments are only ever needed while this specific
 * project page or task dialog is open, so a global, always-on listener for
 * every attachment in the organization would be wasted. The delete
 * affordance is shown only to the uploader, matching CommentSection's own
 * author-only delete button — an org admin can still delete via
 * firestore.rules' broader permission, just not from this UI, for the same
 * reason CommentSection doesn't surface that either.
 */
export function AttachmentSection({ organizationId, currentUserId, getUploaderName, target, variant = "default" }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // target's kind/id never actually change within one mount here — same
    // rationale documented in CommentSection.
    const onData = (data: Attachment[]) => {
      setAttachments(data);
      setLoaded(true);
    };
    const onError = (message: string) => {
      setListError(message);
      setLoaded(true);
    };
    const unsubscribe =
      target.kind === "project"
        ? attachmentService.subscribeToProjectAttachments(organizationId, target.projectId, onData, onError)
        : attachmentService.subscribeToTaskAttachments(organizationId, target.taskId, onData, onError);
    return unsubscribe;
  }, [organizationId, target]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || uploading) return;

    const validation = validateAttachmentFile(file);
    if (!validation.ok) {
      setActionError(validation.error ?? "That file can't be uploaded.");
      return;
    }

    setActionError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      await attachmentService.uploadAttachment(
        {
          organizationId,
          projectId: target.projectId,
          taskId: target.kind === "task" ? target.taskId : null,
          uploadedBy: currentUserId,
          file,
        },
        setUploadProgress
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDownload(attachment: Attachment) {
    setActionError(null);
    setDownloadingId(attachment.id);
    try {
      const blobUrl = await attachmentService.downloadAttachmentBlob(attachment.storagePath);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachment: Attachment) {
    const confirmed = window.confirm(`Delete "${attachment.fileName}"? This can't be undone.`);
    if (!confirmed) return;
    setActionError(null);
    setDeletingId(attachment.id);
    try {
      await attachmentService.deleteAttachment(attachment);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  }

  const heading = variant === "compact" ? "text-sm font-medium text-foreground" : "text-base font-semibold tracking-tight text-foreground";

  return (
    <div className={variant === "compact" ? "space-y-2.5 border-t border-border pt-4" : "space-y-4"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <span className={heading}>Attachments{attachments.length > 0 ? ` (${attachments.length})` : ""}</span>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? `Uploading… ${uploadProgress}%` : "Upload"}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" accept={ATTACHMENT_INPUT_ACCEPT} onChange={handleFileSelected} />
      </div>

      {uploading && <Progress value={uploadProgress} />}

      {listError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{listError}</span>
        </div>
      )}

      {!loaded && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {loaded && !listError && attachments.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      )}

      {attachments.length > 0 && (
        <ul className={variant === "compact" ? "max-h-56 space-y-1.5 overflow-y-auto" : "space-y-1.5"}>
          {attachments.map((attachment) => {
            const uploaderName = getUploaderName(attachment.uploadedBy) ?? "Unknown";
            const isUploader = attachment.uploadedBy === currentUserId;
            const isDeleting = deletingId === attachment.id;
            const isDownloading = downloadingId === attachment.id;

            return (
              <li key={attachment.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-muted">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{attachment.fileName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)} · {uploaderName} · {timeAgo(attachment.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  aria-label={`Download ${attachment.fileName}`}
                  disabled={isDownloading}
                  onClick={() => handleDownload(attachment)}
                >
                  {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                </Button>
                {isUploader && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    aria-label={`Delete ${attachment.fileName}`}
                    disabled={isDeleting}
                    onClick={() => handleDelete(attachment)}
                  >
                    {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                )}
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
    </div>
  );
}
