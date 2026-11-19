import type { SchoolClassRecord, SchoolSubjectRecord } from "@/api/types";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";

const ICON_COLORS = [
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-sky-100 text-sky-600",
  "bg-amber-100 text-amber-600",
  "bg-rose-100 text-rose-600",
];

export function mapSubjectToItem(subject: SchoolSubjectRecord): SubjectItem {
  return {
    id: String(subject.id),
    name: subject.name,
    code: subject.code,
    curriculums: [],
    gradeRange: "—",
    active: subject.is_active,
  };
}

export function mapClassToOverview(schoolClass: SchoolClassRecord, index: number): ClassOverviewItem {
  return {
    id: String(schoolClass.id),
    grade: schoolClass.grade,
    section: schoolClass.section,
    students: schoolClass.students,
    teachers: schoolClass.teachers,
    curriculums: [schoolClass.curriculum],
    iconClassName: ICON_COLORS[index % ICON_COLORS.length],
  };
}

export function classRowOptionLabel(grade: string, section: string, curriculum: string) {
  return `Grade ${grade} · Section ${section} · ${curriculum}`;
}
