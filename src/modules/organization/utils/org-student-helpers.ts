import type { ApiUser } from "@/api/types";
import type {
  LearningType,
  PasswordStatus,
  SchoolStudentFilters,
  SchoolStudentRow,
} from "@/modules/organization/types/org-student-profile";

const CURRICULA = ["CBSE", "ICSE", "State Board"];
const TEACHERS = ["Anita Verma", "Ravi Kumar", "Sneha Iyer"];
const SECTIONS = ["A", "B", "C"];

export const DEMO_SCHOOL_STUDENTS: SchoolStudentRow[] = buildDemoStudents(1248);

function buildDemoStudents(count: number): SchoolStudentRow[] {
  const firstNames = ["Rahul", "Priya", "Aarav", "Kiran", "Meera", "Arjun", "Divya", "Rohan", "Neha", "Vikram"];
  const lastNames = ["Sharma", "Reddy", "Patel", "Kumar", "Singh", "Iyer", "Gupta", "Nair", "Desai", "Verma"];

  return Array.from({ length: count }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const grade = String(6 + (index % 3));
    const section = SECTIONS[index % SECTIONS.length];
    const learningType: LearningType = index % 4 === 0 ? "Self Learning" : "Teacher Guided";
    const teacher = learningType === "Teacher Guided" ? TEACHERS[index % 3] : null;

    return {
      id: `demo-student-${index + 1}`,
      fullName: `${first} ${last}`,
      userId: `${first.toLowerCase()}.${grade}${section.toLowerCase()}`,
      rollNumber: String(6000 + index + 1),
      grade,
      section,
      curriculum: CURRICULA[index % CURRICULA.length],
      learningType,
      learningTeacher: teacher,
      passwordStatus: index % 7 === 0 ? "Not Set" : "Set",
    } satisfies SchoolStudentRow;
  });
}

function userIdFromStudent(student: ApiUser) {
  const tc = student.teaching_classes?.[0];
  const grade = tc?.grade ?? "6";
  const section = (tc?.sections?.[0] ?? "a").toLowerCase();
  const first = student.full_name.split(" ")[0]?.toLowerCase() ?? "student";
  return `${first}.${grade}${section}`;
}

export function mapApiUserToSchoolStudent(student: ApiUser, index: number): SchoolStudentRow {
  const tc = student.teaching_classes?.[0];
  const learningType: LearningType = index % 4 === 0 ? "Self Learning" : "Teacher Guided";

  return {
    id: student.id,
    fullName: student.full_name,
    userId: userIdFromStudent(student),
    grade: tc?.grade ?? "—",
    section: tc?.sections?.[0] ?? "—",
    curriculum: student.teaching_board?.trim() || "CBSE",
    learningType,
    learningTeacher: learningType === "Teacher Guided" ? TEACHERS[index % 3] : null,
    passwordStatus: student.is_verified ? "Set" : "Not Set",
    source: student,
  };
}

export function mergeSchoolStudents(apiStudents: ApiUser[]): SchoolStudentRow[] {
  if (apiStudents.length === 0) return DEMO_SCHOOL_STUDENTS;
  return apiStudents.map(mapApiUserToSchoolStudent);
}

export function studentRowFromDetails(
  row: {
    roll_number: string;
    student_name: string;
    parent_phone: string;
    parent_email: string;
  },
  index: number,
): SchoolStudentRow {
  const rollNumber = row.roll_number.trim();
  return {
    id: `local-${Date.now()}-${index}`,
    fullName: row.student_name.trim(),
    userId: rollNumber,
    rollNumber,
    parentPhone: row.parent_phone.trim(),
    parentEmail: row.parent_email.trim(),
    grade: "—",
    section: "—",
    curriculum: "—",
    learningType: "Teacher Guided",
    learningTeacher: null,
    passwordStatus: "Not Set",
  };
}

export function filterSchoolStudents(students: SchoolStudentRow[], filters: SchoolStudentFilters) {
  const q = filters.search.trim().toLowerCase();
  return students.filter((student) => {
    const matchesSearch =
      !q ||
      student.fullName.toLowerCase().includes(q) ||
      student.userId.toLowerCase().includes(q) ||
      student.rollNumber?.toLowerCase().includes(q) ||
      student.parentPhone?.toLowerCase().includes(q) ||
      student.parentEmail?.toLowerCase().includes(q);
    const matchesGrade = filters.grade === "all" || student.grade === filters.grade;
    const matchesSection = filters.section === "all" || student.section === filters.section;
    const matchesCurriculum =
      filters.curriculum === "all" || student.curriculum === filters.curriculum;
    const matchesLearningType =
      filters.learningType === "all" || student.learningType === filters.learningType;
    return matchesSearch && matchesGrade && matchesSection && matchesCurriculum && matchesLearningType;
  });
}
