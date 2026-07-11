import type {
  OnboardingProgressItem,
  PendingItem,
  SchoolDashboardMetrics,
} from "@/modules/organization/types/dashboard";

export const DEMO_SCHOOL_METRICS: SchoolDashboardMetrics = {
  totalStudents: 1248,
  totalTeachers: 86,
  teacherGuidedStudents: 932,
  selfLearningStudents: 316,
  activeThisWeek: 1102,
  studentsTrend: "28 this week",
  teachersTrend: "5 this week",
  activeTrend: "18% from last week",
  teacherGuidedPercent: "75% of students",
  selfLearningPercent: "25% of students",
};

export const DEMO_ONBOARDING_PROGRESS: OnboardingProgressItem[] = [
  { id: "1", label: "Teachers Uploaded", completed: 86, total: 86, percent: 100 },
  { id: "2", label: "Students Uploaded", completed: 1248, total: 1248, percent: 100 },
  { id: "3", label: "Credentials Generated", completed: 1248, total: 1248, percent: 100 },
  { id: "4", label: "Students Assigned", completed: 936, total: 1248, percent: 75 },
];

export const DEMO_PENDING_ITEMS: PendingItem[] = [
  {
    id: "1",
    label: "Pending Teacher Assignments",
    count: 32,
    severity: "warning",
    icon: "assignments",
  },
  {
    id: "2",
    label: "Credentials Not Shared",
    count: 74,
    severity: "warning",
    icon: "credentials",
  },
  {
    id: "3",
    label: "Students Without Class Mapping",
    count: 128,
    severity: "danger",
    icon: "mapping",
  },
];

export function buildMetricsFromApi(
  studentCount: number,
  tutorCount: number,
  activeUsers: number,
): SchoolDashboardMetrics {
  const guided = studentCount ? Math.round(studentCount * 0.75) : 0;
  const selfLearning = studentCount - guided;

  return {
    totalStudents: studentCount || DEMO_SCHOOL_METRICS.totalStudents,
    totalTeachers: tutorCount || DEMO_SCHOOL_METRICS.totalTeachers,
    teacherGuidedStudents: guided || DEMO_SCHOOL_METRICS.teacherGuidedStudents,
    selfLearningStudents: selfLearning || DEMO_SCHOOL_METRICS.selfLearningStudents,
    activeThisWeek: activeUsers || DEMO_SCHOOL_METRICS.activeThisWeek,
    studentsTrend: DEMO_SCHOOL_METRICS.studentsTrend,
    teachersTrend: DEMO_SCHOOL_METRICS.teachersTrend,
    activeTrend: DEMO_SCHOOL_METRICS.activeTrend,
    teacherGuidedPercent: studentCount
      ? `${Math.round((guided / studentCount) * 100)}% of students`
      : DEMO_SCHOOL_METRICS.teacherGuidedPercent,
    selfLearningPercent: studentCount
      ? `${Math.round((selfLearning / studentCount) * 100)}% of students`
      : DEMO_SCHOOL_METRICS.selfLearningPercent,
  };
}

export function buildOnboardingFromApi(
  studentCount: number,
  tutorCount: number,
): OnboardingProgressItem[] {
  if (!studentCount && !tutorCount) return DEMO_ONBOARDING_PROGRESS;

  const teachersTotal = tutorCount || 86;
  const studentsTotal = studentCount || 1248;
  const assigned = Math.round(studentsTotal * 0.75);

  return [
    {
      id: "1",
      label: "Teachers Uploaded",
      completed: teachersTotal,
      total: teachersTotal,
      percent: 100,
    },
    {
      id: "2",
      label: "Students Uploaded",
      completed: studentsTotal,
      total: studentsTotal,
      percent: 100,
    },
    {
      id: "3",
      label: "Credentials Generated",
      completed: studentsTotal,
      total: studentsTotal,
      percent: 100,
    },
    {
      id: "4",
      label: "Students Assigned",
      completed: assigned,
      total: studentsTotal,
      percent: studentsTotal ? Math.round((assigned / studentsTotal) * 100) : 75,
    },
  ];
}
