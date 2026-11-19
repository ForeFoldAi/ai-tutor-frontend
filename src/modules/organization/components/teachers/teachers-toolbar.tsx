import type { ReactNode } from "react";
import { BookMarked, BookOpen, Download, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportTeachersDialog } from "@/modules/organization/components/teachers/import-teachers-dialog";

import type { AddTeacherRowValues } from "@/modules/organization/components/teachers/add-teacher-dialog";

interface TeachersToolbarProps {
  title: ReactNode;
  onAddTeacher: () => void;
  onAssignClasses: () => void;
  onAssignSubjects: () => void;
  onImportTeachers: (rows: AddTeacherRowValues[]) => void;
  onExport: () => void;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
}

const outlineBtn =
  "h-9 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm !border !border-slate-300 hover:!border-slate-400 sm:h-10 sm:gap-2";

export function TeachersToolbar({
  title,
  onAddTeacher,
  onAssignClasses,
  onAssignSubjects,
  onImportTeachers,
  onExport,
  importOpen,
  onImportOpenChange,
}: TeachersToolbarProps) {
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
      <Button type="button" variant="outline" className={outlineBtn} onClick={onAssignClasses}>
        <BookOpen className="h-4 w-4" />
        Assign Classes
      </Button>
      <Button type="button" variant="outline" className={outlineBtn} onClick={onAssignSubjects}>
        <BookMarked className="h-4 w-4" />
        Assign Subjects
      </Button>
    </>
  );

  return (
    <>
      <ImportTeachersDialog
        hideTrigger
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onImport={onImportTeachers}
      />
      <div className="flex min-w-0 items-start justify-between gap-2 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1">{title}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">{secondaryActions}</div>
          <Button
            type="button"
            className="h-9 shrink-0 gap-1.5 whitespace-nowrap bg-primary px-3 text-sm sm:h-10 sm:gap-2 sm:px-4"
            onClick={onAddTeacher}
          >
            <Plus className="h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:hidden">{secondaryActions}</div>
    </>
  );
}
