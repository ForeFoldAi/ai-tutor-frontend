import { Building2, GraduationCap, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationSchoolSummary, SchoolAdminBrief } from "@/api/types";

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

interface SchoolSummaryCardProps {
  school: OrganizationSchoolSummary;
  onToggleAdmin?: (admin: SchoolAdminBrief) => void;
  onAddSchoolAdmin?: (school: OrganizationSchoolSummary) => void;
  onEditSchool?: (school: OrganizationSchoolSummary) => void;
  onDeleteSchool?: (school: OrganizationSchoolSummary) => void;
}

export function SchoolSummaryCard({
  school,
  onToggleAdmin,
  onAddSchoolAdmin,
  onEditSchool,
  onDeleteSchool,
}: SchoolSummaryCardProps) {
  const showMenu = Boolean(onEditSchool || onDeleteSchool);

  return (
    <Card className="flex flex-col overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{school.name}</CardTitle>
              {school.branch ? (
                <p className="text-xs text-muted-foreground truncate">{school.branch}</p>
              ) : null}
              {school.organization_name ? (
                <p className="text-xs text-muted-foreground truncate">{school.organization_name}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {school.board ? (
              <Badge variant="outline" className="text-xs font-normal max-w-[7rem] truncate">
                {school.board}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs font-normal">
                Board TBD
              </Badge>
            )}
            {showMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">School actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditSchool ? (
                    <DropdownMenuItem onClick={() => onEditSchool(school)}>Edit school</DropdownMenuItem>
                  ) : null}
                  {onDeleteSchool ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteSchool(school)}
                    >
                      Delete school
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground pl-11">Added {formatDate(school.created_at)}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold leading-none">{school.tutor_count}</p>
              <p className="text-xs text-muted-foreground">Tutors</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold leading-none">{school.student_count}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">School admins</p>
            {onAddSchoolAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs shrink-0"
                onClick={() => onAddSchoolAdmin(school)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add admin
              </Button>
            ) : null}
          </div>
          {school.school_admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No school admin assigned.</p>
          ) : (
            <ul className="space-y-2">
              {school.school_admins.map((admin) => (
                <li
                  key={admin.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{admin.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={admin.is_active ? "default" : "secondary"} className="text-[10px]">
                      {admin.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {onToggleAdmin ? (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onToggleAdmin(admin)}>
                        {admin.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
