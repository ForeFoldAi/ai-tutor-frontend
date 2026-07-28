import { CalendarDays, Clock3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import { formatSessionTimeRange } from "@/modules/tutor/utils/session-helpers";
import { SessionRowActions } from "@/modules/tutor/components/sessions/session-row-actions";

interface TodaysSessionsCardProps {
  sessions: SessionDisplayItem[];
  title?: string;
  subtitle?: string;
  className?: string;
  onEdit?: (session: SessionDisplayItem) => void;
  onDelete?: (session: SessionDisplayItem) => void;
  actionsDisabled?: boolean;
}

export function TodaysSessionsCard({
  sessions,
  title = "Today's Sessions",
  subtitle,
  className,
  onEdit,
  onDelete,
  actionsDisabled,
}: TodaysSessionsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              {title}
            </CardTitle>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {sessions.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-8 text-center">
            <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No sessions scheduled</p>
            <p className="mt-1 text-xs text-muted-foreground">This date is free.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatSessionTimeRange(session.startsAt, session.durationMinutes)}
                      {" · "}
                      {session.durationMinutes} min
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">
                    {session.title || "Untitled session"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[session.subject, session.chapter].filter(Boolean).join(" · ") || "No subject"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grade {session.grade || "—"} · Section {session.section || "—"}
                    {session.curriculum ? ` · ${session.curriculum}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {onEdit && onDelete ? (
                    <SessionRowActions
                      disabled={actionsDisabled}
                      onEdit={() => onEdit(session)}
                      onDelete={() => onDelete(session)}
                    />
                  ) : null}
                  {session.meetingLink ? (
                    <Button size="sm" className="h-8 gap-1.5 px-3" asChild>
                      <a href={session.meetingLink} target="_blank" rel="noreferrer">
                        Join <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
