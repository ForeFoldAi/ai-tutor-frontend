import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Visible in light mode; wide enough for 3-digit page sizes (e.g. 500). */
const PAGE_SIZE_TRIGGER =
  "h-7 min-w-[4.75rem] w-auto gap-1 px-2 !border !border-slate-300 bg-background text-sm tabular-nums hover:!border-slate-400 sm:h-8 dark:!border-slate-600 dark:hover:!border-slate-500";

interface TeachersPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function pageNumbers(current: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages] as const;
  if (current >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages] as const;
}

export function TeachersPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 40, 50, 100, 200, 500],
}: TeachersPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-between">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Showing {start} to {end} of {total} teachers
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start sm:text-sm">
        <span className="hidden sm:inline">Rows per page:</span>
        <span className="sm:hidden">Rows:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className={PAGE_SIZE_TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="!border !border-slate-300 dark:!border-slate-600">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
