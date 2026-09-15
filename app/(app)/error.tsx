"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[#d03b3b]/10 text-[#d03b3b]">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This section couldn&apos;t be displayed. You can try again, or head back to the Overview.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <Button size="sm" nativeButton={false} render={<a href="/overview" />}>
          Back to Overview
        </Button>
      </div>
    </div>
  );
}
