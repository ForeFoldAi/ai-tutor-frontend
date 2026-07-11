import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_CURRICULUMS } from "@/modules/organization/data/demo-classes-admin";

export function SchoolBoardsCard() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          <BookOpen className="h-5 w-5 text-primary" />
          Boards
        </CardTitle>
        <CardDescription>Curriculums active at your school.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {DEMO_CURRICULUMS.map((board) => (
            <div
              key={board.id}
              className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 sm:max-w-[200px]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{board.name}</p>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Grades {board.grades} · {board.subjectsCount} subjects
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
