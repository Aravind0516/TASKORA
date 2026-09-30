import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="taskora-fade-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <span aria-hidden className="taskora-brand-gradient mb-3 block h-1 w-10 rounded-full" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
