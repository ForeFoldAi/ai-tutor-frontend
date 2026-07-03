import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-fit min-h-0 flex-1 overflow-x-hidden p-4 md:p-5 lg:p-4">
      {children}
    </div>
  );
}

function HeaderSkeleton({ withIcon = false }: { withIcon?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-3">
      <div className="flex min-w-0 items-center gap-3">
        {withIcon && <Skeleton className="h-12 w-12 shrink-0 rounded-xl sm:h-14 sm:w-14" />}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:h-8 sm:w-56" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-9 w-full rounded-md sm:w-32" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-3 p-4 lg:p-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:mb-3 lg:gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-5 lg:gap-3">
        <div className="grid gap-3 lg:col-span-3">
          <Card className="shadow-card">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="grid gap-4 md:grid-cols-[11.5rem_1fr]">
                <Skeleton className="aspect-square w-full max-w-[11.5rem] rounded-2xl" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-10 w-full rounded-xl sm:w-44" />
                </div>
              </div>
              <div className="space-y-3 border-t border-border/60 pt-4">
                <Skeleton className="h-5 w-28" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-20 w-full rounded-card" />
        </div>
        <div className="grid gap-3 lg:col-span-2">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-36 w-28 rounded-xl" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="mb-2 h-5 w-28" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function MyLearningSkeleton() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <HeaderSkeleton />
      <Card className="mb-3 shrink-0 shadow-card">
        <CardContent className="grid grid-cols-2 gap-3 p-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        <Card className="flex min-h-0 flex-1 flex-col shadow-card lg:col-span-2">
          <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-3 sm:p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AiTutorStudioSkeleton() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <HeaderSkeleton />
      <Card className="overflow-hidden shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <Skeleton className="h-36 w-full sm:h-40 sm:w-52" />
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div>
        <Skeleton className="mb-1 h-5 w-48" />
        <Skeleton className="mb-3 h-4 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-card" />
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <HeaderSkeleton />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <Skeleton className="h-56 w-full rounded-card" />
          <Card className="flex min-h-0 flex-1 flex-col shadow-card">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-14 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-3 sm:p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AssignmentsSkeleton() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <HeaderSkeleton />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="flex gap-3 p-3 sm:p-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-3 sm:p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-5 w-20" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
