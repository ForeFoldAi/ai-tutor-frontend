import type {
  RiskLevel,
  StudentFilters,
  TutorStudentProfile,
  TutorStudentProfileApi,
  TutorStudentRow,
  TutorStudentRowApi,
} from "@/modules/tutor/types/student-profile";

export function mapTutorStudentRow(row: TutorStudentRowApi): TutorStudentRow {
  const key = (row.risk_level || "Not Started").trim().toLowerCase().replace(/_/g, " ");
  const riskLevel: RiskLevel =
    key === "not started"
      ? "Not Started"
      : key === "high"
        ? "High"
        : key === "medium"
          ? "Medium"
          : key === "low"
            ? "Low"
            : "Not Started";
  return {
    id: String(row.id),
    slug: row.slug || String(row.id),
    fullName: row.full_name,
    grade: row.grade ?? "",
    section: row.section ?? "",
    curriculum: row.curriculum ?? "",
    gradeLabel: row.grade_label || "—",
    subjects: row.subjects ?? [],
    subject: (row.subjects ?? []).join(", ") || "—",
    completion: row.completion ?? 0,
    riskLevel,
    lastActive: row.last_active ?? "Never",
    userId: row.user_id,
    isActive: row.is_active,
  };
}

export function mapTutorStudentProfile(api: TutorStudentProfileApi): TutorStudentProfile {
  const row = mapTutorStudentRow(api);
  return {
    ...row,
    currentTopic: api.current_topic ?? row.subject,
    overallProgress: api.overall_progress ?? row.completion,
    strengths: api.strengths ?? [],
    needsImprovement: api.needs_improvement ?? [],
    aiActivity: api.ai_activity ?? [],
    averageQuizScore: api.average_quiz_score ?? 0,
    quizTrend: api.quiz_trend ?? 0,
    recentQuizzes: api.recent_quizzes ?? [],
    assignments: (api.assignments ?? []).map((a) => ({
      ...a,
      status: a.status as TutorStudentProfile["assignments"][number]["status"],
    })),
    teacherNotes: api.teacher_notes ?? "",
    notesUpdated: api.notes_updated ?? "",
  };
}

export function filterStudents(students: TutorStudentRow[], filters: StudentFilters) {
  const query = filters.search.trim().toLowerCase();

  return students.filter((student) => {
    if (filters.grade !== "all" && student.grade !== filters.grade) return false;
    if (filters.subject !== "all") {
      const want = filters.subject.toLowerCase();
      if (!student.subjects.some((s) => s.toLowerCase() === want)) return false;
    }
    if (filters.riskLevel !== "all" && student.riskLevel !== filters.riskLevel) return false;
    if (query && !student.fullName.toLowerCase().includes(query) && !student.userId.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

export function completionBarClass(completion: number) {
  if (completion >= 70) return "bg-emerald-500";
  if (completion >= 45) return "bg-amber-500";
  return "bg-rose-500";
}

export function riskBadgeClass(risk: RiskLevel) {
  switch (risk) {
    case "Not Started":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export function assignmentStatusClass(status: TutorStudentProfile["assignments"][number]["status"]) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "In Progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}
