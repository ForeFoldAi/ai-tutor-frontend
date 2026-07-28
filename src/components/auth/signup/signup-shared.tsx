import { useState, type ComponentProps, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectTrigger } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignupAccountType } from "./signup-shell";
import { SIGNUP_THEMES } from "./signup-shell";

export const signupFieldClass =
  "!border !border-slate-300 bg-white hover:!border-slate-400 focus-visible:!border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export function FormSection({
  title,
  children,
  accountType,
}: {
  title: string;
  children: React.ReactNode;
  accountType: SignupAccountType;
}) {
  const theme = SIGNUP_THEMES[accountType];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.22)]">
      <h2 className={cn("mb-4 text-sm font-semibold uppercase tracking-wide", theme.accent)}>{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FormRow({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : cols === 4
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2";
  return <div className={cn("grid gap-4", colClass)}>{children}</div>;
}

export function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function SignupSelectTrigger({ className, ...props }: ComponentProps<typeof SelectTrigger>) {
  return <SelectTrigger className={cn("h-10", signupFieldClass, className)} {...props} />;
}

export function IconField({
  icon: Icon,
  className,
  ...props
}: ComponentProps<typeof Input> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn("h-10 pl-10", signupFieldClass, className)} {...props} />
    </div>
  );
}

export function PasswordField({
  value,
  onChange,
  placeholder = "Create a password",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("h-10 pr-10", signupFieldClass)}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PillSelect({
  options,
  value,
  onChange,
  multiple,
  accountType,
}: {
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
  accountType: SignupAccountType;
}) {
  const theme = SIGNUP_THEMES[accountType];
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  const toggle = (opt: string) => {
    if (!multiple) {
      onChange(opt);
      return;
    }
    const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              isOn
                ? cn(theme.accentBorder, theme.accentBg, theme.accent)
                : "border-slate-300 bg-white text-muted-foreground hover:border-slate-400"
            )}
          >
            {isOn && <Check className="h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function UserIdField({
  value,
  onChange,
  suggestions,
  accountType,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  accountType: SignupAccountType;
}) {
  const theme = SIGNUP_THEMES[accountType];
  const available = value.length >= 3;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, "").toLowerCase())}
          placeholder="Choose a unique user ID"
          className={cn("h-10 pr-24", signupFieldClass)}
        />
        {available && (
          <Badge className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
            <Check className="h-3 w-3" />
            Available
          </Badge>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Suggested User IDs</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                value === s ? cn(theme.accentBorder, theme.accentBg, theme.accent) : "border-slate-300 hover:border-slate-400"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MethodCard({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  accountType,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onSelect: () => void;
  accountType: SignupAccountType;
}) {
  const theme = SIGNUP_THEMES[accountType];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all",
        selected ? cn(theme.accentBorder, "ring-1 ring-inset", theme.accentBg) : "border-slate-300 bg-white hover:border-slate-400"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", theme.accentBg)}>
        <Icon className={cn("h-5 w-5", theme.accent)} />
      </span>
      <span>
        <span className={cn("block text-sm font-semibold", selected ? theme.accent : "text-foreground")}>{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function SignupSuccessFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 w-full items-center justify-center py-8 sm:py-10">
      {children}
    </div>
  );
}

const SUCCESS_ACCENT_BAR: Record<SignupAccountType, string> = {
  student: "bg-primary",
  teacher: "bg-emerald-600",
  school: "bg-blue-600",
};

export function SignupSuccessCard({
  accountType,
  children,
}: {
  accountType: SignupAccountType;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-[0_28px_64px_-16px_rgba(15,23,42,0.45)]">
      <div className={cn("h-2 w-full", SUCCESS_ACCENT_BAR[accountType])} />
      <div className="p-6 text-center sm:p-8">{children}</div>
    </div>
  );
}

export function SuccessPanel({
  name,
  userId,
  features,
  accountType,
  dashboardLabel,
  onDashboard,
}: {
  name: string;
  userId: string;
  features: string[];
  accountType: SignupAccountType;
  dashboardLabel: string;
  onDashboard: () => void;
}) {
  const theme = SIGNUP_THEMES[accountType];
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SignupSuccessFrame>
      <SignupSuccessCard accountType={accountType}>
        <img src="/login-right.png" alt="" aria-hidden className="mx-auto h-24 w-auto object-contain" />
        <h2 className="mt-4 text-xl font-bold text-foreground">Account Created Successfully!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome to AI Tutor, <span className="font-semibold text-foreground">{name}</span>! Your account has been
          created successfully.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Your User ID</p>
            <p className="font-semibold text-foreground">{userId}</p>
          </div>
          <button
            type="button"
            onClick={copyId}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
            aria-label="Copy user ID"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <ul className="mt-5 space-y-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              {f}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onDashboard}
          className={cn(
            "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
            theme.button
          )}
        >
          {dashboardLabel}
        </button>
      </SignupSuccessCard>
    </SignupSuccessFrame>
  );
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

export function SignupTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea className={cn(signupFieldClass, className)} {...props} />;
}

export function SignupSelectSkeleton() {
  return <Skeleton className="h-10 w-full rounded-md" />;
}

export function SignupPillsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  );
}

export function SignupCheckboxGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function SignupMethodCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function SignupModeButtonsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

type OptionsSlotVariant = "select" | "pills" | "checkboxes" | "methods" | "modes";

export function OptionsSlot({
  loading,
  error,
  onRetry,
  variant = "select",
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  variant?: OptionsSlotVariant;
  children: ReactNode;
}) {
  if (loading) {
    if (variant === "pills") return <SignupPillsSkeleton />;
    if (variant === "checkboxes") return <SignupCheckboxGridSkeleton />;
    if (variant === "methods") return <SignupMethodCardsSkeleton />;
    if (variant === "modes") return <SignupModeButtonsSkeleton />;
    return <SignupSelectSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button type="button" variant="ghost" size="sm" className="mt-1 h-8 gap-1.5 px-0 text-primary" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

export { Textarea };
