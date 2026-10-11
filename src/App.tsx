import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { useLiveQuerySync } from "@/hooks/use-live-query-sync";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import SignupPage from "@/pages/signup";
import PendingApprovalPage from "@/pages/pending-approval";
import { applyRouteMeta } from "@/seo/site";
import { getDashboardPath } from "@/lib/dashboard-routes";
import { isIndividualStudent } from "@/lib/app-nav-items";
import { UserRole, type UserRoleType } from "@/types/schema";

// Logged-in app is split per route so public pages (home, login, signup) don't download it.
const AppLayout = lazy(() => import("@/components/app-layout").then((m) => ({ default: m.AppLayout })));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AILearningStudioPage = lazy(() => import("@/pages/ai-learning-studio"));
const MyLearningPage = lazy(() => import("@/pages/my-learning"));
const AITutorPage = lazy(() => import("@/pages/ai-tutor"));
const AiTutorAgentPage = lazy(() => import("@/pages/ai-tutor-agent"));
const AskAiTutorPage = lazy(() => import("@/pages/ask-ai-tutor"));
const AssignmentsPage = lazy(() => import("@/pages/assignments"));
const LiveClassesPage = lazy(() => import("@/pages/live-classes"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const UsersPage = lazy(() => import("@/pages/users"));
const SyllabusPage = lazy(() => import("@/pages/syllabus"));
const VoiceTutorPage = lazy(() => import("@/pages/tutor/voice-tutor"));
const MasterAdminDashboardModulePage = lazy(() => import("@/modules/master-admin/pages/dashboard-page"));
const MasterAdminSchoolsPage = lazy(() => import("@/modules/master-admin/pages/schools-page"));
const MasterAdminUsersPage = lazy(() => import("@/modules/master-admin/pages/users-page"));
const MasterAdminBoardsSyllabusPage = lazy(() => import("@/modules/master-admin/pages/boards-syllabus-page"));
const MasterAdminTextbookUploadsPage = lazy(() => import("@/modules/master-admin/pages/textbook-uploads-page"));
const MasterAdminAIEmbeddingsPage = lazy(() => import("@/modules/master-admin/pages/ai-embeddings-page"));
const MasterAdminSubscriptionsPage = lazy(() => import("@/modules/master-admin/pages/subscriptions-page"));
const ManageTutorsPage = lazy(() => import("@/modules/master-admin/pages/manage-tutors-page"));
const ManageStudentsPage = lazy(() => import("@/modules/master-admin/pages/manage-students-page"));
const MasterAdminReportsPage = lazy(() => import("@/modules/master-admin/pages/reports-page"));
const MasterAdminSettingsPage = lazy(() => import("@/modules/master-admin/pages/settings-page"));
const OrganizationManageTutorsPage = lazy(() => import("@/modules/organization/pages/manage-tutors-page"));
const OrganizationManageStudentsPage = lazy(() => import("@/modules/organization/pages/manage-students-page"));
const OrganizationManageClassesPage = lazy(() => import("@/modules/organization/pages/manage-classes-page"));
const OrganizationCredentialsPage = lazy(() => import("@/modules/organization/pages/credentials-page"));
const OrganizationSettingsPage = lazy(() => import("@/modules/organization/pages/settings-page"));
const TutorDashboardModulePage = lazy(() => import("@/modules/tutor/pages/dashboard-page"));
const TutorAssignedStudentsPage = lazy(() => import("@/modules/tutor/pages/assigned-students-page"));
const TutorStudentProfilePage = lazy(() => import("@/modules/tutor/pages/student-profile-page"));
const TutorSessionManagementPage = lazy(() => import("@/modules/tutor/pages/session-management-page"));
const TutorLessonPlannerPage = lazy(() => import("@/modules/tutor/pages/lesson-planner-page"));
const TutorAIInsightsPage = lazy(() => import("@/modules/tutor/pages/ai-insights-page"));
const TutorProgressTrackingPage = lazy(() => import("@/modules/tutor/pages/progress-tracking-page"));
const TutorProfileSettingsPage = lazy(() => import("@/modules/tutor/pages/profile-settings-page"));
const AssignmentTakePage = lazy(() => import("@/pages/assignment-take"));

function normalizeRole(value: string | undefined | null): string {
  return String(value || "").toLowerCase();
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    return <Redirect to={getDashboardPath(user?.role)} />;
  }
  
  return <>{children}</>;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: UserRoleType[];
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Redirect to="/login" />;
  const userRole = normalizeRole(user?.role);
  const allowed = roles.map((r) => normalizeRole(r));
  if (!user || !allowed.includes(userRole)) return <Redirect to={getDashboardPath(user?.role)} />;
  return <AppLayout>{children}</AppLayout>;
}

/** School- or tutor-tagged students only — hides Session/Assignments for public signup. */
function TaggedStudentRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (normalizeRole(user?.role) !== normalizeRole(UserRole.STUDENT)) {
    return <Redirect to={getDashboardPath(user?.role)} />;
  }
  if (isIndividualStudent(user?.role, user?.schoolId, user?.createdBy)) {
    return <Redirect to={getDashboardPath(user?.role)} />;
  }
  return <AppLayout>{children}</AppLayout>;
}

