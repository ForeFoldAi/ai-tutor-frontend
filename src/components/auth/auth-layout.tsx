import { useEffect } from "react";
import { BarChart3, Bot, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthLightTheme } from "@/lib/theme-provider";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";

export const AUTH_FEATURES = [
  {
    icon: Bot,
    label: "AI-Powered Tutoring",
    description: "Get instant help and explanations tailored to your needs.",
  },
  {
    icon: BarChart3,
    label: "Track Your Progress",
    description: "Monitor performance and improve with smart insights.",
  },
  {
    icon: Shield,
    label: "Safe & Secure",
    description: "Your data is protected with enterprise grade security.",
  },
];

function AuthBrandingPanel() {
  return (
    <aside className="relative hidden h-full min-h-0 shrink-0 overflow-hidden lg:flex lg:w-[48%] xl:w-1/2">
      <img
        src="/login-left.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-left-bottom"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col px-8 py-8 xl:px-12">
        <AuthBrandMark className="shrink-0" />

        <div className="mt-8 flex min-h-0 flex-1 flex-col justify-start xl:mt-10">
          <h1 className="max-w-md text-2xl font-bold leading-tight tracking-tight text-[#1a1040] dark:text-foreground xl:text-3xl">
            Smarter Learning With{" "}
            <span className="bg-gradient-brand bg-clip-text text-transparent">AI Tutors</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#4a4070] dark:text-body-foreground xl:text-base">
            Personalized learning, real-time support and progress that matters.
          </p>

          <ul className="mt-6 space-y-4 xl:mt-8 xl:space-y-5">
            {AUTH_FEATURES.map(({ icon: Icon, label, description }) => (
              <li key={label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm xl:h-10 xl:w-10">
                  <Icon className="h-4 w-4 text-primary xl:h-5 xl:w-5" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-[#2d2060] dark:text-foreground xl:text-base">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#5c4d8a] dark:text-muted-foreground xl:text-sm">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  scrollable?: boolean;
}

export function AuthLayout({ children, maxWidth = "max-w-[420px]", scrollable = false }: AuthLayoutProps) {
  useAuthLightTheme();

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
      <AuthBrandingPanel />

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-4 sm:px-8">
          <div className="mb-4 flex shrink-0 items-center gap-3 lg:hidden">
            <AuthBrandMark variant="sidebar" />
          </div>

          <div
            className={cn(
              "flex w-full shrink flex-col overflow-hidden rounded-card border border-border bg-card shadow-card hover:translate-y-0 hover:shadow-card",
              maxWidth,
              scrollable && "max-h-[calc(100dvh-5rem)] min-h-0"
            )}
          >
            {children}
          </div>

          <p className="mt-3 flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <Shield className="h-3 w-3" aria-hidden />
            Secured with enterprise-grade encryption
          </p>
        </div>
      </main>
    </div>
  );
}

export function AuthCardIllustration() {
  return (
    <div className="shrink-0 px-5 pt-4 sm:px-7">
      <img
        src="/login-right.png"
        alt="Student learning with AI tutor"
        className="mx-auto h-auto w-full max-h-[100px] object-contain sm:max-h-[120px]"
      />
    </div>
  );
}

export function AuthCardFooter() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 rounded-button bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground sm:text-sm">
      <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>
        powered by{" "}
        <a
          href="https://forefoldai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          ForeFold AI
        </a>
      </span>
    </div>
  );
}
