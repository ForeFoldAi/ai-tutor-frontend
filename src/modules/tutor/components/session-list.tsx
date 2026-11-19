import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TutorSession } from "@/modules/tutor/types";

interface SessionListProps {
  sessions: TutorSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming Sessions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{session.title}</p>
              <p className="text-xs text-muted-foreground">
                {session.subject} · Grade {session.grade} · Section {session.section}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(session.startsAt).toLocaleString()} · {session.durationMinutes} min
              </p>
            </div>
            <Badge variant="outline">Scheduled</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
