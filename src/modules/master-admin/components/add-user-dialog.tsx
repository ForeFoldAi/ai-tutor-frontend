import { useState } from "react";
import { GraduationCap, School, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SIGNUP_THEMES, type SignupAccountType } from "@/components/auth/signup/signup-shell";
import { SignupOptionsProvider } from "@/components/auth/signup/signup-options-context";
import {
  SchoolSignupWizard,
  StudentSignupWizard,
  TeacherSignupWizard,
} from "@/components/auth/signup/signup-wizards";

const ACCOUNT_TYPES: { id: SignupAccountType; title: string; icon: typeof GraduationCap }[] = [
  { id: "student", title: "Student", icon: GraduationCap },
  { id: "teacher", title: "Teacher", icon: UserRound },
  { id: "school", title: "School", icon: School },
];

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: { fullName: string; userId: string; accountType: SignupAccountType }) => void;
}

/** Master-admin "Add User": the public signup forms, creating pre-approved accounts. */
export function AddUserDialog({ open, onOpenChange, onCreated }: AddUserDialogProps) {
  const [accountType, setAccountType] = useState<SignupAccountType>("student");

  const handleCreated = (created: { fullName: string; userId: string }) => {
    onCreated({ ...created, accountType });
    setAccountType("student");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto bg-neutral-50 text-slate-900">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Fill in the same details as the public signup form. The account is approved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {ACCOUNT_TYPES.map(({ id, title, icon: Icon }) => {
            const selected = accountType === id;
            const theme = SIGNUP_THEMES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccountType(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                  selected
                    ? cn(theme.accentBorder, theme.accentBg, theme.accent)
                    : "border-border bg-white text-muted-foreground hover:border-slate-400",
                )}
              >
                <Icon className="h-4 w-4" />
                {title}
              </button>
            );
          })}
        </div>

        <SignupOptionsProvider>
          {accountType === "student" && <StudentSignupWizard key="student" onCreated={handleCreated} />}
          {accountType === "teacher" && <TeacherSignupWizard key="teacher" onCreated={handleCreated} />}
          {accountType === "school" && <SchoolSignupWizard key="school" onCreated={handleCreated} />}
        </SignupOptionsProvider>
      </DialogContent>
    </Dialog>
  );
}
