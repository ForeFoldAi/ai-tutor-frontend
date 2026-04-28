import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import DashboardPage from "@/pages/dashboard";
import AILearningStudioPage from "@/pages/ai-learning-studio";
import AITutorPage from "@/pages/ai-tutor";
import AssignmentsPage from "@/pages/assignments";
import AnalyticsPage from "@/pages/analytics";
import LiveClassesPage from "@/pages/live-classes";
import SettingsPage from "@/pages/settings";
import StudentsPage from "@/pages/students";
import TutorsPage from "@/pages/tutors";
import UsersPage from "@/pages/users";
import SyllabusPage from "@/pages/syllabus";
import AIVoicePage from "@/pages/ai-voice";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }
  
  return <>{children}</>;
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
      
      <Route path="/assignments">
        <ProtectedRoute>
          <AssignmentsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/analytics">
        <ProtectedRoute>
          <AnalyticsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/live-classes">
        <ProtectedRoute>
          <LiveClassesPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/my-classes">
        <ProtectedRoute>
          <LiveClassesPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/students">
        <ProtectedRoute>
          <StudentsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tutors">
        <ProtectedRoute>
          <TutorsPage />
        </ProtectedRoute>
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
