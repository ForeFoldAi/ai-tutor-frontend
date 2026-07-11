import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AI_INSIGHTS_GLASS_CARD_CLASS } from "@/modules/tutor/components/ai-insights/card-styles";
import { CardViewMoreButton, ViewMoreDialog } from "@/modules/tutor/components/view-more-dialog";
import type { AffectedStudent } from "@/modules/tutor/types/ai-insights";

interface AffectedStudentsCardProps {
  students: AffectedStudent[];
  allStudents: AffectedStudent[];
}

const RISK_STYLES = {
  High: "border-red-200 bg-red-50 text-red-600",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function studentSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function AffectedStudentRow({ student }: { student: AffectedStudent }) {
  return (
    <Link
      href={`/tutor/students/${studentSlug(student.name)}`}
      className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-muted/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={student.avatarColor}>{initials(student.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-blue-900 dark:text-blue-100">
            {student.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Grade {student.grade} · {student.topic}
          </p>
        </div>
      </div>
      <Badge variant="outline" className={`shrink-0 text-xs ${RISK_STYLES[student.riskLevel]}`}>
        {student.riskLevel}
      </Badge>
    </Link>
  );
}

export function AffectedStudentsCard({ students, allStudents }: AffectedStudentsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={AI_INSIGHTS_GLASS_CARD_CLASS}>
        <CardHeader className="shrink-0 space-y-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              Affected Students
            </CardTitle>
            <CardViewMoreButton onClick={() => setOpen(true)} />
          </div>
          <CardDescription>Students struggling with top weak topics</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
            {students.map((student) => (
              <AffectedStudentRow key={student.id} student={student} />
            ))}
          </div>
        </CardContent>
      </Card>

      <ViewMoreDialog
        open={open}
        onOpenChange={setOpen}
        title="All Affected Students"
        description="Students struggling with top weak topics"
      >
        {allStudents.map((student) => (
          <AffectedStudentRow key={student.id} student={student} />
        ))}
      </ViewMoreDialog>
    </>
  );
}
