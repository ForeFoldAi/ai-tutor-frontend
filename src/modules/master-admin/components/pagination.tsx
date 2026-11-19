import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(pageCount, Math.max(1, page));

  if (pageCount <= 1) return null;

  const siblingCount = 1;
  const start = Math.max(1, clampedPage - siblingCount);
  const end = Math.min(pageCount, clampedPage + siblingCount);

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <div className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{clampedPage}</span> of{" "}
        <span className="font-medium text-foreground">{pageCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
        >
          Prev
        </Button>

        {start > 1 ? (
          <Button variant="ghost" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
        ) : null}

        {clampedPage - siblingCount > 2 ? <span className="px-1 text-muted-foreground">…</span> : null}

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === clampedPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}

        {clampedPage + siblingCount < pageCount - 1 ? (
          <span className="px-1 text-muted-foreground">…</span>
        ) : null}

        {end < pageCount ? (
          <Button variant="ghost" size="sm" onClick={() => onPageChange(pageCount)}>
            {pageCount}
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

