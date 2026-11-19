import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  loading,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "good" && "text-emerald-600 dark:text-emerald-400",
              tone === "warn" && "text-amber-600 dark:text-amber-400",
              tone === "bad" && "text-destructive",
            )}
          >
            {value}
          </div>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">Failed to load</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry ? (
        <button type="button" className="mt-2 text-sm underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatMs(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)} ms`;
}

export function statusTone(status: string | undefined): "default" | "good" | "warn" | "bad" {
  const s = (status || "").toLowerCase();
  if (["healthy", "ok", "resolved", "success"].includes(s)) return "good";
  if (["degraded", "warning", "acknowledged", "investigating"].includes(s)) return "warn";
  if (["down", "critical", "error", "firing", "open", "reopened"].includes(s)) return "bad";
  return "default";
}
