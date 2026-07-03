import { useState, type ComponentProps } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { API_BASE } from "@/api";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { AuthCardFooter, AuthLayout } from "@/components/auth/auth-layout";

const signupSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["student", "organization"]).default("student"),
  school_name: z.string().optional(),
  grade: z.string().optional(),
  board: z.string().optional(),
  organization_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  no_of_schools: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.role === "student") {
    if (!data.school_name?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["school_name"], message: "School name is required" });
    if (!data.grade?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["grade"], message: "Grade is required" });
    if (!data.board?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["board"], message: "Board is required" });
  } else if (!data.organization_name?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["organization_name"], message: "Organization name is required" });
  }
});

type SignupFormValues = z.infer<typeof signupSchema>;

function IconInput({
  icon: Icon,
  className,
  ...props
}: ComponentProps<typeof Input> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input className={`h-10 pl-10 ${className ?? ""}`} {...props} />
    </div>
  );
}

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "student",
      school_name: "",
      grade: "",
      board: "",
      organization_name: "",
      phone: "",
      address: "",
      no_of_schools: "1",
    },
  });
  const selectedRole = form.watch("role");

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const endpoint =
        data.role === "organization" ? "/auth/signup/organization" : "/auth/signup/student";
      const payload =
        data.role === "organization"
          ? {
              full_name: data.full_name,
              email: data.email,
              password: data.password,
              organization_name: data.organization_name,
              phone: data.phone,
              address: data.address,
            }
          : {
              full_name: data.full_name,
              email: data.email,
              password: data.password,
              school_name: data.school_name,
              grade: data.grade,
              board: data.board,
            };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) {
        throw new Error(studentFriendlyApiError(txt, res.status, MSG.signupFailed));
      }

      if (data.role === "organization" && data.no_of_schools) {
        localStorage.setItem("org_signup_no_of_schools", data.no_of_schools);
      }
      toast({ title: "Account created", description: "Signup successful. Please login." });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Couldn't create account",
        description: studentFriendlyError(error, MSG.signupFailed),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout maxWidth="max-w-[680px]" scrollable>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Create account</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Join AI Virtual Tutor and start learning
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                  <FormControl>
                    <IconInput icon={User} placeholder="John Doe" data-testid="input-fullname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email</FormLabel>
                  <FormControl>
                    <IconInput
                      icon={Mail}
                      type="email"
                      placeholder="john@example.com"
                      data-testid="input-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">I am a</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role" className="h-10">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "student" ? (
              <>
                <FormField
                  control={form.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">School Name</FormLabel>
                      <FormControl>
                        <IconInput icon={GraduationCap} placeholder="ABC School" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Grade</FormLabel>
                      <FormControl>
                        <Input className="h-10" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Board</FormLabel>
                      <FormControl>
                        <Input className="h-10" placeholder="CBSE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="organization_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Organization Name</FormLabel>
                      <FormControl>
                        <IconInput icon={Building2} placeholder="ForeFold Organization" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Phone</FormLabel>
                      <FormControl>
                        <IconInput icon={Phone} placeholder="+911234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no_of_schools"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">No. of Schools</FormLabel>
                      <FormControl>
                        <Input className="h-10" type="number" min={1} placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-sm font-medium">Address</FormLabel>
                      <FormControl>
                        <IconInput icon={MapPin} placeholder="City, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
                        placeholder="Create a password"
                        className="h-10 pl-10 pr-10"
                        data-testid="input-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <IconInput
                      icon={Lock}
                      type="password"
                      placeholder="Confirm your password"
                      data-testid="input-confirm-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sm:col-span-2">
              <Button
                type="submit"
                className="mt-1 w-full gap-2 text-base"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
            data-testid="link-login"
          >
            Sign in
          </button>
        </p>

        <AuthCardFooter />
      </div>
    </AuthLayout>
  );
}
