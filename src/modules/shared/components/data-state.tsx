import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MSG, studentFriendlyError } from "@/lib/student-messages";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry?: () => void;
  /** Optional custom skeleton; defaults to a table/list placeholder. */
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}

function DefaultListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-3"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3 max-w-[12rem]" />
              <Skeleton className="h-3 w-1/2 max-w-[16rem]" />
            </div>
            <Skeleton className="hidden h-8 w-20 rounded-md sm:block" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function DataState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  skeleton,
  children,
}: DataStateProps) {
  if (loading) {
    return <>{skeleton ?? <DefaultListSkeleton />}</>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {studentFriendlyError(error, MSG.server)}
        </p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {MSG.tryAgain}
          </Button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return <>{children}</>;
}
