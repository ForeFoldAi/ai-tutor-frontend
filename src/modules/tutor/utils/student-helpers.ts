import type { ApiUser } from "@/api/types";
import type {
  RiskLevel,
  StudentFilters,
  TutorStudentProfile,
  TutorStudentRow,
} from "@/modules/tutor/types/student-profile";
import { DEMO_TUTOR_STUDENTS } from "@/modules/tutor/data/demo-students";

const SUBJECTS = ["Mathematics", "Science", "English"] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function slugifyName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function riskFromCompletion(completion: number): RiskLevel {
  if (completion >= 70) return "Low";
  if (completion >= 45) return "Medium";
  return "High";
}

function mapApiUserToRow(user: ApiUser, index: number): TutorStudentRow {
  const grade = user.teaching_classes?.[0]?.grade ?? "6";
  const section = user.teaching_classes?.[0]?.sections?.[0] ?? "A";
  const hash = hashString(user.id);
  const completion = 30 + (hash % 65);
  const subject = SUBJECTS[hash % SUBJECTS.length];

  return {
    id: user.id,
    slug: slugifyName(user.full_name),
    fullName: user.full_name,
    grade,
    section,
    subject,
    completion,
    riskLevel: riskFromCompletion(completion),
    lastActive: user.is_active ? "Recently active" : "Inactive",
    userId: user.email.split("@")[0] ?? slugifyName(user.full_name).replace(/-/g, "."),
  };
}

function buildProfileFromRow(row: TutorStudentRow): TutorStudentProfile {
  const demoMatch = DEMO_TUTOR_STUDENTS.find(
    (student) => student.slug === row.slug || student.fullName === row.fullName,
  );
  if (demoMatch) return { ...demoMatch, ...row, id: row.id };

  return {
    ...row,
    currentTopic: row.subject,
    overallProgress: row.completion,
    strengths: [{ name: row.subject, score: Math.min(row.completion + 5, 95) }],
    needsImprovement: [{ name: "Practice Topics", score: Math.max(row.completion - 20, 15) }],
    aiActivity: [{ title: `AI session on ${row.subject}`, when: row.lastActive }],
    averageQuizScore: Math.max(row.completion - 10, 20),
    quizTrend: row.riskLevel === "Low" ? 8 : row.riskLevel === "Medium" ? 2 : -6,
    recentQuizzes: [{ name: `${row.subject} Quiz`, score: row.completion }],
    assignments: [
      {
        title: `${row.subject} Worksheet`,
        due: "May 18, 2024",
        status: row.completion >= 70 ? "Completed" : row.completion >= 45 ? "In Progress" : "Not Started",
      },
    ],
    teacherNotes: `${row.fullName} is assigned to Grade ${row.grade} Section ${row.section}. Monitor ${row.subject} progress regularly.`,
    notesUpdated: "Recently",
  };
}

export function mergeTutorStudents(apiStudents: ApiUser[]): TutorStudentRow[] {
  const apiRows = apiStudents.map(mapApiUserToRow);
  if (apiRows.length > 0) return apiRows;
  return DEMO_TUTOR_STUDENTS;
}

export function getStudentProfile(students: TutorStudentRow[], slug: string): TutorStudentProfile | null {
  const row = students.find((student) => student.slug === slug);
  if (!row) {
    const demo = DEMO_TUTOR_STUDENTS.find((student) => student.slug === slug);
    return demo ?? null;
  }
  return buildProfileFromRow(row);
}

export function filterStudents(students: TutorStudentRow[], filters: StudentFilters) {
  const query = filters.search.trim().toLowerCase();

  return students.filter((student) => {
    if (filters.grade !== "all" && student.grade !== filters.grade) return false;
    if (filters.subject !== "all" && student.subject !== filters.subject) return false;
    if (filters.riskLevel !== "all" && student.riskLevel !== filters.riskLevel) return false;
    if (query && !student.fullName.toLowerCase().includes(query)) return false;
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
