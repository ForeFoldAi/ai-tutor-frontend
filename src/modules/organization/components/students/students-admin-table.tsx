import { Eye, UserCog } from "lucide-react";
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
import type { SchoolStudentRow } from "@/modules/organization/types/org-student-profile";

interface StudentsAdminTableProps {
  students: SchoolStudentRow[];
  onView: (student: SchoolStudentRow) => void;
  onManage: (student: SchoolStudentRow) => void;
}

const LEARNING_TYPE_STYLES = {
  "Teacher Guided": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Self Learning": "border-sky-200 bg-sky-50 text-sky-700",
};

const PASSWORD_STYLES = {
  Set: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Not Set": "border-red-200 bg-red-50 text-red-600",
};

export function StudentsAdminTable({ students, onView, onManage }: StudentsAdminTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">Student Name</TableHead>
            <TableHead className="hidden font-semibold text-foreground md:table-cell">User ID</TableHead>
            <TableHead className="font-semibold text-foreground">Grade</TableHead>
            <TableHead className="hidden font-semibold text-foreground sm:table-cell">Section</TableHead>
            <TableHead className="hidden font-semibold text-foreground lg:table-cell">Curriculum</TableHead>
            <TableHead className="font-semibold text-foreground">Learning Type</TableHead>
            <TableHead className="hidden font-semibold text-foreground xl:table-cell">Learning Teacher</TableHead>
            <TableHead className="hidden font-semibold text-foreground lg:table-cell">Password Status</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                {student.fullName}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{student.userId}</TableCell>
              <TableCell>{student.grade}</TableCell>
              <TableCell className="hidden sm:table-cell">{student.section}</TableCell>
              <TableCell className="hidden lg:table-cell">{student.curriculum}</TableCell>
              <TableCell>
                <Badge variant="outline" className={LEARNING_TYPE_STYLES[student.learningType]}>
                  {student.learningType}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {student.learningTeacher ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline" className={PASSWORD_STYLES[student.passwordStatus]}>
                  {student.passwordStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => onView(student)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => onManage(student)}
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
