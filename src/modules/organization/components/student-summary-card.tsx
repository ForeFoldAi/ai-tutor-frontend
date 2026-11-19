import { BookOpen, Mail, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiUser } from "@/api/types";
import { TutorActionsMenu, TutorTeachingScopeRows } from "./tutor-summary-card";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface StudentSummaryCardProps {
  student: ApiUser;
  schoolLabel: string | null;
  onToggleStatus?: (student: ApiUser) => void;
  onEditStudent?: (student: ApiUser) => void;
  onDeleteStudent?: (student: ApiUser) => void;
}

export function StudentSummaryCard({
  student,
  schoolLabel,
  onToggleStatus,
  onEditStudent,
  onDeleteStudent,
}: StudentSummaryCardProps) {
  const board = student.teaching_board?.trim() || null;

  return (
    <Card className="flex flex-col overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{student.full_name}</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 min-w-0">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{student.email}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {board ? (
              <Badge variant="outline" className="text-xs font-normal max-w-[6.5rem] truncate">
                {board}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs font-normal">
                Board TBD
              </Badge>
            )}
            {onEditStudent || onToggleStatus || onDeleteStudent ? (
              <TutorActionsMenu
                tutor={student}
                onEdit={onEditStudent}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteStudent}
              />
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground pl-11">
          {schoolLabel ? (
            <span className="flex items-center gap-1 min-w-0">
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">{schoolLabel}</span>
            </span>
          ) : (
            "School not assigned"
          )}
        </p>
        <p className="text-xs text-muted-foreground pl-11">Added {formatDate(student.created_at)}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div>
          <TutorTeachingScopeRows tutor={student} showLabels emptyMessage="No class on file." />
        </div>
        {onEditStudent || onToggleStatus || onDeleteStudent ? (
          <div className="mt-auto pt-1">
            <Badge variant={student.is_active ? "default" : "secondary"} className="text-[10px]">
              {student.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
