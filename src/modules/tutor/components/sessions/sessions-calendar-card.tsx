import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import { toLocalDayDate } from "@/modules/tutor/utils/session-data";

interface SessionsCalendarCardProps {
  selected: Date;
  sessions: SessionDisplayItem[];
  onSelect: (date: Date | undefined) => void;
}

export function SessionsCalendarCard({ selected, sessions, onSelect }: SessionsCalendarCardProps) {
  const scheduledDates = sessions
    .map((session) => toLocalDayDate(session.startsAt))
    .filter((d): d is Date => d != null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">Schedule</CardTitle>
        <p className="text-xs text-muted-foreground">Select a date to view its sessions</p>
      </CardHeader>
      <CardContent className="flex justify-center py-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          modifiers={{ scheduled: scheduledDates }}
          modifiersClassNames={{
            scheduled:
              "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-blue-500",
          }}
          classNames={{
            // Perfect circle for selected/today — drop cell range bg that squashes the day button.
            cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
            day: "inline-flex h-9 w-9 items-center justify-center rounded-full p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-selected:opacity-100",
            day_selected:
              "rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "rounded-full bg-accent text-accent-foreground aria-selected:bg-primary aria-selected:text-primary-foreground",
          }}
          className="rounded-md border-0 p-0"
        />
      </CardContent>
      <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        Dates with scheduled sessions
      </div>
    </Card>
  );
}
