import { useMemo, useState } from "react";
import { Copy, Eye, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StudentsPagination } from "@/modules/tutor/components/students/students-pagination";
import type { SavedLessonPlan } from "@/modules/tutor/types/lesson-planner";

interface SavedLessonPlansTableProps {
  plans: SavedLessonPlan[];
}

export function SavedLessonPlansTable({ plans }: SavedLessonPlansTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return plans.slice(start, start + pageSize);
  }, [plans, page, pageSize]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-border/70 bg-card p-2 shadow-sm md:p-3">
      <div className="shrink-0 px-1 pt-1">
        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100">
          Saved Lesson Plans ({plans.length})
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 font-semibold text-foreground">Title</TableHead>
              <TableHead className="h-9 py-2 font-semibold text-foreground">Subject</TableHead>
              <TableHead className="h-9 py-2 font-semibold text-foreground">Grade</TableHead>
              <TableHead className="h-9 py-2 font-semibold text-foreground">Chapter</TableHead>
              <TableHead className="h-9 py-2 font-semibold text-foreground">Last Updated</TableHead>
              <TableHead className="h-9 py-2 text-right font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="py-2 text-sm font-medium text-foreground">{plan.title}</TableCell>
                <TableCell className="py-2 text-sm">{plan.subject}</TableCell>
                <TableCell className="py-2 text-sm">{plan.grade}</TableCell>
                <TableCell className="py-2 text-sm">{plan.chapter}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{plan.lastUpdated}</TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <MonitorPlay className="h-3.5 w-3.5" />
                      Use in Session
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StudentsPagination
        page={page}
        pageSize={pageSize}
        total={plans.length}
        itemLabel="lesson plans"
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
