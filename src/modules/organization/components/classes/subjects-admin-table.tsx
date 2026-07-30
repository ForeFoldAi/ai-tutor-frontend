import { Eye, Pencil, Trash2 } from "lucide-react";
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
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { subjectTaggedPlacements } from "@/modules/organization/utils/classes-subject-helpers";

interface SubjectsAdminTableProps {
  subjects: SubjectItem[];
  classes: ClassOverviewItem[];
  subjectMappings: Record<string, Record<string, boolean>>;
  onEdit: (subject: SubjectItem) => void;
  onDelete: (subject: SubjectItem) => void;
}

const headClass =
  "h-9 px-2 text-xs font-semibold text-foreground sm:h-12 sm:px-4 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:p-4 sm:text-sm";

function PlacementBadges({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className="border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-normal text-sky-700 sm:px-2.5 sm:py-0.5 sm:text-xs"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function SubjectsAdminTable({
  subjects,
  classes,
  subjectMappings,
  onEdit,
  onDelete,
}: SubjectsAdminTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[480px] text-xs sm:min-w-[560px] sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Subject ID</TableHead>
            <TableHead className={headClass}>Subject Name</TableHead>
            <TableHead className={headClass}>Code</TableHead>
            <TableHead className={headClass}>Tagged Classes</TableHead>
            <TableHead className={headClass}>Sections</TableHead>
            <TableHead className={`${headClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className={`${cellClass} py-8 text-center text-muted-foreground`}>
                No subjects yet. Use &quot;Add Subject&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            subjects.map((subject) => {
              const { grades, sections } = subjectTaggedPlacements(subject.id, classes, subjectMappings);
              return (
                <TableRow key={subject.id}>
                  <TableCell className={`${cellClass} font-medium text-muted-foreground`}>
                    {subject.id}
                  </TableCell>
                  <TableCell className={`${cellClass} font-semibold text-blue-900 dark:text-blue-100`}>
                    {subject.name}
                  </TableCell>
                  <TableCell className={`${cellClass} text-muted-foreground`}>{subject.code}</TableCell>
                  <TableCell className={cellClass}>
                    <PlacementBadges items={grades.map((g) => `Grade ${g}`)} emptyLabel="—" />
                  </TableCell>
                  <TableCell className={cellClass}>
                    <PlacementBadges items={sections} emptyLabel="—" />
                  </TableCell>
                  <TableCell className={`${cellClass} text-right`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          aria-label={`View ${subject.name}`}
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => onEdit(subject)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            // ponytail: open confirm after menu closes (Radix focus trap)
                            window.setTimeout(() => onDelete(subject), 0);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
