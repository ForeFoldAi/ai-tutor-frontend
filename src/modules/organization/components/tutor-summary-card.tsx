import { BookOpen, GraduationCap, Mail, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApiUser } from "@/api/types";
import { cn } from "@/lib/utils";

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

interface TutorSummaryCardProps {
  tutor: ApiUser;
  schoolLabel: string | null;
  onToggleStatus?: (tutor: ApiUser) => void;
  onEditTutor?: (tutor: ApiUser) => void;
  onDeleteTutor?: (tutor: ApiUser) => void;
}

/** Normalized rows: one grade per row, sections as individual labels (e.g. A, D, E). */
export function teachingClassRowsFromUser(tutor: ApiUser): { grade: string; sections: string[] }[] {
  return (
    tutor.teaching_classes
      ?.map((c) => {
        const grade = (c.grade ?? "").trim();
        const sections = (c.sections ?? []).map((s) => String(s).trim()).filter(Boolean);
        if (!grade) return null;
        return { grade, sections };
      })
      .filter((row): row is { grade: string; sections: string[] } => row !== null) ?? []
  );
}

/** Plain-text summary for titles / accessibility (e.g. "9: A D E · 10: A"). */
export function tutorTeachingScopeLabel(tutor: ApiUser): string {
  const rows = teachingClassRowsFromUser(tutor);
  if (rows.length === 0) return "—";
  return rows
    .map((r) => (r.sections.length > 0 ? `${r.grade}: ${r.sections.join(" ")}` : r.grade))
    .join(" · ");
}

const scopeGrid = (compact: boolean) =>
  cn("grid items-center gap-x-4", compact ? "grid-cols-[1.75rem_minmax(0,1fr)]" : "grid-cols-[2.75rem_minmax(0,1fr)]");

/** Grade column + section tags in a horizontal row (per class). */
export function TutorTeachingScopeRows({
  tutor,
  className,
  compact = false,
  showLabels = false,
  emptyMessage = "No classes on file.",
}: {
  tutor: ApiUser;
  className?: string;
  compact?: boolean;
  /** When true, shows a Grade / Sections header row aligned to the grid. */
  showLabels?: boolean;
  emptyMessage?: string;
}) {
  const rows = teachingClassRowsFromUser(tutor);
  if (rows.length === 0) {
    return <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{emptyMessage}</span>;
  }
  return (
    <div className={cn(className)}>
      {showLabels ? (
        <div className={cn(scopeGrid(compact), "mb-2 border-b border-border/60 pb-1.5")}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sections</span>
        </div>
      ) : null}
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={`${row.grade}-${i}`} className={cn(scopeGrid(compact), "min-h-[1.25rem]")}>
            <span
              className={cn(
                "tabular-nums font-semibold text-foreground",
                compact ? "text-xs" : "text-sm",
              )}
              title="Grade / class"
            >
              {row.grade}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {row.sections.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                row.sections.map((s) => (
                  <Badge
                    key={`${row.grade}-${s}-${i}`}
                    variant="secondary"
                    className={cn(
                      "font-normal tabular-nums",
                      compact ? "px-1.5 py-0 text-[10px] leading-tight" : "text-xs",
                    )}
                  >
                    {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TutorActionsMenu({
  tutor,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  tutor: ApiUser;
  onEdit?: (tutor: ApiUser) => void;
  onToggleStatus?: (tutor: ApiUser) => void;
  onDelete?: (tutor: ApiUser) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Open menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onEdit ? (
          <DropdownMenuItem onSelect={() => onEdit(tutor)}>
            Edit
          </DropdownMenuItem>
        ) : null}
        {onToggleStatus ? (
          <DropdownMenuItem onSelect={() => onToggleStatus(tutor)}>
            {tutor.is_active ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(tutor.email)}>Copy email</DropdownMenuItem>
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(tutor)}
            >
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TutorSummaryCard({
  tutor,
  schoolLabel,
  onToggleStatus,
  onEditTutor,
  onDeleteTutor,
}: TutorSummaryCardProps) {
  const board = tutor.teaching_board?.trim() || null;

  return (
    <Card className="flex flex-col overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{tutor.full_name}</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 min-w-0">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{tutor.email}</span>
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
            {onEditTutor || onToggleStatus || onDeleteTutor ? (
              <TutorActionsMenu
                tutor={tutor}
                onEdit={onEditTutor}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteTutor}
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
        <p className="text-xs text-muted-foreground pl-11">Added {formatDate(tutor.created_at)}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div>
          <TutorTeachingScopeRows tutor={tutor} showLabels />
        </div>
        {onEditTutor || onToggleStatus || onDeleteTutor ? (
          <div className="mt-auto pt-1">
            <Badge variant={tutor.is_active ? "default" : "secondary"} className="text-[10px]">
              {tutor.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
