import { Link } from "wouter";
import { User } from "lucide-react";
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

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 py-2 font-semibold text-foreground">Student Name</TableHead>
            <TableHead className="h-9 py-2 font-semibold text-foreground">Grade</TableHead>
            <TableHead className="h-9 py-2 font-semibold text-foreground">Subject</TableHead>
            <TableHead className="h-9 py-2 font-semibold text-foreground">Completion</TableHead>
            <TableHead className="h-9 py-2 font-semibold text-foreground">Risk Level</TableHead>
            <TableHead className="h-9 py-2 font-semibold text-foreground">Last Active</TableHead>
            <TableHead className="h-9 py-2 text-right font-semibold text-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-600">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{student.fullName}</span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-sm">{student.grade}</TableCell>
              <TableCell className="py-2 text-sm font-medium text-foreground">{student.subject}</TableCell>
              <TableCell className="min-w-[100px] py-2">
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
              <TableCell className="py-2">
                <Badge variant="outline" className={riskBadgeClass(student.riskLevel)}>
                  {student.riskLevel}
                </Badge>
              </TableCell>
              <TableCell className="py-2 text-sm text-muted-foreground">{student.lastActive}</TableCell>
              <TableCell className="py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-primary hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <Link href={`/tutor/students/${student.slug}`}>View Profile</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
