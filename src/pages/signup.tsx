import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockSignupOrganization, mockSignupStudent } from "@/mock-data";

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
      if (data.role === "organization") {
        await mockSignupOrganization({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          organization_name: data.organization_name!,
        });
      } else {
        await mockSignupStudent({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
        });
      }

      if (data.role === "organization" && data.no_of_schools) {
        localStorage.setItem("org_signup_no_of_schools", data.no_of_schools);
      }
      toast({ title: "Account created", description: "Signup successful. Please login." });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
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
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-9 w-9 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">Create account</CardTitle>
              <CardDescription className="mt-2">
                Join AI Virtual Tutor and start learning
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" data-testid="input-fullname" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" data-testid="input-email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am a</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-role"><SelectValue placeholder="Select your role" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedRole === "student" ? (
                  <>
                    <FormField control={form.control} name="school_name" render={({ field }) => (
                      <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="ABC School" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="grade" render={({ field }) => (
                      <FormItem><FormLabel>Grade</FormLabel><FormControl><Input placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="board" render={({ field }) => (
                      <FormItem><FormLabel>Board</FormLabel><FormControl><Input placeholder="CBSE" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </>
                ) : (
                  <>
                    <FormField control={form.control} name="organization_name" render={({ field }) => (
                      <FormItem><FormLabel>Organization Name</FormLabel><FormControl><Input placeholder="ForeFold Organization" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+911234567890" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="City, State" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="no_of_schools" render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. of Schools</FormLabel>
                        <FormControl><Input type="number" min={1} placeholder="1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Create a password" data-testid="input-password" {...field} />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="Confirm your password" data-testid="input-confirm-password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="md:col-span-2">
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : "Create account"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium" data-testid="link-login">
                Sign in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
