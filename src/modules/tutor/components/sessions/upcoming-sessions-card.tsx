import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import { formatSessionDateTime } from "@/modules/tutor/utils/session-helpers";

interface UpcomingSessionsCardProps {
  sessions: SessionDisplayItem[];
}

export function UpcomingSessionsCard({ sessions }: UpcomingSessionsCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="px-6 pt-3 pb-2">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Upcoming Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pb-5 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {formatSessionDateTime(session.startsAt)}
              </p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{session.title}</p>
              <p className="text-xs text-muted-foreground">
                Grade {session.grade} · {session.studentCount} Students
              </p>
              <Badge
                variant="outline"
                className="mt-2 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Scheduled
              </Badge>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-primary/30 text-primary hover:bg-primary/5"
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-primary/30 text-primary hover:bg-primary/5"
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
