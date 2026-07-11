import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
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
import { DEMO_CLASS_OVERVIEW } from "@/modules/organization/data/demo-classes-admin";
import type { SchoolStudentRow } from "@/modules/organization/types/org-student-profile";

interface MoveClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: SchoolStudentRow[];
}

function classLabel(grade: string, section: string) {
  return `Grade ${grade} · Section ${section}`;
}

export function MoveClassDialog({ open, onOpenChange, students }: MoveClassDialogProps) {
  const { toast } = useToast();
  const [sourceGrade, setSourceGrade] = useState("all");
  const [sourceSection, setSourceSection] = useState("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClassId, setTargetClassId] = useState<string | null>(null);

  const classes = useMemo(() => {
    const fromDemo = DEMO_CLASS_OVERVIEW.map((c) => ({
      id: c.id,
      grade: c.grade,
      section: c.section,
      label: classLabel(c.grade, c.section),
    }));
    const seen = new Set(fromDemo.map((c) => c.id));
    for (const student of students) {
      const id = `${student.grade}-${student.section.toLowerCase()}`;
      if (!seen.has(id) && student.grade !== "—") {
        seen.add(id);
        fromDemo.push({
          id,
          grade: student.grade,
          section: student.section,
          label: classLabel(student.grade, student.section),
        });
      }
    }
    return fromDemo.sort((a, b) => a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section));
  }, [students]);

  const sourceStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesGrade = sourceGrade === "all" || student.grade === sourceGrade;
      const matchesSection = sourceSection === "all" || student.section === sourceSection;
      return matchesGrade && matchesSection;
    });
  }, [students, sourceGrade, sourceSection]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMove = () => {
    const target = classes.find((c) => c.id === targetClassId);
    if (!target || selectedStudentIds.size === 0) return;
    toast({
      title: "Students moved",
      description: `${selectedStudentIds.size} student(s) moved to ${target.label}.`,
    });
    setSelectedStudentIds(new Set());
    setTargetClassId(null);
    setSourceGrade("all");
    setSourceSection("all");
    onOpenChange(false);
  };

  const resetOnClose = (next: boolean) => {
    if (!next) {
      setSelectedStudentIds(new Set());
      setTargetClassId(null);
      setSourceGrade("all");
      setSourceSection("all");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Move Class
          </DialogTitle>
          <DialogDescription>
            Filter students by class on the left, then select a target class on the right.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <section className="flex min-h-[280px] flex-col border-b border-border p-4 md:border-b-0 md:border-r">
            <h3 className="text-sm font-semibold text-foreground">Select Students</h3>
            <p className="mt-1 text-xs text-muted-foreground">Filter by current class, then select students.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Grade</Label>
                <Select value={sourceGrade} onValueChange={setSourceGrade}>
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
                <Select value={sourceSection} onValueChange={setSourceSection}>
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
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {sourceStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students in this class.</p>
              ) : (
                sourceStudents.map((student) => (
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
                        {classLabel(student.grade, student.section)}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>

          <section className="flex min-h-[280px] flex-col p-4">
            <h3 className="text-sm font-semibold text-foreground">Target Class</h3>
            <p className="mt-1 text-xs text-muted-foreground">Select the class to move students into.</p>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setTargetClassId(cls.id)}
                  className={cn(
                    "flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                    targetClassId === cls.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <span className="font-medium text-foreground">{cls.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => resetOnClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!targetClassId || selectedStudentIds.size === 0}
            onClick={handleMove}
          >
            Move Students ({selectedStudentIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
