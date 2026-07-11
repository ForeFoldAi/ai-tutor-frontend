import { Badge } from "@/components/ui/badge";
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
}

function PlacementBadges({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="border-sky-200 bg-sky-50 font-normal text-sky-700">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function SubjectsAdminTable({ subjects, classes, subjectMappings }: SubjectsAdminTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">Subject Name</TableHead>
            <TableHead className="font-semibold text-foreground">Code</TableHead>
            <TableHead className="font-semibold text-foreground">Tagged Classes</TableHead>
            <TableHead className="font-semibold text-foreground">Sections</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                No subjects yet. Use &quot;Add Subject&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            subjects.map((subject) => {
              const { grades, sections } = subjectTaggedPlacements(subject.id, classes, subjectMappings);
              return (
                <TableRow key={subject.id}>
                  <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                    {subject.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{subject.code}</TableCell>
                  <TableCell>
                    <PlacementBadges items={grades.map((g) => `Grade ${g}`)} emptyLabel="—" />
                  </TableCell>
                  <TableCell>
                    <PlacementBadges items={sections} emptyLabel="—" />
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
