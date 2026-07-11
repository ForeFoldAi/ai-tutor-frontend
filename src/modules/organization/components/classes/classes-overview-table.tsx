import { BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export function ClassesOverviewTable({ classes, onMapSubjects }: ClassesOverviewTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">Class</TableHead>
            <TableHead className="font-semibold text-foreground">Section</TableHead>
            <TableHead className="font-semibold text-foreground">Curriculum</TableHead>
            <TableHead className="text-center font-semibold text-foreground">Teachers</TableHead>
            <TableHead className="text-center font-semibold text-foreground">Students</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No classes yet. Use &quot;Add Class&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            classes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                  Grade {item.grade}
                </TableCell>
                <TableCell>{item.section}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {item.curriculums.map((curriculum) => (
                      <Badge key={curriculum} variant="secondary" className="font-normal">
                        {curriculum}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.teachers}</TableCell>
                <TableCell className="text-center">{item.students}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 !border !border-slate-300 text-primary hover:!border-slate-400"
                    onClick={() => onMapSubjects(item)}
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    Map Subjects
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
