import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

interface SessionsCalendarCardProps {
  selected: Date;
  onSelect: (date: Date | undefined) => void;
}

export function SessionsCalendarCard({ selected, onSelect }: SessionsCalendarCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center pb-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          className="rounded-md border-0 p-0"
        />
      </CardContent>
    </Card>
  );
}
