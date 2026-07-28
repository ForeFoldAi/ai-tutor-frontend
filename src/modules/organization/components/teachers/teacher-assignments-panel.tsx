import { GraduationCap, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  TeacherClassBrief,
  TeacherDetail,
  TeacherGradeSubjects,
  TeacherStudentBrief,
  TeacherSubjectBrief,
} from "@/api/types";

export interface TeacherUnassignSelection {
  subjectIds: number[];
  classIds: number[];
  studentIds: number[];
}

interface TeacherAssignmentsPanelProps {
  detail: TeacherDetail | null;
  loading?: boolean;
  /** Edit mode: checkboxes = still assigned; uncheck to unassign on Save. */
  selectable: boolean;
  /** Checked ids = keep assigned. */
  selection: TeacherUnassignSelection;
  onSelectionChange: (next: TeacherUnassignSelection) => void;
  disabled?: boolean;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function toggleId(ids: number[], id: number, checked: boolean): number[] {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((x) => x !== id);
}

function classLabel(item: TeacherClassBrief) {
  return `${item.grade}-${item.section} · ${item.curriculum}`;
}

function StudentRow({
  item,
  selectable,
  checked,
  disabled,
  onCheckedChange,
}: {
  item: TeacherStudentBrief;
  selectable: boolean;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const placement =
    item.grade && item.section ? `Grade ${item.grade} · Section ${item.section}` : null;
  return (
    <label
      className={`flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 ${
        selectable ? "cursor-pointer" : ""
      }`}
    >
      {selectable ? (
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-label={`Keep ${item.full_name} assigned`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.email}
          {placement ? ` · ${placement}` : ""}
        </p>
      </div>
    </label>
  );
}

const EMPTY_SELECTION: TeacherUnassignSelection = {
  subjectIds: [],
  classIds: [],
  studentIds: [],
};

export function emptyTeacherUnassignSelection(): TeacherUnassignSelection {
  return { ...EMPTY_SELECTION, subjectIds: [], classIds: [], studentIds: [] };
}

/** All currently assigned ids — use as initial checked state in edit mode. */
export function keptSelectionFromDetail(detail: TeacherDetail): TeacherUnassignSelection {
  return {
    subjectIds: detail.subjects.map((s) => s.id),
    classIds: detail.classes.map((c) => c.id),
    studentIds: detail.students.map((s) => s.id),
  };
}

/** Ids that were assigned but unchecked → send to unassign API. */
export function unassignDiffFromKept(
  detail: TeacherDetail,
  kept: TeacherUnassignSelection,
): TeacherUnassignSelection {
  const keepSub = new Set(kept.subjectIds);
  const keepCls = new Set(kept.classIds);
  const keepStu = new Set(kept.studentIds);
  return {
    subjectIds: detail.subjects.map((s) => s.id).filter((id) => !keepSub.has(id)),
    classIds: detail.classes.map((c) => c.id).filter((id) => !keepCls.has(id)),
    studentIds: detail.students.map((s) => s.id).filter((id) => !keepStu.has(id)),
  };
}

export function hasUnassignItems(selection: TeacherUnassignSelection): boolean {
  return (
    selection.subjectIds.length > 0 ||
    selection.classIds.length > 0 ||
    selection.studentIds.length > 0
  );
}

function assignmentRowsFromDetail(detail: TeacherDetail): TeacherGradeSubjects[] {
  const fromApi = detail.assignments?.filter((a) => a.grade || a.subjects);
  if (fromApi && fromApi.length > 0) return fromApi;
  const subjects = detail.subject?.trim() || "—";
  if (detail.classes.length === 0) {
    return subjects !== "—" ? [{ grade: "—", subjects }] : [];
  }
  return detail.classes.map((c) => ({
    grade: classLabel(c),
    subjects,
  }));
}

function subjectsLabelForClass(detail: TeacherDetail, item: TeacherClassBrief) {
  const label = classLabel(item);
  const row = assignmentRowsFromDetail(detail).find((a) => a.grade === label);
  return row?.subjects?.trim() || detail.subject?.trim() || "—";
}

/** Match comma-joined subject labels to teacher subject briefs. */
function resolveSubjects(
  detail: TeacherDetail,
  label: string,
): TeacherSubjectBrief[] {
  const raw = label.trim();
  if (!raw || raw === "—") return [];
  const keys = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const matched = detail.subjects.filter((s) => keys.has(s.name.trim().toLowerCase()));
  // Fallback: if labels don't resolve (stale names), show all assigned subjects.
  return matched.length > 0 ? matched : detail.subjects;
}

function SubjectsCell({
  subjects,
  label,
  selectable,
  selection,
  onSelectionChange,
  disabled,
}: {
  subjects: TeacherSubjectBrief[];
  label: string;
  selectable: boolean;
  selection: TeacherUnassignSelection;
  onSelectionChange: (next: TeacherUnassignSelection) => void;
  disabled?: boolean;
}) {
  if (!selectable) {
    return (
      <span className="min-w-0 break-words text-sm text-muted-foreground">
        {subjects.length > 0 ? subjects.map((s) => s.name).join(", ") : label}
      </span>
    );
  }
  if (subjects.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      {subjects.map((subject) => (
        <label
          key={subject.id}
          className="flex cursor-pointer items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selection.subjectIds.includes(subject.id)}
            disabled={disabled}
            onCheckedChange={(v) =>
              onSelectionChange({
                ...selection,
                subjectIds: toggleId(selection.subjectIds, subject.id, v === true),
              })
            }
            aria-label={`Keep ${subject.name} assigned`}
          />
          <span className="whitespace-nowrap text-sm text-foreground">{subject.name}</span>
        </label>
      ))}
    </div>
  );
}

function GradeSubjectsSection({
  detail,
  selectable,
  selection,
  onSelectionChange,
  disabled,
}: {
  detail: TeacherDetail;
  selectable: boolean;
  selection: TeacherUnassignSelection;
  onSelectionChange: (next: TeacherUnassignSelection) => void;
  disabled?: boolean;
}) {
  const gridClass = selectable
    ? "grid grid-cols-[auto_minmax(8rem,1fr)_minmax(8rem,1.4fr)] gap-x-3"
    : "grid grid-cols-[minmax(8rem,1fr)_minmax(7rem,1.2fr)] gap-x-3";

  if (detail.classes.length > 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/70">
        <div className={`${gridClass} border-b border-border/70 bg-muted/30 px-3 py-2`}>
          {selectable ? <span className="w-4" aria-hidden /> : null}
          <span className="text-xs font-semibold text-muted-foreground">Grade</span>
          <span className="text-xs font-semibold text-muted-foreground">Subjects</span>
        </div>
        <div className="divide-y divide-border/60">
          {detail.classes.map((item) => {
            const label = subjectsLabelForClass(detail, item);
            const subjects = resolveSubjects(detail, label);
            return (
              <div key={item.id} className={`${gridClass} items-center px-3 py-2.5`}>
                {selectable ? (
                  <Checkbox
                    checked={selection.classIds.includes(item.id)}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      onSelectionChange({
                        ...selection,
                        classIds: toggleId(selection.classIds, item.id, v === true),
                      })
                    }
                    aria-label={`Keep class ${classLabel(item)} assigned`}
                  />
                ) : null}
                <span className="text-sm font-medium text-foreground">
                  {classLabel(item)}
                </span>
                <SubjectsCell
                  subjects={subjects}
                  label={label}
                  selectable={selectable}
                  selection={selection}
                  onSelectionChange={onSelectionChange}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const rows = assignmentRowsFromDetail(detail);
  if (rows.length === 0 && detail.subjects.length === 0) {
    return <EmptyLine text="No grades or subjects assigned." />;
  }

  // Subjects only (no classes): one row so edit can still uncheck subjects in-column.
  const displayRows =
    rows.length > 0
      ? rows
      : [{ grade: "—", subjects: detail.subjects.map((s) => s.name).join(", ") }];

  return (
    <div className="overflow-hidden rounded-lg border border-border/70">
      <div className="grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,1.4fr)] gap-x-3 border-b border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Grade</span>
        <span className="text-xs font-semibold text-muted-foreground">Subjects</span>
      </div>
      <div className="divide-y divide-border/60">
        {displayRows.map((row, i) => {
          const subjects = resolveSubjects(detail, row.subjects);
          return (
            <div
              key={`${row.grade}-${i}`}
              className="grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,1.4fr)] gap-x-3 items-center px-3 py-2.5"
            >
              <span className="text-sm font-medium text-foreground">{row.grade}</span>
              <SubjectsCell
                subjects={subjects}
                label={row.subjects}
                selectable={selectable}
                selection={selection}
                onSelectionChange={onSelectionChange}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TeacherAssignmentsPanel({
  detail,
  loading,
  selectable,
  selection,
  onSelectionChange,
  disabled,
}: TeacherAssignmentsPanelProps) {
  if (loading && !detail) {
    return <p className="text-sm text-muted-foreground">Loading assignments…</p>;
  }
  if (!detail) return null;

  return (
    <div className="space-y-4">
      {selectable ? (
        <p className="text-xs text-muted-foreground">
          Uncheck a grade to remove that class, or uncheck subjects in the Subjects column to
          unassign them, then Save.
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="h-4 w-4 text-primary" />
          Grade &amp; subjects
        </h3>
        <GradeSubjectsSection
          detail={detail}
          selectable={selectable}
          selection={selection}
          onSelectionChange={onSelectionChange}
          disabled={disabled}
        />
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <GraduationCap className="h-4 w-4 text-primary" />
          Assigned students
        </h3>
        {detail.students.length === 0 ? (
          <EmptyLine text="No students matched to this teacher’s classes." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.students.map((item) => (
              <StudentRow
                key={item.id}
                item={item}
                selectable={selectable}
                checked={selection.studentIds.includes(item.id)}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onSelectionChange({
                    ...selection,
                    studentIds: toggleId(selection.studentIds, item.id, checked),
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
