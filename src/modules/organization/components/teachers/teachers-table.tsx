import { Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { TeacherRow } from "@/modules/organization/types/teacher-profile";
import { teacherInitials } from "@/modules/organization/utils/teacher-helpers";

interface TeachersTableProps {
  teachers: TeacherRow[];
  onView: (teacher: TeacherRow) => void;
}

const STATUS_STYLES = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-red-200 bg-red-50 text-red-600",
};

const headClass = "h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:px-3 sm:text-sm";

function GradeSubjectsCell({ teacher }: { teacher: TeacherRow }) {
  const rows =
    teacher.assignments.length > 0
      ? teacher.assignments
      : [{ grade: teacher.grades || "—", subjects: teacher.subject || "—" }];

  return (
    <div className="min-w-[12rem] space-y-1.5">
      {rows.map((row, i) => (
        <div
          key={`${teacher.id}-${row.grade}-${i}`}
          className="grid grid-cols-[minmax(7rem,1fr)_minmax(6rem,1.2fr)] gap-x-3 gap-y-0.5"
        >
          <span className="whitespace-nowrap text-foreground">{row.grade}</span>
          <span className="min-w-0 break-words text-muted-foreground">{row.subjects}</span>
        </div>
      ))}
    </div>
  );
}

export function TeachersTable({ teachers, onView }: TeachersTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[820px] text-xs sm:min-w-[900px] sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${headClass} w-[44px]`} />
            <TableHead className={headClass}>Teacher Name</TableHead>
            <TableHead className={`${headClass} text-left`}>User ID</TableHead>
            <TableHead className={headClass}>
              <div className="grid grid-cols-[minmax(7rem,1fr)_minmax(6rem,1.2fr)] gap-x-3">
                <span>Grade</span>
                <span>Subjects</span>
              </div>
            </TableHead>
            <TableHead className={headClass}>Assigned Students</TableHead>
            <TableHead className={headClass}>Status</TableHead>
            <TableHead className={`${headClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell className={`${cellClass} align-middle`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-xs ${teacher.avatarColor}`}>
                    {teacherInitials(teacher.fullName)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className={`${cellClass} align-middle whitespace-nowrap font-semibold text-blue-900 dark:text-blue-100`}>
                {teacher.fullName}
              </TableCell>
              <TableCell className={`${cellClass} align-middle text-left whitespace-nowrap text-muted-foreground`}>
                {teacher.userId}
              </TableCell>
              <TableCell className={`${cellClass} align-middle`}>
                <GradeSubjectsCell teacher={teacher} />
              </TableCell>
              <TableCell className={`${cellClass} align-middle whitespace-nowrap`}>{teacher.assignedStudents}</TableCell>
              <TableCell className={`${cellClass} align-middle`}>
                <Badge variant="outline" className={`px-2 py-0 text-xs ${STATUS_STYLES[teacher.status]}`}>
                  {teacher.status}
                </Badge>
              </TableCell>
              <TableCell className={`${cellClass} align-middle`}>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    aria-label={`View ${teacher.fullName}`}
                    onClick={() => onView(teacher)}
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
