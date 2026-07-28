import { BookMarked, Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassOverviewItem } from "@/modules/organization/types/classes-admin";

interface ClassesOverviewTableProps {
  classes: ClassOverviewItem[];
  onMapSubjects: (item: ClassOverviewItem) => void;
  onEdit: (item: ClassOverviewItem) => void;
  onDelete: (item: ClassOverviewItem) => void;
}

const headClass =
  "h-9 px-2 text-xs font-semibold text-foreground sm:h-12 sm:px-4 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:p-4 sm:text-sm";

export function ClassesOverviewTable({
  classes,
  onMapSubjects,
  onEdit,
  onDelete,
}: ClassesOverviewTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[560px] text-xs sm:min-w-[720px] sm:text-sm lg:min-w-[800px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Class ID</TableHead>
            <TableHead className={headClass}>Class</TableHead>
            <TableHead className={headClass}>Section</TableHead>
            <TableHead className={headClass}>Curriculum</TableHead>
            <TableHead className={`${headClass} text-center`}>Teachers</TableHead>
            <TableHead className={`${headClass} text-center`}>Students</TableHead>
            <TableHead className={headClass}>Map Subjects</TableHead>
            <TableHead className={`${headClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className={`${cellClass} py-8 text-center text-muted-foreground`}>
                No classes yet. Use &quot;Add Class&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            classes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className={`${cellClass} font-mono text-muted-foreground`}>
                  {item.id}
                </TableCell>
                <TableCell className={`${cellClass} font-semibold text-blue-900 dark:text-blue-100`}>
                  Grade {item.grade}
                </TableCell>
                <TableCell className={cellClass}>{item.section}</TableCell>
                <TableCell className={cellClass}>
                  <div className="flex flex-wrap gap-1">
                    {item.curriculums.map((curriculum) => (
                      <Badge
                        key={curriculum}
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px] font-normal sm:px-2.5 sm:py-0.5 sm:text-xs"
                      >
                        {curriculum}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className={`${cellClass} text-center`}>{item.teachers}</TableCell>
                <TableCell className={`${cellClass} text-center`}>{item.students}</TableCell>
                <TableCell className={cellClass}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs sm:h-8 sm:gap-1.5 sm:px-3"
                    onClick={() => onMapSubjects(item)}
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    <span className="sm:hidden">Map</span>
                    <span className="hidden sm:inline">Map Subjects</span>
                  </Button>
                </TableCell>
                <TableCell className={`${cellClass} text-right`}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        aria-label={`Actions for Grade ${item.grade} Section ${item.section}`}
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          // ponytail: open confirm after menu closes (Radix focus trap)
                          window.setTimeout(() => onDelete(item), 0);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
