import { useEffect, useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useQuery } from "@tanstack/react-query";
import { getClassTextbookOptions } from "@/api/classes";
import type { ClassTextbookOption } from "@/api/types";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";

const DEFAULT_BOOK = "default";
const NO_CHOICES: Record<string, Record<string, number>> = {};

function bookLabel(book: ClassTextbookOption) {
  return book.publisher && book.publisher !== book.title ? `${book.publisher} · ${book.title}` : book.title;
}

function subjectsForCurriculum(subjects: SubjectItem[], curriculum: string) {
  return subjects.filter((s) => {
    if (!s.active) return false;
    // ponytail: subjects API doesn't stamp curriculum yet — show all active
    if (!s.curriculums.length || s.curriculums.includes("All Curriculums")) return true;
    return s.curriculums.includes(curriculum);
  });
}

function selectionState(
  subjects: SubjectItem[],
  curriculum: string,
  mappings: Record<string, Record<string, boolean>>,
  classId: string,
) {
  const available = subjectsForCurriculum(subjects, curriculum);
  const saved = mappings[classSubjectMappingKey(classId, curriculum)] ?? {};
  return Object.fromEntries(available.map((s) => [s.id, !!saved[s.id]]));
}

interface MapClassSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassOverviewItem | null;
  subjects: SubjectItem[];
  mappings: Record<string, Record<string, boolean>>;
  /** class key -> subject id -> chosen publisher textbook id */
  textbookChoices?: Record<string, Record<string, number>>;
  /** Number of sections sharing this class's grade + curriculum (incl. itself). */
  sectionsInGrade?: number;
  onSave: (
    classId: string,
    curriculum: string,
    mapped: Record<string, boolean>,
    books: Record<string, number | null>,
    applyToGrade: boolean,
  ) => void;
}

export function MapClassSubjectsDialog({
  open,
  onOpenChange,
  classItem,
  subjects,
  mappings,
  textbookChoices = NO_CHOICES,
  sectionsInGrade = 1,
  onSave,
}: MapClassSubjectsDialogProps) {
  const [curriculum, setCurriculum] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [books, setBooks] = useState<Record<string, number | null>>({});
  const [applyToGrade, setApplyToGrade] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["classes", "textbook-options", classItem?.id],
    queryFn: () => getClassTextbookOptions(classItem!.id),
    enabled: open && !!classItem,
  });
  const bookOptions = optionsQuery.data?.options ?? {};

  useEffect(() => {
    if (!open || !classItem) return;
    const first = classItem.curriculums[0] ?? "";
    setCurriculum(first);
    setSelected(selectionState(subjects, first, mappings, classItem.id));
    setApplyToGrade(false);
  }, [open, classItem, subjects, mappings]);

  useEffect(() => {
    if (!open || !classItem || !curriculum) return;
    setSelected(selectionState(subjects, curriculum, mappings, classItem.id));
    setBooks({ ...(textbookChoices[classSubjectMappingKey(classItem.id, curriculum)] ?? {}) });
  }, [curriculum, open, classItem, subjects, mappings, textbookChoices]);

  const availableSubjects = useMemo(
    () => (curriculum ? subjectsForCurriculum(subjects, curriculum) : []),
    [subjects, curriculum],
  );

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSave = () => {
    if (!classItem || !curriculum) return;
    onSave(classItem.id, curriculum, selected, books, applyToGrade);
  };

  const renderBookPicker = (subjectId: string) => {
    const options = bookOptions[subjectId] ?? [];
    const alternatives = options.filter((b) => !b.is_default);
    // Only the default book exists -> nothing to choose.
    if (alternatives.length === 0) return null;
    const defaults = options.filter((b) => b.is_default);
    const chosen = books[subjectId];
    const value = chosen != null && alternatives.some((b) => b.id === chosen) ? String(chosen) : DEFAULT_BOOK;
    return (
      <Select
        value={value}
        onValueChange={(v) => setBooks((prev) => ({ ...prev, [subjectId]: v === DEFAULT_BOOK ? null : Number(v) }))}
      >
        <SelectTrigger className="h-8 w-full bg-background text-xs sm:w-56" aria-label="Textbook">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_BOOK}>
            {defaults.length === 1 ? `Default · ${bookLabel(defaults[0])}` : "Default book"}
          </SelectItem>
          {alternatives.map((b) => (
            <SelectItem key={b.id} value={String(b.id)}>
              {bookLabel(b)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (!classItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Map Subjects
          </DialogTitle>
          <DialogDescription>
            Grade {classItem.grade} · Section {classItem.section} — select subjects offered for this
            class.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {classItem.curriculums.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Curriculum</Label>
              <Select value={curriculum} onValueChange={setCurriculum}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  {classItem.curriculums.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Curriculum:</span>
              <Badge variant="secondary">{curriculum || classItem.curriculums[0]}</Badge>
            </div>
          )}

          <div className="space-y-2">
            {availableSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects available for this curriculum.</p>
            ) : (
              availableSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <label className="flex min-w-0 cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={selected[subject.id] ?? false}
                      onCheckedChange={(checked) => toggle(subject.id, checked === true)}
                    />
                    <div className="min-w-0">
                      <Label className="cursor-pointer font-normal">{subject.name}</Label>
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                    </div>
                  </label>
                  {selected[subject.id] ? renderBookPicker(subject.id) : null}
                </div>
              ))
            )}
          </div>

          {sectionsInGrade > 1 ? (
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox checked={applyToGrade} onCheckedChange={(checked) => setApplyToGrade(checked === true)} />
              Apply to all {sectionsInGrade} sections of Grade {classItem.grade}
            </label>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={availableSubjects.length === 0}>
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
