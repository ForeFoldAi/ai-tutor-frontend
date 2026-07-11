import { useMemo, useState } from "react";
import { BookMarked, Search } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { DEMO_SUBJECTS } from "@/modules/organization/data/demo-classes-admin";
import type { TeacherRow } from "@/modules/organization/types/teacher-profile";

interface AssignSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: TeacherRow[];
}

export function AssignSubjectsDialog({ open, onOpenChange, teachers }: AssignSubjectsDialogProps) {
  const { toast } = useToast();
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");

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

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    return DEMO_SUBJECTS.filter((subject) => {
      if (!subject.active) return false;
      if (!q) return true;
      return (
        subject.name.toLowerCase().includes(q) ||
        subject.code.toLowerCase().includes(q)
      );
    });
  }, [subjectSearch]);

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetState = () => {
    setSelectedTeacherIds(new Set());
    setSelectedSubjectIds(new Set());
    setTeacherSearch("");
    setSubjectSearch("");
  };

  const handleAssign = () => {
    if (selectedTeacherIds.size === 0 || selectedSubjectIds.size === 0) return;
    toast({
      title: "Subjects assigned",
      description: `${selectedSubjectIds.size} subject(s) assigned to ${selectedTeacherIds.size} teacher(s).`,
    });
    resetState();
    onOpenChange(false);
  };

  const resetOnClose = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Assign Subjects
          </DialogTitle>
          <DialogDescription>
            Select teachers on the left and subjects on the right to assign.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <section className="flex min-h-[280px] flex-col border-b border-border p-4 md:border-b-0 md:border-r">
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
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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

          <section className="flex min-h-[280px] flex-col p-4">
            <h3 className="text-sm font-semibold text-foreground">Select Subjects</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose one or more subjects to assign.</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="h-9 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
              />
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects match your search.</p>
              ) : (
                filteredSubjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedSubjectIds.has(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.code} · {subject.curriculums.join(", ")}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => resetOnClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedTeacherIds.size === 0 || selectedSubjectIds.size === 0}
            onClick={handleAssign}
          >
            Assign Subjects
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
