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
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";

function subjectsForCurriculum(subjects: SubjectItem[], curriculum: string) {
  return subjects.filter(
    (s) =>
      s.active &&
      (s.curriculums.includes(curriculum) || s.curriculums.includes("All Curriculums")),
  );
}

interface MapClassSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassOverviewItem | null;
  subjects: SubjectItem[];
  mappings: Record<string, Record<string, boolean>>;
  onSave: (classId: string, curriculum: string, mapped: Record<string, boolean>) => void;
}

export function MapClassSubjectsDialog({
  open,
  onOpenChange,
  classItem,
  subjects,
  mappings,
  onSave,
}: MapClassSubjectsDialogProps) {
  const [curriculum, setCurriculum] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !classItem) return;
    const first = classItem.curriculums[0] ?? "";
    setCurriculum(first);
    const key = classSubjectMappingKey(classItem.id, first);
    const saved = mappings[key];
    const available = subjectsForCurriculum(subjects, first);
    setSelected(
      saved ??
        Object.fromEntries(available.map((s) => [s.id, false])),
    );
  }, [open, classItem, subjects, mappings]);

  useEffect(() => {
    if (!classItem || !curriculum) return;
    const key = classSubjectMappingKey(classItem.id, curriculum);
    const saved = mappings[key];
    const available = subjectsForCurriculum(subjects, curriculum);
    setSelected(
      saved ??
        Object.fromEntries(available.map((s) => [s.id, false])),
    );
  }, [curriculum, classItem, subjects, mappings]);

  const availableSubjects = useMemo(
    () => (curriculum ? subjectsForCurriculum(subjects, curriculum) : []),
    [subjects, curriculum],
  );

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSave = () => {
    if (!classItem || !curriculum) return;
    onSave(classItem.id, curriculum, selected);
    onOpenChange(false);
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
                <label
                  key={subject.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30"
                >
                  <Checkbox
                    checked={selected[subject.id] ?? false}
                    onCheckedChange={(checked) => toggle(subject.id, checked === true)}
                  />
                  <div className="min-w-0">
                    <Label className="cursor-pointer font-normal">{subject.name}</Label>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                  </div>
                </label>
              ))
            )}
          </div>
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