/** School admin, or individual tutor (no school) — not school-tagged tutors. */
function SchoolAdminOrIndividualTutorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Redirect to="/login" />;
  const role = normalizeRole(user?.role);
  const individualTutor =
    role === normalizeRole(UserRole.TUTOR) && (user?.schoolId == null || user.schoolId === "");
  if (role === normalizeRole(UserRole.SCHOOL_ADMIN) || individualTutor) {
    return <AppLayout>{children}</AppLayout>;
  }
  return <Redirect to={getDashboardPath(user?.role)} />;
}

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    applyRouteMeta(location);
  }, [location]);

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>

      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      </Route>
      
      <Route path="/signup">
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      </Route>

      <Route path="/pending-approval">
        <PublicRoute>
          <PendingApprovalPage />
        </PublicRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/my-learning">
        <ProtectedRoute>
          <MyLearningPage />
        </ProtectedRoute>
      </Route>

      <Route path="/ai-learning-studio/subject/:subjectId">
        <ProtectedRoute>
          <AILearningStudioPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/ai-learning-studio">
        <ProtectedRoute>
          <AILearningStudioPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/ask-ai-tutor">
        <ProtectedRoute>
          <AskAiTutorPage />
        </ProtectedRoute>
      </Route>

      <Route path="/ai-tutor/ask">
        <ProtectedRoute>
          <AiTutorAgentPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-tutor/practice">
        <ProtectedRoute>
          <AiTutorAgentPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-tutor/explain">
        <ProtectedRoute>
          <AiTutorAgentPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-tutor">
        <ProtectedRoute>
          <AITutorPage />
        </ProtectedRoute>
      </Route>

      <Route path="/voice-tutor">
        <ProtectedRoute>
          <VoiceTutorPage />
        </ProtectedRoute>
      </Route>
      {/* Retired: the FastAPI /ws/voice stack. Voice is now the Nest RTC server
          (/voice-tutor). Keep the redirect — chapter deep links are bookmarked,
          and the scope lives entirely in the query string. */}
      <Route path="/ai-voice">
        <Redirect to={`/voice-tutor${window.location.search}`} />
      </Route>
      
      <Route path="/subjects">
        <ProtectedRoute>
          <Redirect to="/ai-learning-studio" />
        </ProtectedRoute>
      </Route>
      
      <Route path="/assignments/:id">
        <TaggedStudentRoute>
          <AssignmentTakePage />
        </TaggedStudentRoute>
      </Route>

      <Route path="/assignments">
        <TaggedStudentRoute>
          <AssignmentsPage />
        </TaggedStudentRoute>
      </Route>
      
      <Route path="/analytics">
        <ProtectedRoute>
          <Redirect to="/dashboard" />
        </ProtectedRoute>
      </Route>
      
      <Route path="/live-classes">
        <TaggedStudentRoute>
          <LiveClassesPage />
        </TaggedStudentRoute>
      </Route>
      
      <Route path="/my-classes">
        <TaggedStudentRoute>
          <LiveClassesPage />
        </TaggedStudentRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/students">
        <RoleRoute roles={[UserRole.SCHOOL_ADMIN]}>
          <OrganizationManageStudentsPage />
        </RoleRoute>
      </Route>

      <Route path="/teachers">
        <RoleRoute roles={[UserRole.SCHOOL_ADMIN]}>
          <OrganizationManageTutorsPage />
        </RoleRoute>
      </Route>
      
      <Route path="/tutors">
        <RoleRoute roles={[UserRole.SCHOOL_ADMIN]}>
          <Redirect to="/teachers" />
        </RoleRoute>
      </Route>

      <Route path="/classes">
        <SchoolAdminOrIndividualTutorRoute>
          <OrganizationManageClassesPage />
        </SchoolAdminOrIndividualTutorRoute>
      </Route>

      <Route path="/credentials">
        <SchoolAdminOrIndividualTutorRoute>
          <OrganizationCredentialsPage />
        </SchoolAdminOrIndividualTutorRoute>
      </Route>

      <Route path="/school-settings">
        <RoleRoute roles={[UserRole.SCHOOL_ADMIN]}>
          <OrganizationSettingsPage />
        </RoleRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/syllabus">
        <ProtectedRoute>
          <SyllabusPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/schools">
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/platform">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/master-admin/dashboard">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminDashboardModulePage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <Redirect to="/master-admin/dashboard" />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <Redirect to="/master-admin/dashboard" />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/schools">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminSchoolsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/users">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminUsersPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/boards-syllabus">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminBoardsSyllabusPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/textbook-uploads">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminTextbookUploadsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/ai-embeddings">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminAIEmbeddingsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/subscriptions">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminSubscriptionsPage />
        </RoleRoute>
      </Route>
      
      <Route path="/master-admin/tutors">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <ManageTutorsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/students">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <ManageStudentsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/reports">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminReportsPage />
        </RoleRoute>
      </Route>
      <Route path="/master-admin/settings">
        <RoleRoute roles={[UserRole.MASTER_ADMIN]}>
          <MasterAdminSettingsPage />
        </RoleRoute>
      </Route>

      <Route path="/tutor/dashboard">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorDashboardModulePage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/students/:studentId">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorStudentProfilePage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/students">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorAssignedStudentsPage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/sessions">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorSessionManagementPage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/lesson-planner">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorLessonPlannerPage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/student-results">
        <Redirect to="/tutor/progress?tab=results" />
      </Route>
      <Route path="/tutor/ai-insights">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorAIInsightsPage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/ai-interaction">
        <Redirect to="/tutor/ai-insights" />
      </Route>
      <Route path="/tutor/progress">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorProgressTrackingPage />
        </RoleRoute>
      </Route>
      <Route path="/tutor/settings">
        <RoleRoute roles={[UserRole.TUTOR]}>
          <TutorProfileSettingsPage />
        </RoleRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function LiveQuerySync() {
  useLiveQuerySync();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <LiveQuerySync />
          <Suspense fallback={null}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
