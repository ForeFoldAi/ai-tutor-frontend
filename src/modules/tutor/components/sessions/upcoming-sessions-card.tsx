import { CalendarClock, Clock3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import {
  formatSessionDate,
  formatSessionTimeRange,
} from "@/modules/tutor/utils/session-helpers";
import { SessionRowActions } from "@/modules/tutor/components/sessions/session-row-actions";

interface UpcomingSessionsCardProps {
  sessions: SessionDisplayItem[];
  onEdit?: (session: SessionDisplayItem) => void;
  onDelete?: (session: SessionDisplayItem) => void;
  actionsDisabled?: boolean;
}

export function UpcomingSessionsCard({
  sessions,
  onEdit,
  onDelete,
  actionsDisabled,
}: UpcomingSessionsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              Upcoming Sessions
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Your next scheduled classes
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
            {sessions.length} scheduled
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {sessions.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
            <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No upcoming sessions</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New sessions will appear here after scheduling.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group rounded-xl border border-border/70 bg-background p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                      Scheduled
                    </span>
                    {onEdit && onDelete ? (
                      <SessionRowActions
                        disabled={actionsDisabled}
                        onEdit={() => onEdit(session)}
                        onDelete={() => onDelete(session)}
                      />
                    ) : null}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{session.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.subject} · {session.chapter}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatSessionDate(session.startsAt)}
                  {" · "}
                  {formatSessionTimeRange(session.startsAt, session.durationMinutes)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Grade {session.grade} · Section {session.section}
                  {session.curriculum ? ` · ${session.curriculum}` : ""}
                </p>
                {session.meetingLink ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 h-8 w-full gap-1.5 border-primary/30 text-primary"
                    asChild
                  >
                    <a href={session.meetingLink} target="_blank" rel="noreferrer">
                      Open meeting link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
