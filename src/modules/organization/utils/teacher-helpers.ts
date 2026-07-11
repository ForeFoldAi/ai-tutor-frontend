import type { ApiUser } from "@/api/types";
import type { TeacherFilters, TeacherRow } from "@/modules/organization/types/teacher-profile";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

const SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"];

export const DEMO_TEACHERS: TeacherRow[] = buildDemoTeachers(85);

function buildDemoTeachers(count: number): TeacherRow[] {
  const firstNames = ["Anita", "Ravi", "Sneha", "Kiran", "Meera", "Arjun", "Divya", "Rohan", "Neha", "Vikram"];
  const lastNames = ["Verma", "Kumar", "Iyer", "Patel", "Singh", "Sharma", "Reddy", "Nair", "Gupta", "Desai"];
  const subjects = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"];
  const gradeRanges = ["6-8", "6-10", "7-9", "8-10", "6-9"];

  return Array.from({ length: count }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const fullName = `${first} ${last}`;
    const userId = `${first}.${last}`.toLowerCase();
    const day = Math.max(1, 28 - (index % 20));
    return {
      id: `demo-${index + 1}`,
      fullName,
      userId,
      email: `${userId}@school.edu`,
      subject: subjects[index % subjects.length],
      grades: gradeRanges[index % gradeRanges.length],
      assignedStudents: 24 + (index % 35),
      status: index % 9 === 0 ? "Inactive" : "Active",
      lastLogin: `May ${day}, 2026`,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    } satisfies TeacherRow;
  });
}

function gradesLabel(tutor: ApiUser) {
  const grades =
    tutor.teaching_classes
      ?.map((item) => Number.parseInt(item.grade, 10))
      .filter((value) => !Number.isNaN(value)) ?? [];
  if (grades.length === 0) return "—";
  const min = Math.min(...grades);
  const max = Math.max(...grades);
  return min === max ? String(min) : `${min}-${max}`;
}

function formatLastLogin(iso: string) {
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

function userIdFromEmail(email: string) {
  return email.split("@")[0] ?? email;
}

function assignedStudentsEstimate(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash += id.charCodeAt(i);
  return 24 + (hash % 40);
}

export function mapApiUserToTeacherRow(tutor: ApiUser, index: number): TeacherRow {
  return {
    id: tutor.id,
    fullName: tutor.full_name,
    userId: userIdFromEmail(tutor.email),
    email: tutor.email,
    subject: tutor.teaching_board?.trim() || SUBJECTS[index % SUBJECTS.length],
    grades: gradesLabel(tutor),
    assignedStudents: assignedStudentsEstimate(tutor.id),
    status: tutor.is_active ? "Active" : "Inactive",
    lastLogin: formatLastLogin(tutor.updated_at),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    source: tutor,
  };
}

export function mergeTeachers(apiTutors: ApiUser[]): TeacherRow[] {
  if (apiTutors.length === 0) return DEMO_TEACHERS;
  return apiTutors.map(mapApiUserToTeacherRow);
}

export function teacherRowFromDetails(
  row: { full_name: string; phone: string; email: string },
  index: number,
): TeacherRow {
  const email = row.email.trim();
  return {
    id: `local-${Date.now()}-${index}`,
    fullName: row.full_name.trim(),
    userId: userIdFromEmail(email),
    email,
    phone: row.phone.trim(),
    subject: "—",
    grades: "—",
    assignedStudents: 0,
    status: "Active",
    lastLogin: "—",
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export function filterTeachers(teachers: TeacherRow[], filters: TeacherFilters) {
  const search = filters.search.trim().toLowerCase();
  return teachers.filter((teacher) => {
    const matchesSearch =
      !search ||
      teacher.fullName.toLowerCase().includes(search) ||
      teacher.userId.toLowerCase().includes(search) ||
      teacher.email?.toLowerCase().includes(search) ||
      teacher.phone?.toLowerCase().includes(search) ||
      teacher.subject.toLowerCase().includes(search);
    const matchesSubject = filters.subject === "all" || teacher.subject === filters.subject;
    const matchesStatus = filters.status === "all" || teacher.status === filters.status;
    return matchesSearch && matchesSubject && matchesStatus;
  });
}

export function teacherInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
