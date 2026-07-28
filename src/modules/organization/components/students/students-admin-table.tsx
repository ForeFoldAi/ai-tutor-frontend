import { Eye } from "lucide-react";
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
import type {
  PasswordStatus,
  SchoolStudentRow,
  StudentActiveStatus,
} from "@/modules/organization/types/org-student-profile";

interface StudentsAdminTableProps {
  students: SchoolStudentRow[];
  onView: (student: SchoolStudentRow) => void;
}

const LEARNING_TYPE_STYLES = {
  "Teacher Guided": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Self Learning": "border-sky-200 bg-sky-50 text-sky-700",
};

const PASSWORD_STYLES: Record<PasswordStatus, string> = {
  "Not Set": "border-red-200 bg-red-50 text-red-600",
  Generated: "border-amber-200 bg-amber-50 text-amber-700",
  "Logged In": "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const STATUS_STYLES: Record<StudentActiveStatus, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-red-200 bg-red-50 text-red-600",
};

const headClass = "h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:px-3 sm:text-sm";

export function StudentsAdminTable({ students, onView }: StudentsAdminTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px] text-xs sm:min-w-[1100px] sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Student Name</TableHead>
            <TableHead className={headClass}>User ID</TableHead>
            <TableHead className={headClass}>Grade</TableHead>
            <TableHead className={headClass}>Section</TableHead>
            <TableHead className={headClass}>Curriculum</TableHead>
            <TableHead className={headClass}>Learning Type</TableHead>
            <TableHead className={headClass}>Learning Teacher</TableHead>
            <TableHead className={headClass}>Password Status</TableHead>
            <TableHead className={headClass}>Status</TableHead>
            <TableHead className={`${headClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className={`${cellClass} whitespace-nowrap font-semibold text-blue-900 dark:text-blue-100`}>
                {student.fullName}
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap text-muted-foreground`}>
                {student.userId}
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap`}>{student.grade}</TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap`}>{student.section}</TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap`}>{student.curriculum}</TableCell>
              <TableCell className={cellClass}>
                <Badge variant="outline" className={`px-2 py-0 text-xs ${LEARNING_TYPE_STYLES[student.learningType]}`}>
                  {student.learningType}
                </Badge>
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap text-muted-foreground`}>
                {student.learningTeacher ?? "—"}
              </TableCell>
              <TableCell className={cellClass}>
                <Badge variant="outline" className={`px-2 py-0 text-xs ${PASSWORD_STYLES[student.passwordStatus]}`}>
                  {student.passwordStatus}
                </Badge>
              </TableCell>
              <TableCell className={cellClass}>
                <Badge variant="outline" className={`px-2 py-0 text-xs ${STATUS_STYLES[student.status]}`}>
                  {student.status}
                </Badge>
              </TableCell>
              <TableCell className={cellClass}>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    aria-label={`View ${student.fullName}`}
                    onClick={() => onView(student)}
                  >
                    <Eye className="h-4 w-4" />
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
