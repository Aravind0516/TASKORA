"use client";

import { useState } from "react";
import { AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as attachmentService from "@/lib/services/attachment.service";
import { formatFileSize, formatDate } from "@/lib/format";
import type { Project } from "@/types/project";

interface ProjectRequirementSectionProps {
  project: Project;
  getUploaderName: (uid: string) => string | undefined;
}

/**
 * Read-only display of a project's official requirement DOCUMENT
 * (types/project.ts's `requirementDocument` — the PDF/DOC/DOCX that predates
 * the plain-text Project Requirements field). The upload/replace control was
 * deliberately removed: the current workflow uses ProjectRequirementsTextSection
 * (plain text, no Firebase Storage dependency) as the intended way to write
 * requirements going forward. Existing uploaded documents are NOT deleted —
 * this still shows and lets anyone authorized for the project download
 * whatever was already uploaded; there is simply no way to upload a new one
 * or replace an existing one anymore. Renders nothing at all when no
 * document was ever uploaded, rather than an empty card with no action.
 */
export function ProjectRequirementSection({ project, getUploaderName }: ProjectRequirementSectionProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirementDoc = project.requirementDocument;
  if (!requirementDoc) return null;

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
      <p className="text-sm font-semibold text-foreground">Project Requirement Document</p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
    </div>
  );
}
