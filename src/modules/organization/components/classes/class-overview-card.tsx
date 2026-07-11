import { Link } from "wouter";
import { School } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClassOverviewItem } from "@/modules/organization/types/classes-admin";

export function ClassOverviewCard({ item }: { item: ClassOverviewItem }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${item.iconClassName}`}>
            <School className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
            Grade {item.grade} - {item.section}
          </h3>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{item.students}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{item.teachers}</p>
            <p className="text-xs text-muted-foreground">Teachers</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Curriculum</p>
          <div className="flex flex-wrap gap-1.5">
            {item.curriculums.map((curriculum) => (
              <Badge key={curriculum} variant="secondary" className="font-normal">
                {curriculum}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 border-primary/30 text-primary">
            <Link href="/students">Manage Students</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 border-primary/30 text-primary">
            <Link href="/teachers">Assign Teacher</Link>
          </Button>
        </div>

        <Button asChild variant="outline" className="w-full border-primary/30 text-primary">
          <Link href="/teachers">Assign Teacher</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
