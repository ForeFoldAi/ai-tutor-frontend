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
      {/* Below ~610px of viewport height the copy runs out of room, so let the illustration bleed off
          the bottom edge instead of colliding with the text. */}
      <img
        src="/login-left.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-left-bottom"
        style={{ objectPosition: "left calc(100% + max(0px, (610px - 100vh) * 0.9))" }}
      />
      {/* object-cover scales this portrait artwork by panel width, so the illustration always ends up
          ~42.5% of the panel width tall at the bottom. Reserve that band and drive the copy from viewport
          height so short laptop viewports (Windows at 125-150% OS scaling) never overlap the artwork. */}
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-8 pb-[43%] pt-[clamp(1rem,3.2vh,2rem)] text-[clamp(0.6875rem,calc(3.2vh_-_0.65rem),0.875rem)] xl:px-12 xl:text-[clamp(0.6875rem,calc(3.2vh_-_0.65rem),1rem)]">
        <AuthBrandMark className="shrink-0 [&_img]:h-[4em] [&_img]:w-[4em] [&_p:first-child]:text-[1.75em] [&_p:last-child]:text-[1.15em]" />

        <div className="mt-[2em] flex min-h-0 flex-1 flex-col justify-start">
          <h1 className="max-w-md text-[1.75em] font-bold leading-tight tracking-tight text-[#1a1040] dark:text-foreground">
            Smarter Learning With{" "}
            <span className="bg-gradient-brand bg-clip-text text-transparent">AI Tutors</span>
          </h1>
          <p className="mt-[0.85em] max-w-md text-[1em] leading-relaxed text-[#4a4070] dark:text-body-foreground">
            Personalized learning, real-time support and progress that matters.
          </p>

          <ul className="mt-[1.5em] space-y-[1.05em]">
            {AUTH_FEATURES.map(({ icon: Icon, label, description }) => (
              <li key={label} className="flex items-start gap-[0.85em]">
                <div className="flex h-[2.6em] w-[2.6em] shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon className="h-[1.15em] w-[1.15em] text-primary" aria-hidden />
                </div>
                <div className="min-w-0 pt-[0.15em]">
                  <p className="text-[1em] font-semibold text-[#2d2060] dark:text-foreground">
                    {label}
                  </p>
                  <p className="mt-[0.15em] text-[0.86em] leading-relaxed text-[#5c4d8a] dark:text-muted-foreground">
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
}

export function AuthLayout({ children, maxWidth = "max-w-[420px]" }: AuthLayoutProps) {
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
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-[clamp(0.375rem,1.6vh,1rem)] sm:px-8">
          <div className="mb-4 flex shrink-0 items-center gap-3 lg:hidden">
            <AuthBrandMark variant="sidebar" />
          </div>

          <div
            className={cn(
              "flex min-h-0 w-full shrink flex-col overflow-y-auto overflow-x-hidden rounded-card border border-border bg-card shadow-card hover:translate-y-0 hover:shadow-card",
              maxWidth
            )}
          >
            {children}
          </div>

          <p className="mt-[clamp(0.25rem,1vh,0.75rem)] flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
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
    <div className="shrink-0 px-5 pt-[clamp(0.5rem,2vh,1rem)] sm:px-7">
      <img
        src="/login-right.png"
        alt="Student learning with AI tutor"
        className="mx-auto h-auto w-full max-h-[clamp(2.5rem,11vh,7.5rem)] object-contain"
      />
    </div>
  );
}

export function AuthCardFooter() {
  return (
    <div className="mt-[clamp(0.5rem,1.8vh,1rem)] flex items-center justify-center gap-2 rounded-button bg-muted/50 px-3 py-[clamp(0.375rem,1.1vh,0.625rem)] text-xs text-muted-foreground sm:text-sm">
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
