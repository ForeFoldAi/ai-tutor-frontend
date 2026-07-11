import { useEffect } from "react";
import { useLocation } from "wouter";
import { GraduationCap, School, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";

export type SignupAccountType = "student" | "teacher" | "school";

const ACCOUNT_OPTIONS: {
  id: SignupAccountType;
  title: string;
  description: string;
  icon: typeof GraduationCap;
}[] = [
  {
    id: "student",
    title: "I'm a Student",
    description: "Access personalized learning, assignments and more.",
    icon: GraduationCap,
  },
  {
    id: "teacher",
    title: "I'm an Individual Teacher",
    description: "Teach smarter, manage classes and track student progress.",
    icon: UserRound,
  },
  {
    id: "school",
    title: "I'm a School",
    description: "Manage teachers, students and monitor learning across your school.",
    icon: School,
  },
];

export const SIGNUP_THEMES: Record<
  SignupAccountType,
  {
    accent: string;
    accentBg: string;
    accentBorder: string;
    button: string;
    stepActive: string;
    iconBox: string;
    iconColor: string;
  }
> = {
  student: {
    accent: "text-primary",
    accentBg: "bg-primary/10",
    accentBorder: "border-primary",
    button: "bg-primary hover:bg-primary-hover",
    stepActive: "border-primary bg-primary text-primary-foreground",
    iconBox: "bg-primary/15",
    iconColor: "text-primary",
  },
  teacher: {
    accent: "text-emerald-700",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-500",
    button: "bg-emerald-600 hover:bg-emerald-700",
    stepActive: "border-emerald-600 bg-emerald-600 text-white",
    iconBox: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  school: {
    accent: "text-blue-700",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-500",
    button: "bg-blue-600 hover:bg-blue-700",
    stepActive: "border-blue-600 bg-blue-600 text-white",
    iconBox: "bg-blue-100",
    iconColor: "text-blue-600",
  },
};

interface SignupShellProps {
  accountType: SignupAccountType;
  onAccountTypeChange: (type: SignupAccountType) => void;
  children: React.ReactNode;
}

export function SignupShell({ accountType, onAccountTypeChange, children }: SignupShellProps) {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("overflow-hidden");
    document.body.classList.add("overflow-hidden");
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background">
      <aside className="hidden h-full w-[340px] shrink-0 flex-col overflow-hidden border-r border-[#d4d2f5] bg-[#E2E1FB] dark:bg-sidebar lg:flex xl:w-[380px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6 pb-3 xl:px-8">
          <div className="shrink-0">
            <AuthBrandMark size="signup" />

            <h1 className="mt-4 text-xl font-bold text-[#1a1040] dark:text-foreground">
              Create your account
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-[#5c4d8a] dark:text-muted-foreground">
              Choose the account type that best describes you and start your learning journey.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-1">
            <img
              src="/signup.png"
              alt=""
              aria-hidden
              className="w-[88%] max-h-[min(38vh,280px)] max-w-[300px] object-contain xl:max-w-[320px]"
            />
          </div>

          <div className="shrink-0 space-y-2">
            {ACCOUNT_OPTIONS.map(({ id, title, description, icon: Icon }) => {
              const selected = accountType === id;
              const theme = SIGNUP_THEMES[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onAccountTypeChange(id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition-all dark:bg-card",
                    selected
                      ? cn(theme.accentBorder, "shadow-sm ring-1 ring-inset", theme.accentBg)
                      : "border-border hover:border-primary/30 hover:bg-white/80"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      theme.iconBox,
                      selected && cn("ring-1 ring-inset", theme.accentBorder)
                    )}
                  >
                    <Icon className={cn("h-5 w-5", theme.iconColor)} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-semibold", selected ? theme.accent : "text-foreground")}>
                      {title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#d4d2f5] px-6 py-4 text-center xl:px-8">
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            Your data is safe and secure
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              Sign in
            </button>
          </p>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <AuthBrandMark variant="sidebar" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-10">{children}</div>
      </main>
    </div>
  );
}

