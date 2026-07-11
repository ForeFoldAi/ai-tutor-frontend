import { useState } from "react";
import { GraduationCap, School, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SignupShell,
  type SignupAccountType,
  SIGNUP_THEMES,
} from "@/components/auth/signup/signup-shell";
import {
  SchoolSignupWizard,
  StudentSignupWizard,
  TeacherSignupWizard,
} from "@/components/auth/signup/signup-wizards";

const MOBILE_ACCOUNT_OPTIONS: { id: SignupAccountType; title: string; icon: typeof GraduationCap }[] = [
  { id: "student", title: "Student", icon: GraduationCap },
  { id: "teacher", title: "Teacher", icon: UserRound },
  { id: "school", title: "School", icon: School },
];

export default function SignupPage() {
  const [accountType, setAccountType] = useState<SignupAccountType>("student");

  return (
    <SignupShell accountType={accountType} onAccountTypeChange={setAccountType}>
      <div className="mb-4 flex gap-2 lg:hidden">
        {MOBILE_ACCOUNT_OPTIONS.map(({ id, title, icon: Icon }) => {
          const selected = accountType === id;
          const theme = SIGNUP_THEMES[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAccountType(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium",
                selected ? cn(theme.accentBorder, theme.accentBg, theme.accent) : "border-border text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {title}
            </button>
          );
        })}
      </div>

      {accountType === "student" && <StudentSignupWizard key="student" />}
      {accountType === "teacher" && <TeacherSignupWizard key="teacher" />}
      {accountType === "school" && <SchoolSignupWizard key="school" />}
    </SignupShell>
  );
}
