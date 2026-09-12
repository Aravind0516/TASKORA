import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-foreground">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button render={<Link href="/overview" />} size="sm" className="mt-5">
        Back to Overview
      </Button>
    </div>
  );
}
