import type { ReactNode } from "react";
import { ArrowRightLeft, Download, Plus, UploadCloud, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportStudentsDialog } from "@/modules/organization/components/students/import-students-dialog";

import type { AddStudentRowValues } from "@/modules/organization/components/students/add-student-dialog";

interface StudentsToolbarProps {
  title: ReactNode;
  onAddStudent: () => void;
  onAssignTeacher?: () => void;
  onMoveClass: () => void;
  onImportStudents: (rows: AddStudentRowValues[]) => void;
  onExport: () => void;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  /** School multi-teacher flow — hide for individual tutors. */
  showAssignTeacher?: boolean;
}

const outlineBtn =
  "h-9 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm !border !border-slate-300 hover:!border-slate-400 sm:h-10 sm:gap-2";

export function StudentsToolbar({
  title,
  onAddStudent,
  onAssignTeacher,
  onMoveClass,
  onImportStudents,
  onExport,
  importOpen,
  onImportOpenChange,
  showAssignTeacher = true,
}: StudentsToolbarProps) {
  const secondaryActions = (
    <>
      <Button
        type="button"
        variant="outline"
        className={outlineBtn}
        onClick={() => onImportOpenChange(true)}
      >
        <Download className="h-4 w-4" />
        Import
      </Button>
      <Button type="button" variant="outline" className={outlineBtn} onClick={onExport}>
        <UploadCloud className="h-4 w-4" />
        Export
      </Button>
      <Button type="button" variant="outline" className={outlineBtn} onClick={onMoveClass}>
        <ArrowRightLeft className="h-4 w-4" />
        Move Class
      </Button>
      {showAssignTeacher && onAssignTeacher ? (
        <Button type="button" variant="outline" className={outlineBtn} onClick={onAssignTeacher}>
          <UserCheck className="h-4 w-4" />
          Assign Teacher
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <ImportStudentsDialog
        hideTrigger
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onImport={onImportStudents}
      />
      <div className="flex min-w-0 items-start justify-between gap-2 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1">{title}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">{secondaryActions}</div>
          <Button
            type="button"
            className="h-9 shrink-0 gap-1.5 whitespace-nowrap bg-primary px-3 text-sm sm:h-10 sm:gap-2 sm:px-4"
            onClick={onAddStudent}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:hidden">{secondaryActions}</div>
    </>
  );
}
