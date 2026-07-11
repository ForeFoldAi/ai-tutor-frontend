import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { API_BASE } from "@/api";
import { getDashboardPath } from "@/lib/dashboard-routes";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { UserRole } from "@/types/schema";
import { AuthCardFooter, AuthCardIllustration, AuthLayout } from "@/components/auth/auth-layout";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const roleMap: Record<string, string> = {
  STUDENT: UserRole.STUDENT,
  TUTOR: UserRole.TUTOR,
  SCHOOL_ADMIN: UserRole.SCHOOL_ADMIN,
  ORG_ADMIN: UserRole.ORG_ADMIN,
  MASTER_ADMIN: UserRole.MASTER_ADMIN,
};

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.username, password: data.password }),
      });
      const loginText = await loginResponse.text();
      if (!loginResponse.ok) {
        throw new Error(studentFriendlyApiError(loginText, loginResponse.status, MSG.loginFailed));
      }
      const loginPayload = JSON.parse(loginText) as { access_token?: string; refresh_token?: string };
      if (!loginPayload.access_token || !loginPayload.refresh_token) {
        throw new Error(MSG.loginFailed);
      }

      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${loginPayload.access_token}` },
      });
      const meText = await meResponse.text();
      if (!meResponse.ok) {
        throw new Error(studentFriendlyApiError(meText, meResponse.status, MSG.loginFailed));
      }
      const me = JSON.parse(meText) as {
        id: string;
        full_name: string;
        email: string;
        role: string;
        organization_id: string | null;
        school_id: string | null;
        teaching_board?: string | null;
        teaching_classes?: { grade: string; sections: string[] }[] | null;
      };

      const mappedUser = {
        id: me.id,
        username: me.email.split("@")[0],
        email: me.email,
        fullName: me.full_name,
        role: roleMap[me.role] || UserRole.STUDENT,
        avatar: null,
        organizationId: me.organization_id,
        schoolId: me.school_id,
        teachingBoard: me.teaching_board ?? null,
        teachingClasses: me.teaching_classes ?? null,
      };

      login(mappedUser, loginPayload.access_token, loginPayload.refresh_token);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${mappedUser.fullName}`,
      });
      navigate(getDashboardPath(mappedUser.role), { replace: true });
    } catch (error: any) {
      toast({
        title: "Couldn't sign you in",
        description: studentFriendlyError(error, MSG.loginFailed),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCardIllustration />

      <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Welcome back</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Sign in to your AI Virtual Tutor account
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        placeholder="Enter your username"
                        className="h-10 pl-10"
                        data-testid="input-username"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-10 pl-10 pr-10"
                        data-testid="input-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                onClick={() =>
                  toast({
                    title: "Coming soon",
                    description: "Password reset will be available shortly.",
                  })
                }
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 text-base"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
            data-testid="link-signup"
          >
            Sign up
          </button>
        </p>

        <AuthCardFooter />
      </div>
    </AuthLayout>
  );
}
