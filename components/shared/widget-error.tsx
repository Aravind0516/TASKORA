import { AlertCircle } from "lucide-react";

interface WidgetErrorProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * A compact, in-place fallback for a single dashboard widget that failed to
 * load — used instead of ErrorState (which takes over the whole page) so one
 * non-critical widget failing doesn't block the rest of the dashboard.
 */
export function WidgetError({ message = "This couldn't be loaded.", onRetry }: WidgetErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <AlertCircle className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-xs font-medium text-primary hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
