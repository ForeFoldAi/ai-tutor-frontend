import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CurriculumItem } from "@/modules/organization/types/classes-admin";

export function CurriculumsList({ curriculums }: { curriculums: CurriculumItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {curriculums.map((item) => (
        <Card key={item.id} className="border-border/70 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">{item.name}</h3>
              <Badge variant="outline" className="border-primary/30 text-primary">
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Grades {item.grades}</p>
            <p className="text-sm font-medium">{item.subjectsCount} subjects mapped</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
