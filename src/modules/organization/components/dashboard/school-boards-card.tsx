import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SchoolBoardsCardProps {
  curricula: string[];
}

export function SchoolBoardsCard({ curricula }: SchoolBoardsCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <div className="flex shrink-0 items-center gap-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          <BookOpen className="h-5 w-5 text-primary" />
          Boards
        </div>
        {curricula.length === 0 ? (
          <p className="text-sm text-muted-foreground">No curricula configured for your school yet.</p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {curricula.map((board) => (
              <div
                key={board}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2"
              >
                <p className="font-semibold text-foreground">{board}</p>
                <Badge
                  variant="outline"
                  className="shrink-0 border-primary/30 bg-primary/5 text-[10px] text-primary"
                >
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
