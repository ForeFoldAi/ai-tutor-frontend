import {
  LayoutDashboard,
  BookOpen,
  Video,
  FileText,
  BarChart3,
  Settings,
  Users,
  GraduationCap,
  Calendar,
  Sparkles,
  NotebookPen,
  UploadCloud,
  CreditCard,
  Database,
  LayoutGrid,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { UserRole, type UserRoleType } from "@/types/schema";

export type AppNavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  imageIcon?: string;
};

const studentMenuItems: AppNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Learning", url: "/my-learning", icon: BookOpen },
  { title: "AI Tutor", url: "/ai-learning-studio", imageIcon: "/icon.png" },
  { title: "Session", url: "/live-classes", icon: Video },
  { title: "Assignments", url: "/assignments", icon: FileText },
];

/** Public signup students — no school/teacher, so no Session/Assignments. */
const individualStudentMenuItems: AppNavItem[] = studentMenuItems.filter(
  (item) => item.url !== "/live-classes" && item.url !== "/assignments",
);

/** School-tagged tutors — no Classes/Credentials (school admin owns those). */
const schoolTutorMenuItems: AppNavItem[] = [
  { title: "Dashboard", url: "/tutor/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/tutor/students", icon: Users },
  { title: "Sessions", url: "/tutor/sessions", icon: Calendar },
  { title: "Lesson Planner", url: "/tutor/lesson-planner", icon: NotebookPen },
  { title: "Progress Analytics", url: "/tutor/progress", icon: BarChart3 },
  { title: "AI Insights", url: "/tutor/ai-insights", icon: Sparkles },
];

/** Individual tutors (no school) — manage own Classes + Credentials. */
const individualTutorMenuItems: AppNavItem[] = [
  { title: "Dashboard", url: "/tutor/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/classes", icon: LayoutGrid },
  { title: "Students", url: "/tutor/students", icon: Users },
  { title: "Credentials", url: "/credentials", icon: KeyRound },
  { title: "Sessions", url: "/tutor/sessions", icon: Calendar },
  { title: "Lesson Planner", url: "/tutor/lesson-planner", icon: NotebookPen },
  { title: "Progress Analytics", url: "/tutor/progress", icon: BarChart3 },
  { title: "AI Insights", url: "/tutor/ai-insights", icon: Sparkles },
];

const schoolAdminMenuItems: AppNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/classes", icon: LayoutGrid },
  { title: "Teachers", url: "/teachers", icon: Users },
  { title: "Students", url: "/students", icon: GraduationCap },
  { title: "Credentials", url: "/credentials", icon: KeyRound },
  { title: "Settings", url: "/school-settings", icon: Settings },
];

const masterAdminMenuItems: AppNavItem[] = [
  { title: "Dashboard", url: "/master-admin/dashboard", icon: LayoutDashboard },
  { title: "Schools", url: "/master-admin/schools", icon: GraduationCap },
  { title: "Users", url: "/master-admin/users", icon: Users },
  { title: "Boards & Syllabus", url: "/master-admin/boards-syllabus", icon: BookOpen },
  { title: "Textbook Uploads", url: "/master-admin/textbook-uploads", icon: UploadCloud },
  { title: "AI Embeddings", url: "/master-admin/ai-embeddings", icon: Database },
  { title: "Subscriptions", url: "/master-admin/subscriptions", icon: CreditCard },
  { title: "Reports", url: "/master-admin/reports", icon: BookOpen },
  { title: "Settings", url: "/master-admin/settings", icon: Settings },
];

export function isIndividualTutor(
  role?: string | null,
  schoolId?: string | null,
): boolean {
  return role === UserRole.TUTOR && (schoolId == null || schoolId === "");
}

/** Public individual student: no school and not onboarded by a tutor. */
export function isIndividualStudent(
  role?: string | null,
  schoolId?: string | null,
  createdBy?: string | null,
): boolean {
  return (
    role === UserRole.STUDENT &&
    (schoolId == null || schoolId === "") &&
    (createdBy == null || createdBy === "")
  );
}

export function getAppNavItems(
  role?: UserRoleType | string | null,
  schoolId?: string | null,
  createdBy?: string | null,
): AppNavItem[] {
  switch (role) {
    case UserRole.TUTOR:
      return isIndividualTutor(role, schoolId) ? individualTutorMenuItems : schoolTutorMenuItems;
    case UserRole.SCHOOL_ADMIN:
      return schoolAdminMenuItems;
    case UserRole.MASTER_ADMIN:
      return masterAdminMenuItems;
    default:
      return isIndividualStudent(role, schoolId, createdBy)
        ? individualStudentMenuItems
        : studentMenuItems;
  }
}

export function isAppNavActive(location: string, url: string): boolean {
  return location === url || location.startsWith(`${url}/`);
}
