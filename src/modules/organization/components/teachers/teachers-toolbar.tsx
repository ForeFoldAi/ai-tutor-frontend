import { BookMarked, BookOpen, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportTeachersDialog } from "@/modules/organization/components/teachers/import-teachers-dialog";

import type { AddTeacherRowValues } from "@/modules/organization/components/teachers/add-teacher-dialog";

interface TeachersToolbarProps {
  onAddTeacher: () => void;
  onAssignClasses: () => void;
  onAssignSubjects: () => void;
  onImportTeachers: (rows: AddTeacherRowValues[]) => void;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
}

export function TeachersToolbar({
  onAddTeacher,
  onAssignClasses,
  onAssignSubjects,
  onImportTeachers,
  importOpen,
  onImportOpenChange,
}: TeachersToolbarProps) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
      <ImportTeachersDialog
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onImport={onImportTeachers}
      />
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
      >
        <UploadCloud className="h-4 w-4" />
        Export
      </Button>
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
        onClick={onAssignClasses}
      >
        <BookOpen className="h-4 w-4" />
        Assign Classes
      </Button>
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
        onClick={onAssignSubjects}
      >
        <BookMarked className="h-4 w-4" />
        Assign Subjects
      </Button>
      <Button className="h-10 shrink-0 gap-2 whitespace-nowrap bg-primary px-4" onClick={onAddTeacher}>
        <Plus className="h-4 w-4" />
        Add Teacher
      </Button>
    </div>
  );
}
