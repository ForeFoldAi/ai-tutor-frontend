import { useMemo, useState } from "react";
import { Search, UserCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { SchoolStudentRow } from "@/modules/organization/types/org-student-profile";
import type { TeacherRow } from "@/modules/organization/types/teacher-profile";

interface AssignTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: TeacherRow[];
  students: SchoolStudentRow[];
}

export function AssignTeacherDialog({ open, onOpenChange, teachers, students }: AssignTeacherDialogProps) {
  const { toast } = useToast();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [section, setSection] = useState("all");

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesGrade = grade === "all" || student.grade === grade;
      const matchesSection = section === "all" || student.section === section;
      const matchesSearch =
        !q ||
        student.fullName.toLowerCase().includes(q) ||
        student.userId.toLowerCase().includes(q);
      return matchesGrade && matchesSection && matchesSearch;
    });
  }, [students, search, grade, section]);

  const activeTeachers = teachers.filter((t) => t.status === "Active");

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = () => {
    const teacher = activeTeachers.find((t) => t.id === selectedTeacherId);
    if (!teacher || selectedStudentIds.size === 0) return;
    toast({
      title: "Teacher assigned",
      description: `${teacher.fullName} assigned to ${selectedStudentIds.size} student(s).`,
    });
    setSelectedTeacherId(null);
    setSelectedStudentIds(new Set());
    setSearch("");
    setGrade("all");
    setSection("all");
    onOpenChange(false);
  };

  const resetOnClose = (next: boolean) => {
    if (!next) {
      setSelectedTeacherId(null);
      setSelectedStudentIds(new Set());
      setSearch("");
      setGrade("all");
      setSection("all");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Teacher
          </DialogTitle>
          <DialogDescription>
            Select a teacher on the left, then choose students on the right to assign.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <section className="flex min-h-[280px] flex-col border-b border-border p-4 md:border-b-0 md:border-r">
            <h3 className="text-sm font-semibold text-foreground">Select Teacher</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose one teacher to assign.</p>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {activeTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active teachers available.</p>
              ) : (
                activeTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selectedTeacherId === teacher.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <span className="font-medium text-foreground">{teacher.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {teacher.subject} · Grades {teacher.grades}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="flex min-h-[280px] flex-col p-4">
            <h3 className="text-sm font-semibold text-foreground">Select Students</h3>
            <p className="mt-1 text-xs text-muted-foreground">Filter and select students to assign.</p>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
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
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Section</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students match your filters.</p>
              ) : (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Grade {student.grade} · Section {student.section}
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
            disabled={!selectedTeacherId || selectedStudentIds.size === 0}
            onClick={handleAssign}
          >
            Assign Teacher ({selectedStudentIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
