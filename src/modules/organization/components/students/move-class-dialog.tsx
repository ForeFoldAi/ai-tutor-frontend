import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { listClasses } from "@/api/classes";
import { listStudents } from "@/api/students";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mapStudentRecordToRow } from "@/modules/organization/utils/org-student-helpers";

const PAGE_SIZE = 25;

interface MoveClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grades?: string[];
  sections?: string[];
  pending?: boolean;
  onMove: (payload: { studentIds: number[]; classId: number }) => void;
}

function classLabel(grade: string, section: string, curriculum?: string) {
  const base = `Grade ${grade} · Section ${section}`;
  return curriculum ? `${base} · ${curriculum}` : base;
}

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function PageControls({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
      <span>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-6 w-6"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span>
          {page}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-6 w-6"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function MoveClassDialog({
  open,
  onOpenChange,
  grades = [],
  sections = [],
  pending,
  onMove,
}: MoveClassDialogProps) {
  const [sourceGrade, setSourceGrade] = useState("all");
  const [sourceSection, setSourceSection] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [classPage, setClassPage] = useState(1);

  const debouncedStudentSearch = useDebounced(studentSearch);
  const debouncedClassSearch = useDebounced(classSearch);

  useEffect(() => {
    setStudentPage(1);
  }, [debouncedStudentSearch, sourceGrade, sourceSection]);

  useEffect(() => {
    setClassPage(1);
  }, [debouncedClassSearch]);

  const studentsQuery = useQuery({
    queryKey: ["students", "move-dialog", debouncedStudentSearch, sourceGrade, sourceSection, studentPage],
    queryFn: () =>
      listStudents({
        q: debouncedStudentSearch || undefined,
        grade: sourceGrade,
        section: sourceSection,
        limit: PAGE_SIZE,
        offset: (studentPage - 1) * PAGE_SIZE,
      }),
    enabled: open,
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "move-dialog", debouncedClassSearch, classPage],
    queryFn: () =>
      listClasses({
        q: debouncedClassSearch || undefined,
        limit: PAGE_SIZE,
        offset: (classPage - 1) * PAGE_SIZE,
      }),
    enabled: open,
  });

  const students = (studentsQuery.data?.items ?? []).map(mapStudentRecordToRow);
  const studentTotal = studentsQuery.data?.meta.total ?? 0;
  const classes = (classesQuery.data?.items ?? []).map((c) => ({
    id: String(c.id),
    label: classLabel(c.grade, c.section, c.curriculum),
  }));
  const classTotal = classesQuery.data?.meta.total ?? 0;

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageStudents = (checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      for (const student of students) {
        if (checked) next.add(student.id);
        else next.delete(student.id);
      }
      return next;
    });
  };

  const pageAllSelected = students.length > 0 && students.every((s) => selectedStudentIds.has(s.id));

  const handleMove = () => {
    if (!targetClassId || selectedStudentIds.size === 0) return;
    onMove({
      studentIds: [...selectedStudentIds].map(Number),
      classId: Number(targetClassId),
    });
  };

  const resetOnClose = (next: boolean) => {
    if (!next) {
      setSelectedStudentIds(new Set());
      setTargetClassId(null);
      setSourceGrade("all");
      setSourceSection("all");
      setStudentSearch("");
      setClassSearch("");
      setStudentPage(1);
      setClassPage(1);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex !h-[92vh] !max-h-[92vh] w-[min(1100px,96vw)] !max-w-[1100px] flex-col gap-0 overflow-hidden !p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-4 py-2.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Move Class
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search and page through students and target classes. Selection is kept across pages.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
          <section className="flex min-h-0 flex-col border-b border-border px-3 py-2 md:border-b-0 md:border-r">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-foreground">Select Students</h3>
              {selectedStudentIds.size > 0 ? (
                <span className="text-xs text-muted-foreground">{selectedStudentIds.size} selected</span>
              ) : null}
            </div>
            <div className="mt-1.5 shrink-0 space-y-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-8 bg-background pl-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={sourceGrade} onValueChange={setSourceGrade}>
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceSection} onValueChange={setSourceSection}>
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        Section {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {students.length > 0 ? (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={pageAllSelected} onCheckedChange={(v) => togglePageStudents(v === true)} />
                  Select all on this page
                </label>
              ) : null}
            </div>
            <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {studentsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading students…</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students match.</p>
              ) : (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex h-7 cursor-pointer items-center gap-2 rounded-md border border-border px-2 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {student.fullName}
                    </span>
                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                      {student.userId} · {student.grade}-{student.section}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="shrink-0">
              <PageControls
                page={studentPage}
                total={studentTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setStudentPage}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col px-3 py-2">
            <h3 className="shrink-0 text-xs font-semibold text-foreground">Target Class</h3>
            <div className="relative mt-1.5 shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="h-8 bg-background pl-8 text-sm"
              />
            </div>
            <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {classesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading classes…</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes match.</p>
              ) : (
                classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setTargetClassId(cls.id)}
                    className={cn(
                      "flex h-7 w-full items-center rounded-md border px-2 text-left text-sm transition-colors",
                      targetClassId === cls.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <span className="truncate font-medium text-foreground">{cls.label}</span>
                  </button>
                ))
              )}
            </div>
            <div className="shrink-0">
              <PageControls page={classPage} total={classTotal} pageSize={PAGE_SIZE} onPageChange={setClassPage} />
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-4 py-2.5">
          <Button type="button" variant="outline" size="sm" onClick={() => resetOnClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!targetClassId || selectedStudentIds.size === 0 || pending}
            onClick={handleMove}
          >
            {pending ? "Moving…" : `Move Students (${selectedStudentIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
