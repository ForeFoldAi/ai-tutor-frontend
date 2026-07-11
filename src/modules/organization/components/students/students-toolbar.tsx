import { ArrowRightLeft, Plus, UploadCloud, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportStudentsDialog } from "@/modules/organization/components/students/import-students-dialog";

import type { AddStudentRowValues } from "@/modules/organization/components/students/add-student-dialog";

interface StudentsToolbarProps {
  onAddStudent: () => void;
  onAssignTeacher: () => void;
  onMoveClass: () => void;
  onImportStudents: (rows: AddStudentRowValues[]) => void;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
}

export function StudentsToolbar({
  onAddStudent,
  onAssignTeacher,
  onMoveClass,
  onImportStudents,
  importOpen,
  onImportOpenChange,
}: StudentsToolbarProps) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
      <ImportStudentsDialog
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onImport={onImportStudents}
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
        onClick={onAssignTeacher}
      >
        <UserCheck className="h-4 w-4" />
        Assign Teacher
      </Button>
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
        onClick={onMoveClass}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Move Class
      </Button>
      <Button className="h-10 shrink-0 gap-2 whitespace-nowrap bg-primary px-4" onClick={onAddStudent}>
        <Plus className="h-4 w-4" />
        Add Student
      </Button>
    </div>
  );
}
