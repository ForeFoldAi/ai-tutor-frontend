import { Eye, Pencil } from "lucide-react";
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
  onEdit: (teacher: TeacherRow) => void;
}

const STATUS_STYLES = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-red-200 bg-red-50 text-red-600",
};

export function TeachersTable({ teachers, onView, onEdit }: TeachersTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[52px]" />
            <TableHead className="font-semibold text-foreground">Teacher Name</TableHead>
            <TableHead className="hidden font-semibold text-foreground md:table-cell">User ID</TableHead>
            <TableHead className="font-semibold text-foreground">Subjects</TableHead>
            <TableHead className="hidden font-semibold text-foreground sm:table-cell">Grades</TableHead>
            <TableHead className="hidden font-semibold text-foreground lg:table-cell">Assigned Students</TableHead>
            <TableHead className="font-semibold text-foreground">Status</TableHead>
            <TableHead className="hidden font-semibold text-foreground xl:table-cell">Last Login</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={teacher.avatarColor}>
                    {teacherInitials(teacher.fullName)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                {teacher.fullName}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{teacher.userId}</TableCell>
              <TableCell>{teacher.subject}</TableCell>
              <TableCell className="hidden sm:table-cell">{teacher.grades}</TableCell>
              <TableCell className="hidden lg:table-cell">{teacher.assignedStudents}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[teacher.status]}>
                  {teacher.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">{teacher.lastLogin}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => onView(teacher)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => onEdit(teacher)}
                  >
                    <Pencil className="h-4 w-4" />
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
