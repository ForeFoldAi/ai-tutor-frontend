import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import { formatSessionTime } from "@/modules/tutor/utils/session-helpers";

interface TodaysSessionsCardProps {
  sessions: SessionDisplayItem[];
}

const STATUS_STYLES = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  upcoming: "border-sky-200 bg-sky-50 text-sky-700",
  scheduled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-muted bg-muted/50 text-muted-foreground",
};

export function TodaysSessionsCard({ sessions }: TodaysSessionsCardProps) {
  return (
    <Card className="h-full border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Today&apos;s Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {formatSessionTime(session.startsAt)}
              </p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{session.title}</p>
              <p className="text-xs text-muted-foreground">
                Grade {session.grade} · {session.studentCount} Students
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className={STATUS_STYLES[session.status]}>
                {session.status === "live" ? "Live" : "Upcoming"}
              </Badge>
              <Button size="sm" className="h-8 bg-primary px-4">
                Join
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
