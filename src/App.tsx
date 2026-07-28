import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { useLiveQuerySync } from "@/hooks/use-live-query-sync";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import SignupPage from "@/pages/signup";
import DashboardPage from "@/pages/dashboard";
import AILearningStudioPage from "@/pages/ai-learning-studio";
import MyLearningPage from "@/pages/my-learning";
import AITutorPage from "@/pages/ai-tutor";
import AiTutorAgentPage from "@/pages/ai-tutor-agent";
import AskAiTutorPage from "@/pages/ask-ai-tutor";
import AssignmentsPage from "@/pages/assignments";
import LiveClassesPage from "@/pages/live-classes";
import SettingsPage from "@/pages/settings";
import UsersPage from "@/pages/users";
import SyllabusPage from "@/pages/syllabus";
import AIVoicePage from "@/pages/ai-voice";
import { getDashboardPath } from "@/lib/dashboard-routes";
import { isIndividualStudent } from "@/lib/app-nav-items";
import { UserRole, type UserRoleType } from "@/types/schema";
import MasterAdminDashboardModulePage from "@/modules/master-admin/pages/dashboard-page";
import MasterAdminSchoolsPage from "@/modules/master-admin/pages/schools-page";
import MasterAdminUsersPage from "@/modules/master-admin/pages/users-page";
import MasterAdminBoardsSyllabusPage from "@/modules/master-admin/pages/boards-syllabus-page";
import MasterAdminTextbookUploadsPage from "@/modules/master-admin/pages/textbook-uploads-page";
import MasterAdminAIEmbeddingsPage from "@/modules/master-admin/pages/ai-embeddings-page";
import MasterAdminSubscriptionsPage from "@/modules/master-admin/pages/subscriptions-page";

import ManageTutorsPage from "@/modules/master-admin/pages/manage-tutors-page";
import ManageStudentsPage from "@/modules/master-admin/pages/manage-students-page";
import MasterAdminReportsPage from "@/modules/master-admin/pages/reports-page";
import MasterAdminSettingsPage from "@/modules/master-admin/pages/settings-page";
import OrganizationManageTutorsPage from "@/modules/organization/pages/manage-tutors-page";
import OrganizationManageStudentsPage from "@/modules/organization/pages/manage-students-page";
import OrganizationManageClassesPage from "@/modules/organization/pages/manage-classes-page";
import OrganizationCredentialsPage from "@/modules/organization/pages/credentials-page";
import OrganizationSettingsPage from "@/modules/organization/pages/settings-page";
import TutorDashboardModulePage from "@/modules/tutor/pages/dashboard-page";
import TutorAssignedStudentsPage from "@/modules/tutor/pages/assigned-students-page";
import TutorStudentProfilePage from "@/modules/tutor/pages/student-profile-page";
import TutorSessionManagementPage from "@/modules/tutor/pages/session-management-page";
import TutorLessonPlannerPage from "@/modules/tutor/pages/lesson-planner-page";
import TutorAIInsightsPage from "@/modules/tutor/pages/ai-insights-page";
import TutorProgressTrackingPage from "@/modules/tutor/pages/progress-tracking-page";
import TutorProfileSettingsPage from "@/modules/tutor/pages/profile-settings-page";
import AssignmentTakePage from "@/pages/assignment-take";

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

      <Route path="/ai-voice">
        <ProtectedRoute>
          <AIVoicePage />
        </ProtectedRoute>
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
