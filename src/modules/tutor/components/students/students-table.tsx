import { Link } from "wouter";
import { Eye, User } from "lucide-react";
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
import type { TutorStudentRow } from "@/modules/tutor/types/student-profile";
import { completionBarClass, riskBadgeClass } from "@/modules/tutor/utils/student-helpers";

interface StudentsTableProps {
  students: TutorStudentRow[];
}

const headClass = "h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:px-3 sm:text-sm";

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[720px] text-xs sm:min-w-[900px] sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Student Name</TableHead>
            <TableHead className={headClass}>Grade</TableHead>
            <TableHead className={headClass}>All Subjects</TableHead>
            <TableHead className={headClass}>Completion</TableHead>
            <TableHead className={headClass}>Risk Level</TableHead>
            <TableHead className={headClass}>Last Active</TableHead>
            <TableHead className={`${headClass} text-right`}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className={cellClass}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-600">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="whitespace-nowrap font-medium text-foreground">{student.fullName}</span>
                </div>
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap`}>{student.gradeLabel}</TableCell>
              <TableCell className={`${cellClass} max-w-[12rem] whitespace-nowrap font-medium text-foreground`}>
                {student.subject}
              </TableCell>
              <TableCell className={`${cellClass} min-w-[100px]`}>
                <div className="space-y-1">
                  <span className="text-xs font-medium">{student.completion}%</span>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${completionBarClass(student.completion)}`}
                      style={{ width: `${student.completion}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className={cellClass}>
                <Badge variant="outline" className={`px-2 py-0 text-xs ${riskBadgeClass(student.riskLevel)}`}>
                  {student.riskLevel}
                </Badge>
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap text-muted-foreground`}>
                {student.lastActive}
              </TableCell>
              <TableCell className={`${cellClass} text-right`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <Link href={`/tutor/students/${student.id}`} aria-label={`View ${student.fullName}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
