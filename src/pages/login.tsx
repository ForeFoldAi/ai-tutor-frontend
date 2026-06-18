import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockGetMe, mockLogin } from "@/mock-data";
import { UserRole } from "@/types/schema";

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
      const loginPayload = await mockLogin(data.username, data.password);
      const me = await mockGetMe(loginPayload.access_token);

      const mappedUser = {
        id: me.id,
        username: me.email.split("@", 1)[0],
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
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="absolute top-4 right-4">
        <ThemeToggle />
      </header>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-9 w-9 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
              <CardDescription className="mt-2">
                Sign in to your AI Virtual Tutor account
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          data-testid="input-username"
                          {...field}
                        />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            data-testid="input-password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
                data-testid="link-signup"
              >
                Sign up
              </button>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center mb-2">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-background rounded">
                  <p className="font-medium">Student</p>
                  <p className="text-muted-foreground">student / password</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className="font-medium">Tutor</p>
                  <p className="text-muted-foreground">tutor / password</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className="font-medium">School Admin</p>
                  <p className="text-muted-foreground">admin / password</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className="font-medium">Master Admin</p>
                  <p className="text-muted-foreground">master / password</p>
                </div>
                <div className="p-2 bg-background rounded col-span-2">
                  <p className="font-medium">Org Admin</p>
                  <p className="text-muted-foreground">organization / password</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
