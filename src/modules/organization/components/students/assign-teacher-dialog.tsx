import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, UserCheck } from "lucide-react";
import { listStudents } from "@/api/students";
import { listTeachers } from "@/api/teachers";
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
import { mapTeacherToRow } from "@/modules/organization/utils/teacher-helpers";

const PAGE_SIZE = 25;

interface AssignTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grades?: string[];
  sections?: string[];
  curricula?: string[];
  pending?: boolean;
  onAssign: (payload: { teacherIds: number[]; studentIds: number[] }) => void;
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
    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
      <span>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span>
          {page}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function AssignTeacherDialog({
  open,
  onOpenChange,
  grades = [],
  sections = [],
  curricula = [],
  pending,
  onAssign,
}: AssignTeacherDialogProps) {
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [curriculum, setCurriculum] = useState("all");
  const [grade, setGrade] = useState("all");
  const [section, setSection] = useState("all");
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);

  const debouncedTeacherSearch = useDebounced(teacherSearch);
  const debouncedStudentSearch = useDebounced(studentSearch);

  useEffect(() => {
    setTeacherPage(1);
  }, [debouncedTeacherSearch, curriculum]);

  useEffect(() => {
    setStudentPage(1);
  }, [debouncedStudentSearch, grade, section]);

  const teachersQuery = useQuery({
    queryKey: ["teachers", "assign-dialog", debouncedTeacherSearch, curriculum, teacherPage],
    queryFn: () =>
      listTeachers({
        q: debouncedTeacherSearch || undefined,
        curriculum,
        status: "active",
        limit: PAGE_SIZE,
        offset: (teacherPage - 1) * PAGE_SIZE,
      }),
    enabled: open,
  });

  const studentsQuery = useQuery({
    queryKey: ["students", "assign-dialog", debouncedStudentSearch, grade, section, studentPage],
    queryFn: () =>
      listStudents({
        q: debouncedStudentSearch || undefined,
        grade,
        section,
        limit: PAGE_SIZE,
        offset: (studentPage - 1) * PAGE_SIZE,
      }),
    enabled: open,
  });

  const teachers = (teachersQuery.data?.items ?? []).map(mapTeacherToRow);
  const students = (studentsQuery.data?.items ?? []).map(mapStudentRecordToRow);
  const teacherTotal = teachersQuery.data?.meta.total ?? 0;
  const studentTotal = studentsQuery.data?.meta.total ?? 0;

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageTeachers = (checked: boolean) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      for (const teacher of teachers) {
        if (checked) next.add(teacher.id);
        else next.delete(teacher.id);
      }
      return next;
    });
  };

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

  const pageTeachersSelected =
    teachers.length > 0 && teachers.every((t) => selectedTeacherIds.has(t.id));
  const pageAllSelected = students.length > 0 && students.every((s) => selectedStudentIds.has(s.id));

  const handleAssign = () => {
    if (selectedTeacherIds.size === 0 || selectedStudentIds.size === 0) return;
    onAssign({
      teacherIds: [...selectedTeacherIds].map(Number),
      studentIds: [...selectedStudentIds].map(Number),
    });
  };

  const resetOnClose = (next: boolean) => {
    if (!next) {
      setSelectedTeacherIds(new Set());
      setSelectedStudentIds(new Set());
      setTeacherSearch("");
      setStudentSearch("");
      setCurriculum("all");
      setGrade("all");
      setSection("all");
      setTeacherPage(1);
      setStudentPage(1);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="flex !h-[92vh] !max-h-[92vh] w-[min(1100px,96vw)] !max-w-[1100px] flex-col gap-0 overflow-hidden !p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-4 py-2.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            Assign Teacher
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search and page through teachers and students. Selection is kept across pages.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
          <section className="flex min-h-0 flex-col border-b border-border px-3 py-2 md:border-b-0 md:border-r">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Select Teacher(s)</h3>
              {selectedTeacherIds.size > 0 ? (
                <span className="text-sm text-muted-foreground">{selectedTeacherIds.size} selected</span>
              ) : null}
            </div>
            <div className="mt-1.5 flex shrink-0 gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="h-9 !border !border-slate-300 bg-background pl-9 text-sm hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
              <Select value={curriculum} onValueChange={setCurriculum}>
                <SelectTrigger className="h-9 w-[140px] shrink-0 !border !border-slate-300 bg-background text-sm hover:!border-slate-400">
                  <SelectValue placeholder="Curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Curriculums</SelectItem>
                  {curricula.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {teachers.length > 0 ? (
              <label className="mt-1.5 flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox
                  checked={pageTeachersSelected}
                  onCheckedChange={(v) => togglePageTeachers(v === true)}
                />
                Select all on this page
              </label>
            ) : null}
            <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {teachersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading teachers…</p>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teachers match.</p>
              ) : (
                teachers.map((teacher) => (
                  <label
                    key={teacher.id}
                    className={cn(
                      "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border px-2 text-left text-sm transition-colors",
                      selectedTeacherIds.has(teacher.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <Checkbox
                      checked={selectedTeacherIds.has(teacher.id)}
                      onCheckedChange={() => toggleTeacher(teacher.id)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{teacher.fullName}</span>
                    <span className="shrink-0 truncate text-sm text-muted-foreground">
                      {teacher.subject} · {teacher.grades}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="shrink-0">
              <PageControls
                page={teacherPage}
                total={teacherTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setTeacherPage}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col px-3 py-2">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Select Students</h3>
              {selectedStudentIds.size > 0 ? (
                <span className="text-sm text-muted-foreground">{selectedStudentIds.size} selected</span>
              ) : null}
            </div>
            <div className="mt-1.5 shrink-0 space-y-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-9 !border !border-slate-300 bg-background pl-9 text-sm hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="h-9 !border !border-slate-300 bg-background text-sm hover:!border-slate-400">
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
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="h-9 !border !border-slate-300 bg-background text-sm hover:!border-slate-400">
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
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                  <Checkbox checked={pageAllSelected} onCheckedChange={(v) => togglePageStudents(v === true)} />
                  Select all on this page
                </label>
              ) : null}
            </div>
            <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {studentsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading students…</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students match your filters.</p>
              ) : (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border px-2 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {student.fullName}
                    </span>
                    <span className="shrink-0 truncate text-sm text-muted-foreground">
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
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-4 py-2.5">
          <Button type="button" variant="outline" size="sm" onClick={() => resetOnClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selectedTeacherIds.size === 0 || selectedStudentIds.size === 0 || pending}
            onClick={handleAssign}
          >
            {pending
              ? "Assigning…"
              : `Assign (${selectedTeacherIds.size} teacher · ${selectedStudentIds.size} student)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
