import type { StudentRecord } from "@/api/types";
import type {
  LearningType,
  PasswordStatus,
  SchoolStudentFilters,
  SchoolStudentRow,
} from "@/modules/organization/types/org-student-profile";

function mapPasswordStatus(value: string | null | undefined): PasswordStatus {
  if (value === "Logged In") return "Logged In";
  if (value === "Generated" || value === "Set") return "Generated";
  return "Not Set";
}

export function mapStudentRecordToRow(student: StudentRecord): SchoolStudentRow {
  const learningType = (
    student.learning_type === "Self Learning" ? "Self Learning" : "Teacher Guided"
  ) as LearningType;
  return {
    id: String(student.id),
    fullName: student.full_name,
    userId: student.user_id,
    rollNumber: student.user_id,
    parentPhone: student.phone ?? undefined,
    parentEmail: student.email,
    grade: student.grade ?? "—",
    section: student.section ?? "—",
    curriculum: student.curriculum ?? "—",
    learningType,
    learningTeacher: student.learning_teacher,
    passwordStatus: mapPasswordStatus(student.password_status),
    status: student.is_active ? "Active" : "Inactive",
    record: student,
  };
}

export function studentFiltersToApi(filters: SchoolStudentFilters) {
  return {
    q: filters.search.trim() || undefined,
    grade: filters.grade,
    section: filters.section,
    curriculum: filters.curriculum,
    learning_type: filters.learningType,
  };
}
