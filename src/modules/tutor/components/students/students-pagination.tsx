import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function StudentsPagination({
  page,
  pageSize,
  total,
  itemLabel = "students",
  onPageChange,
  onPageSizeChange,
}: StudentsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-between">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Showing {start} to {end} of {total} {itemLabel}
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
        {pages.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === page ? "default" : "outline"}
            size="icon"
            className="h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm"
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
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
          <SelectTrigger className="h-7 min-w-[4.75rem] w-auto gap-1 px-2 !border !border-slate-300 bg-background text-sm tabular-nums hover:!border-slate-400 sm:h-8 dark:!border-slate-600 dark:hover:!border-slate-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="!border !border-slate-300 dark:!border-slate-600">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="40">40</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
