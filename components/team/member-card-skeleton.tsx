import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
