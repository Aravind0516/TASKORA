import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_9%,transparent),transparent)]" />
      <div className="tone-indigo taskora-tone-tile relative flex size-12 items-center justify-center rounded-2xl text-white">
        <Icon className="size-5" />
      </div>
      <p className="relative mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="relative mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="relative mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
