export const metadata = { title: "Page not found" };

export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-4 text-center text-foreground">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <a href="/overview" className="mt-3 text-sm font-medium text-primary hover:underline">
        Back to TASKORA
      </a>
    </div>
  );
}
