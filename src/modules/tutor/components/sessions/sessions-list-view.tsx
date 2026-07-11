import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import { formatSessionDateTime } from "@/modules/tutor/utils/session-helpers";

interface SessionsListViewProps {
  sessions: SessionDisplayItem[];
}

const STATUS_STYLES = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  upcoming: "border-sky-200 bg-sky-50 text-sky-700",
  scheduled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-muted bg-muted/50 text-muted-foreground",
};

const STATUS_LABELS = {
  live: "Live",
  upcoming: "Upcoming",
  scheduled: "Scheduled",
  completed: "Completed",
};

export function SessionsListView({ sessions }: SessionsListViewProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          All Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-5">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date & Time</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatSessionDateTime(session.startsAt)}
                </TableCell>
                <TableCell className="font-medium">{session.title}</TableCell>
                <TableCell>Grade {session.grade}</TableCell>
                <TableCell>{session.studentCount}</TableCell>
                <TableCell>{session.durationMinutes} min</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLES[session.status]}>
                    {STATUS_LABELS[session.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    {session.status === "live" || session.status === "upcoming" ? (
                      <Button size="sm" className="h-8 bg-primary px-3">
                        Join
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-primary/30 text-primary"
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-primary/30 text-primary"
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
