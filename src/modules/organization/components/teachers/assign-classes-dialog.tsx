import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TeacherRow } from "@/modules/organization/types/teacher-profile";

export interface AssignableClass {
  id: string;
  grade: string;
  section: string;
  students?: number;
  teachers?: number;
  curriculums?: string[];
}

interface AssignClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: TeacherRow[];
  classes: AssignableClass[];
  onAssign: (teacherIds: string[], classIds: string[]) => void;
  isSubmitting?: boolean;
}

function classLabel(grade: string, section: string, curriculum?: string) {
  const base = `Grade ${grade} · Section ${section}`;
  return curriculum ? `${base} · ${curriculum}` : base;
}

export function AssignClassesDialog({
  open,
  onOpenChange,
  teachers,
  classes,
  onAssign,
  isSubmitting,
}: AssignClassesDialogProps) {
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");

  const activeTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return teachers.filter((teacher) => {
      if (teacher.status !== "Active") return false;
      if (!q) return true;
      return (
        teacher.fullName.toLowerCase().includes(q) ||
        teacher.userId.toLowerCase().includes(q) ||
        teacher.subject.toLowerCase().includes(q)
      );
    });
  }, [teachers, teacherSearch]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classes.filter((cls) => {
      if (!q) return true;
      const curriculum = cls.curriculums?.[0] ?? "";
      return (
        cls.grade.toLowerCase().includes(q) ||
        cls.section.toLowerCase().includes(q) ||
        curriculum.toLowerCase().includes(q) ||
        classLabel(cls.grade, cls.section, curriculum).toLowerCase().includes(q)
      );
    });
  }, [classes, classSearch]);

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetState = () => {
    setSelectedTeacherIds(new Set());
    setSelectedClassIds(new Set());
    setTeacherSearch("");
    setClassSearch("");
  };

  const handleAssign = () => {
    if (selectedTeacherIds.size === 0 || selectedClassIds.size === 0) return;
    onAssign([...selectedTeacherIds], [...selectedClassIds]);
  };

  const resetOnClose = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:h-[min(90dvh,42rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Assign Classes
          </DialogTitle>
          <DialogDescription>
            Select teachers on the left and classes on the right to assign.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden md:flex-row">
          <section className="flex flex-col border-b border-border p-4 md:min-h-0 md:flex-1 md:overflow-hidden md:border-b-0 md:border-r">
            <div className="shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Select Teachers</h3>
              <p className="mt-1 text-xs text-muted-foreground">Choose one or more teachers.</p>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="h-9 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
            </div>
            <div className="mt-3 h-[20rem] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:h-[22rem] md:h-auto md:min-h-0 md:flex-1">
              {activeTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teachers match your search.</p>
              ) : (
                activeTeachers.map((teacher) => (
                  <label
                    key={teacher.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedTeacherIds.has(teacher.id)}
                      onCheckedChange={() => toggleTeacher(teacher.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{teacher.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.subject} · Grades {teacher.grades}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col p-4 md:min-h-0 md:flex-1 md:overflow-hidden">
            <div className="shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Select Classes</h3>
              <p className="mt-1 text-xs text-muted-foreground">Choose one or more classes to assign.</p>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search classes..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="h-9 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
            </div>
            <div className="mt-3 h-[20rem] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:h-[22rem] md:h-auto md:min-h-0 md:flex-1">
              {filteredClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No classes available yet. Add classes from the Classes tab first.
                </p>
              ) : (
                filteredClasses.map((cls) => {
                  const curriculum = cls.curriculums?.[0];
                  return (
                    <label
                      key={cls.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={selectedClassIds.has(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {classLabel(cls.grade, cls.section, curriculum)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cls.students ?? 0} students · {cls.teachers ?? 0} teachers
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => resetOnClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedTeacherIds.size === 0 || selectedClassIds.size === 0 || isSubmitting}
            onClick={handleAssign}
          >
            {isSubmitting ? "Assigning…" : "Assign Classes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
