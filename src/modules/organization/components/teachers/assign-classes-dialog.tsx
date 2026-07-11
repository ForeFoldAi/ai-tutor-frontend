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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DEMO_CLASS_OVERVIEW } from "@/modules/organization/data/demo-classes-admin";
import type { TeacherRow } from "@/modules/organization/types/teacher-profile";

interface AssignClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: TeacherRow[];
}

function classLabel(grade: string, section: string) {
  return `Grade ${grade} · Section ${section}`;
}

export function AssignClassesDialog({ open, onOpenChange, teachers }: AssignClassesDialogProps) {
  const { toast } = useToast();
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [classGrade, setClassGrade] = useState("all");

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
    return DEMO_CLASS_OVERVIEW.filter((cls) => classGrade === "all" || cls.grade === classGrade);
  }, [classGrade]);

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
    setClassGrade("all");
  };

  const handleAssign = () => {
    if (selectedTeacherIds.size === 0 || selectedClassIds.size === 0) return;
    toast({
      title: "Classes assigned",
      description: `${selectedClassIds.size} class(es) assigned to ${selectedTeacherIds.size} teacher(s).`,
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
            <BookOpen className="h-5 w-5 text-primary" />
            Assign Classes
          </DialogTitle>
          <DialogDescription>
            Select teachers on the left and classes on the right to assign.
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
            <h3 className="text-sm font-semibold text-foreground">Select Classes</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose one or more classes to assign.</p>
            <div className="mt-3 space-y-1">
              <Label className="text-xs text-muted-foreground">Grade</Label>
              <Select value={classGrade} onValueChange={setClassGrade}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="7">Grade 7</SelectItem>
                  <SelectItem value="8">Grade 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes match your filter.</p>
              ) : (
                filteredClasses.map((cls) => (
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
                      <p className="font-medium text-foreground">{classLabel(cls.grade, cls.section)}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.students} students · {cls.teachers} teachers · {cls.curriculums.join(", ")}
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
            disabled={selectedTeacherIds.size === 0 || selectedClassIds.size === 0}
            onClick={handleAssign}
          >
            Assign Classes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
