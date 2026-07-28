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
  onOpen?: (plan: SavedLessonPlan) => void;
  onDuplicate?: (plan: SavedLessonPlan) => void;
}

export function SavedLessonPlansTable({ plans, onOpen, onDuplicate }: SavedLessonPlansTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return plans.slice(start, start + pageSize);
  }, [plans, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="shrink-0 border-b border-border/70 px-3 py-3">
        <h2 className="text-base font-bold text-blue-900 dark:text-blue-100 sm:text-lg">
          Saved Lesson Plans ({plans.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[720px] text-xs sm:min-w-[860px] sm:text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Title
              </TableHead>
              <TableHead className="h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Subject
              </TableHead>
              <TableHead className="h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Grade
              </TableHead>
              <TableHead className="h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Chapter
              </TableHead>
              <TableHead className="h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Last Updated
              </TableHead>
              <TableHead className="h-9 px-2 text-right text-xs font-semibold text-foreground sm:px-3 sm:text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="whitespace-nowrap px-2 py-2 text-xs font-medium text-foreground sm:px-3 sm:text-sm">
                  {plan.title}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:text-sm">
                  {plan.subject}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:text-sm">
                  {plan.grade}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:text-sm">
                  {plan.chapter}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground sm:px-3 sm:text-sm">
                  {plan.lastUpdated}
                </TableCell>
                <TableCell className="px-2 py-2 text-right sm:px-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => onOpen?.(plan)}
                      aria-label={`Open ${plan.title}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => onDuplicate?.(plan)}
                      aria-label={`Duplicate ${plan.title}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                      aria-label={`Use ${plan.title} in session`}
                    >
                      <MonitorPlay className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border/70 px-3 py-3">
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
    </div>
  );
}
