import type { ApiUser, TeacherRecord } from "@/api/types";
import type { TeacherFilters, TeacherRow } from "@/modules/organization/types/teacher-profile";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function formatLastLogin(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function mapApiUsersToTeacherRows(apiTutors: ApiUser[]): TeacherRow[] {
  return apiTutors.map((tutor, index) => ({
    id: String(tutor.id),
    fullName: tutor.full_name,
    userId: tutor.email.split("@", 1)[0] ?? tutor.email,
    email: tutor.email,
    phone: tutor.phone ?? undefined,
    // teaching_board is curriculum/board — not subject (subjects live on teaching_subjects).
    subject: "—",
    grades: "—",
    assignments: [],
    assignedStudents: 0,
    status: tutor.is_active ? "Active" : "Inactive",
    lastLogin: formatLastLogin(tutor.updated_at),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  }));
}

function assignmentsFromTeacher(teacher: TeacherRecord): { grade: string; subjects: string }[] {
  const fromApi = teacher.assignments?.filter((a) => a.grade || a.subjects);
  if (fromApi && fromApi.length > 0) {
    return fromApi.map((a) => ({
      grade: a.grade?.trim() || "—",
      subjects: a.subjects?.trim() || "—",
    }));
  }
  // Fallback when list payload has only flat labels (older API).
  const subject = teacher.subject?.trim() || "—";
  const grades = (teacher.grades ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  if (grades.length === 0) {
    return subject !== "—" ? [{ grade: "—", subjects: subject }] : [];
  }
  return grades.map((grade) => ({ grade, subjects: subject }));
}

export function mapTeacherToRow(teacher: TeacherRecord, index: number): TeacherRow {
  return {
    id: String(teacher.id),
    fullName: teacher.full_name,
    userId: teacher.user_id,
    email: teacher.email,
    phone: teacher.phone ?? undefined,
    subject: teacher.subject?.trim() || "—",
    grades: teacher.grades?.trim() || "—",
    assignments: assignmentsFromTeacher(teacher),
    assignedStudents: teacher.assigned_students ?? 0,
    status: teacher.is_active ? "Active" : "Inactive",
    lastLogin: formatLastLogin(teacher.last_login),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    source: teacher,
  };
}

export function teacherFiltersToApi(filters: TeacherFilters) {
  return {
    q: filters.search.trim() || undefined,
    subject: filters.subject !== "all" ? filters.subject : undefined,
    status:
      filters.status === "Active"
        ? ("active" as const)
        : filters.status === "Inactive"
          ? ("inactive" as const)
          : undefined,
  };
}

export function teacherInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
