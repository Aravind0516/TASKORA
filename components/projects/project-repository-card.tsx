import { ExternalLink, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isValidRepositoryUrl } from "@/lib/projects/assignment";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

/** "https://github.com/org/repo/" -> "github.com/org/repo" — the readable part of the link. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * The project's code repository, shown to everyone who can open the project
 * (members, its manager, admins) — the project page itself is already gated
 * by firestore.rules' project read rule, so this card needs no permission
 * logic of its own and never exposes a link to anyone who can't see the
 * project. Only a well-formed http(s) URL is ever rendered as a link.
 */
export function ProjectRepositoryCard({ project, canEdit, className }: { project: Pick<Project, "repositoryUrl" | "repositoryProvider">; canEdit: boolean; className?: string }) {
  const url = project.repositoryUrl?.trim() ?? "";
  const linkable = isValidRepositoryUrl(url);
  const providerLabel = project.repositoryProvider === "GITHUB" ? "GitHub Repository" : "Repository";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Repository</CardTitle>
        <CardDescription>Where this project&apos;s code lives</CardDescription>
      </CardHeader>
      <CardContent>
        {url ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3.5 sm:flex-row sm:items-center">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
              <GitBranch className="size-4 text-foreground" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{providerLabel}</p>
              <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{displayUrl(url)}</p>
            </div>
            {linkable && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors",
                  "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                )}
              >
                Open repository
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No repository linked yet.{canEdit ? " Add one from Edit project." : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
