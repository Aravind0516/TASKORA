"use client";

import { useRef, useState } from "react";
import { AlertCircle, Download, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as attachmentService from "@/lib/services/attachment.service";
import * as projectRequirementService from "@/lib/services/project-requirement.service";
import { validateAttachmentFile, REQUIREMENT_DOCUMENT_TYPES, REQUIREMENT_DOCUMENT_INPUT_ACCEPT } from "@/lib/validation/attachment";
import { formatFileSize, formatDate } from "@/lib/format";
import type { Project } from "@/types/project";

interface ProjectRequirementSectionProps {
  project: Project;
  organizationId: string;
  currentUserId: string;
  /** Org Admin, Super Admin, or this project's own assigned manager — mirrors project-detail-view.tsx's existing canManageProject exactly. Employees/interns always see this as view/download-only, never upload/replace, regardless of assignment. */
  canManage: boolean;
  getUploaderName: (uid: string) => string | undefined;
}

/**
 * A project's ONE official requirement document — distinct from the
 * generic, multi-file Attachments list below it in the same tab (see
 * project-detail-view.tsx's "files" tab): reuses the exact same Storage
 * bucket and download mechanism, but is embedded directly on the project
 * document (types/project.ts's `requirementDocument`) and gated to
 * Admin/authorized-manager for upload/replace — never "any project member,"
 * which is the generic attachment system's own, deliberately looser rule.
 */
export function ProjectRequirementSection({
  project,
  organizationId,
  currentUserId,
  canManage,
  getUploaderName,
}: ProjectRequirementSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requirementDoc = project.requirementDocument;

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;

    const validation = validateAttachmentFile(file, REQUIREMENT_DOCUMENT_TYPES);
    if (!validation.ok) {
      setError(validation.error ?? "That file can't be uploaded.");
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      // No local state update needed — project comes from a live
      // onSnapshot listener (useWorkspace()), so the Firestore write below
      // flows back through props automatically, same as every other field
      // on this page.
      await projectRequirementService.uploadProjectRequirementDocument(
        { organizationId, projectId: project.id, uploadedBy: currentUserId, file, existing: requirementDoc },
        setUploadProgress
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload requirement document.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDownload() {
    if (!requirementDoc) return;
    setError(null);
    setDownloading(true);
    try {
      const blobUrl = await attachmentService.downloadAttachmentBlob(requirementDoc.storagePath);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = requirementDoc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download requirement document.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mb-5 space-y-2.5 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Project Requirement Document</p>
        {canManage && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? `Uploading… ${uploadProgress}%` : requirementDoc ? "Replace document" : "Upload Requirement Document"}
          </Button>
        )}
        <input ref={fileInputRef} type="file" className="hidden" accept={REQUIREMENT_DOCUMENT_INPUT_ACCEPT} onChange={handleFileSelected} />
      </div>

      {!canManage && !requirementDoc && <p className="text-xs text-muted-foreground">Accepted: PDF, DOC, DOCX</p>}

      {uploading && <Progress value={uploadProgress} />}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requirementDoc ? (
        <div className="flex items-center gap-2.5 rounded-md bg-surface-muted px-3 py-2.5">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{requirementDoc.fileName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatFileSize(requirementDoc.size)} · Uploaded by {getUploaderName(requirementDoc.uploadedBy) ?? "Unknown"} · {formatDate(requirementDoc.uploadedAt)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Download requirement document" disabled={downloading} onClick={handleDownload}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No requirement document uploaded yet.</p>
      )}
    </div>
  );
}
