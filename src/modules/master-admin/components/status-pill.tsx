import { Badge } from "@/components/ui/badge";
import type { EmbeddingPipelineStep, OrgStatus, RecordStatus, UserStatus } from "../data/demo-master-admin";

export function StatusPill({
  status,
}: {
  status: OrgStatus | UserStatus | RecordStatus | EmbeddingPipelineStep;
}) {
  const lower = String(status).toLowerCase();

  const variant: "default" | "secondary" | "outline" | "destructive" = (() => {
    if (lower.includes("active") || lower.includes("embedded") || lower.includes("uploaded") || lower.includes("chunked"))
      return "default";
    if (lower.includes("processing") || lower.includes("queued")) return "secondary";
    if (lower.includes("failed") || lower.includes("suspended")) return "destructive";
    if (lower.includes("pending") || lower.includes("invited")) return "outline";
    return "secondary";
  })();

  return (
    <Badge
      variant={variant}
      className={
        variant === "default"
          ? "bg-primary text-primary-foreground"
          : variant === "destructive"
            ? "bg-destructive text-destructive-foreground"
            : variant === "outline"
              ? "border border-border/60"
              : undefined
      }
    >
      {status}
    </Badge>
  );
}

