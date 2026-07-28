import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bot,
  Building2,
  Download,
  Loader2,
  Mail,
  Mic,
  Phone,
  PlayCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/api";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { cn } from "@/lib/utils";
import { SIGNUP_THEMES } from "./signup-shell";
import { useSignupOptions } from "./signup-options-context";
import { STUDENT_SIGNUP_FIELDS, TEACHER_SIGNUP_FIELDS, SCHOOL_SIGNUP_FIELDS } from "./signup-fields";
import {
  FormField,
  FormRow,
  FormSection,
  IconField,
  MethodCard,
  OptionsSlot,
  PasswordField,
  PillSelect,
  SignupSelectTrigger,
  SignupTextarea,
  signupFieldClass,
  SignupSuccessCard,
  SignupSuccessFrame,
  SuccessPanel,
  UserIdField,
} from "./signup-shared";

const LEARNING_METHOD_META: Record<string, { title: string; description: string; icon: typeof Bot }> = {
  "ai-tutor": { title: "AI Tutor (Text to Text)", description: "Chat with AI for step-by-step explanations.", icon: Bot },
  "ai-voice": { title: "AI Voice Tutor", description: "Learn hands-free with voice interaction.", icon: Mic },
  videos: { title: "Pre-recorded Videos", description: "Watch concept videos at your own pace.", icon: PlayCircle },
};

function slugName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

function SubmitButton({
  onClick,
  loading,
  label = "Create Account",
  accountType,
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  accountType: "student" | "teacher" | "school";
}) {
  const theme = SIGNUP_THEMES[accountType];
  return (
    <div className="pt-2">
      <Button
        type="button"
        disabled={loading}
        onClick={onClick}
        className={cn("gap-2 text-white sm:min-w-[220px]", theme.button)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function FormHeader({ eyebrow, title, accountType }: { eyebrow: string; title: string; accountType: "student" | "teacher" | "school" }) {
  const theme = SIGNUP_THEMES[accountType];
  return (
    <div className="mb-2">
      <p className={cn("text-xs font-semibold uppercase tracking-wider", theme.accent)}>{eyebrow}</p>
      <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
    </div>
  );
}

// ─── Student ───────────────────────────────────────────────────────────────────

export function StudentSignupWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { options, loading: optionsLoading, error: optionsError, retry: retryOptions } = useSignupOptions();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [curricula, setCurricula] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [method, setMethod] = useState("");

  const suggestions = useMemo(() => {
    const base = slugName(fullName);
    if (!base) return [];
    const g = grade.replace(/\D/g, "") || "";
    return g ? [`${base}.g${g}`, `${base}.math`, `${base}.learn`] : [`${base}.learn`, `${base}.math`];
  }, [fullName, grade]);

  const submit = async () => {
    if (optionsLoading || !options) {
      toast({
        title: "Dropdown options not ready",
        description: optionsError ?? "Wait a moment or tap Retry on the highlighted fields.",
        variant: "destructive",
      });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: "Enter your name", variant: "destructive" });
      return;
    }
    if (!grade) {
      toast({ title: "Select your grade", variant: "destructive" });
      return;
    }
    if (!curricula.length) {
      toast({ title: "Choose a curriculum", variant: "destructive" });
      return;
    }
    if (!userId.trim()) {
      toast({ title: "Choose a user ID", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          grade: grade.replace("Grade ", ""),
          user_id: userId.trim(),
          password,
          curricula,
          parent_phone: parentPhone.trim() || undefined,
          parent_email: parentEmail.trim() || undefined,
          favorite_subjects: subjects,
          learning_goals: goals,
          preferred_learning_method: method || undefined,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(studentFriendlyApiError(txt, res.status, MSG.signupFailed));
      setSuccess(true);
    } catch (e) {
      toast({ title: "Couldn't create account", description: studentFriendlyError(e, MSG.signupFailed), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SuccessPanel
        name={fullName.split(" ")[0] || "Student"}
        userId={userId || slugName(fullName)}
        accountType="student"
        dashboardLabel="Go to Dashboard"
        onDashboard={() => navigate("/login")}
        features={["Secure your progress", "Personalized learning path", "AI-powered help anytime"]}
      />
    );
  }

  const F = STUDENT_SIGNUP_FIELDS;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <FormHeader
        accountType="student"
        eyebrow="Individual Student Signup"
        title="Start your personalized learning journey"
      />

      <FormSection title="Basic Information" accountType="student">
        <FormRow cols={2}>
          <FormField label={F.fullName.label} required={F.fullName.required}>
            <IconField icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rahul Sharma" />
          </FormField>
          <FormField label={F.grade.label} required={F.grade.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={grade || undefined} onValueChange={setGrade} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select grade" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.student_grades ?? []).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label={F.parentPhone.label}>
            <IconField icon={Phone} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label={F.parentEmail.label}>
            <IconField icon={Mail} type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@email.com" />
          </FormField>
        </FormRow>
        <FormField label={F.curricula.label} required={F.curricula.required}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="pills">
            <PillSelect
              options={options?.curricula ?? []}
              value={curricula}
              onChange={(v) => setCurricula(v as string[])}
              multiple
              accountType="student"
            />
          </OptionsSlot>
        </FormField>
      </FormSection>

      <FormSection title="Login Details" accountType="student">
        <FormField label={F.userId.label} required={F.userId.required}>
          <UserIdField value={userId} onChange={setUserId} suggestions={suggestions} accountType="student" />
        </FormField>
        <FormRow cols={2}>
          <FormField label={F.password.label} required={F.password.required}>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label={F.confirmPassword.label} required={F.confirmPassword.required}>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Personalize Learning" accountType="student">
        <FormField label={F.subjects.label}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="pills">
            <PillSelect
              options={options?.student_subjects ?? []}
              value={subjects}
              onChange={(v) => setSubjects(v as string[])}
              multiple
              accountType="student"
            />
          </OptionsSlot>
        </FormField>
        <FormField label={F.goals.label}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="checkboxes">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(options?.learning_goals ?? []).map((g) => (
                <label key={g} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <Checkbox checked={goals.includes(g)} onCheckedChange={(c) => setGoals(c ? [...goals, g] : goals.filter((x) => x !== g))} />
                  {g}
                </label>
              ))}
            </div>
          </OptionsSlot>
        </FormField>
        <FormField label={F.method.label}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="methods">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {(options?.learning_methods ?? []).map((m) => {
                const meta = LEARNING_METHOD_META[m];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <MethodCard
                    key={m}
                    accountType="student"
                    title={meta.title}
                    description={meta.description}
                    icon={Icon}
                    selected={method === m}
                    onSelect={() => setMethod(m)}
                  />
                );
              })}
            </div>
          </OptionsSlot>
        </FormField>
      </FormSection>

      <SubmitButton accountType="student" onClick={submit} loading={loading} />
    </div>
  );
}

// ─── Teacher ─────────────────────────────────────────────────────────────────

export function TeacherSignupWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { options, loading: optionsLoading, error: optionsError, retry: retryOptions } = useSignupOptions();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [experience, setExperience] = useState("");
  const [teachSubjects, setTeachSubjects] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [gradeRange, setGradeRange] = useState("");
  const [mobile, setMobile] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teachingModes, setTeachingModes] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [classSize, setClassSize] = useState("");

  const suggestions = useMemo(() => {
    const base = slugName(fullName);
    if (!base) return [];
    return [`mathwith${base}`, `${base}.math`, `teach.${base}`];
  }, [fullName]);

  const submit = async () => {
    if (optionsLoading || !options) {
      toast({
        title: "Dropdown options not ready",
        description: optionsError ?? "Wait a moment or tap Retry on the highlighted fields.",
        variant: "destructive",
      });
      return;
    }
    if (!fullName.trim() || !email.trim() || !mobile.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (!experience || !gradeRange || !classSize || !teachSubjects.length) {
      toast({ title: "Complete your teaching profile", variant: "destructive" });
      return;
    }
    if (!userId.trim()) {
      toast({ title: "Choose a teacher user ID", variant: "destructive" });
      return;
    }
    if (!teachingModes.length) {
      toast({ title: "Select a teaching mode", variant: "destructive" });
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      toast({ title: "Check your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          user_id: userId.trim(),
          password,
          email: email.trim(),
          mobile: mobile.trim(),
          teaching_experience: experience,
          grades_teach: gradeRange,
          class_size: classSize,
          teaching_subjects: teachSubjects,
          teaching_modes: teachingModes,
          bio: bio.trim() || undefined,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(studentFriendlyApiError(txt, res.status, MSG.signupFailed));
      setSuccess(true);
    } catch (e) {
      toast({ title: "Couldn't create account", description: studentFriendlyError(e, MSG.signupFailed), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SuccessPanel
        name={fullName.split(" ")[0] || "Teacher"}
        userId={userId || slugName(fullName)}
        accountType="teacher"
        dashboardLabel="Go to Teacher Dashboard"
        onDashboard={() => navigate("/login")}
        features={["Create & manage classes", "Track student progress", "AI tools to teach better"]}
      />
    );
  }

  const TF = TEACHER_SIGNUP_FIELDS;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <FormHeader accountType="teacher" eyebrow="Individual Teacher Signup" title="Set up your teaching profile" />

      <FormSection title="Teacher Details" accountType="teacher">
        <FormRow cols={2}>
          <FormField label={TF.fullName.label} required={TF.fullName.required}>
            <IconField icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anita Verma" />
          </FormField>
          <FormField label={TF.experience.label} required={TF.experience.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={experience || undefined} onValueChange={setExperience} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select experience" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.teaching_experience ?? []).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label={TF.gradeRange.label} required={TF.gradeRange.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={gradeRange || undefined} onValueChange={setGradeRange} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select grades" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.tutor_grade_ranges ?? []).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
          <FormField label={TF.classSize.label} required={TF.classSize.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={classSize || undefined} onValueChange={setClassSize} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select class size" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.class_sizes ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
        </FormRow>
        <FormField label={TF.teachSubjects.label} required={TF.teachSubjects.required}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="pills">
            <PillSelect
              options={options?.tutor_subjects ?? []}
              value={teachSubjects}
              onChange={(v) => setTeachSubjects(v as string[])}
              multiple
              accountType="teacher"
            />
          </OptionsSlot>
        </FormField>
        <FormRow cols={2}>
          <FormField label={TF.email.label} required={TF.email.required}>
            <IconField icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anita@email.com" />
          </FormField>
          <FormField label={TF.mobile.label} required={TF.mobile.required}>
            <IconField icon={Phone} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Login Details" accountType="teacher">
        <FormField label={TF.userId.label} required={TF.userId.required}>
          <UserIdField value={userId} onChange={setUserId} suggestions={suggestions} accountType="teacher" />
        </FormField>
        <FormRow cols={2}>
          <FormField label={TF.password.label} required={TF.password.required}>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label={TF.confirmPassword.label} required={TF.confirmPassword.required}>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Teaching Profile" accountType="teacher">
        <FormField label={TF.teachingModes.label} required={TF.teachingModes.required}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="modes">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(options?.teaching_modes ?? []).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setTeachingModes((prev) =>
                      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
                    )
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm font-medium capitalize",
                    teachingModes.includes(m) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-muted-foreground hover:border-slate-400"
                  )}
                >
                  {m.replace("-", " ")}
                </button>
              ))}
            </div>
          </OptionsSlot>
        </FormField>
        <FormField label={TF.bio.label}>
          <SignupTextarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))} placeholder="Tell students about your teaching style..." rows={3} />
          <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length} / 200</p>
        </FormField>
      </FormSection>

      <SubmitButton accountType="teacher" onClick={submit} loading={loading} />
    </div>
  );
}

// ─── School ──────────────────────────────────────────────────────────────────

export function SchoolSignupWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { options, loading: optionsLoading, error: optionsError, retry: retryOptions } = useSignupOptions();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [adminName, setAdminName] = useState("");
  const [designation, setDesignation] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [adminMobile, setAdminMobile] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gradesOffered, setGradesOffered] = useState("");
  const [studentStrength, setStudentStrength] = useState("");
  const [curricula, setCurricula] = useState<string[]>([]);

  const adminSuggestions = useMemo(() => {
    const base = slugName(adminName);
    if (!base) return [];
    return [`${base}.admin`, `admin.${base}`, `${slugName(schoolName)}.admin`].filter(Boolean);
  }, [adminName, schoolName]);

  const submit = async () => {
    if (optionsLoading || !options) {
      toast({
        title: "Dropdown options not ready",
        description: optionsError ?? "Wait a moment or tap Retry on the highlighted fields.",
        variant: "destructive",
      });
      return;
    }
    if (!schoolName.trim() || !schoolEmail.trim() || !adminName.trim() || !address.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (!designation.trim() || !recoveryEmail.trim() || !adminMobile.trim()) {
      toast({ title: "Complete administrator details", variant: "destructive" });
      return;
    }
    if (!adminUserId.trim()) {
      toast({ title: "Choose an admin user ID", variant: "destructive" });
      return;
    }
    if (!gradesOffered || !studentStrength || !curricula.length) {
      toast({ title: "Complete school preferences", variant: "destructive" });
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      toast({ title: "Check your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup/school`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: schoolName.trim(),
          school_email: schoolEmail.trim(),
          phone: schoolPhone.trim(),
          address: address.trim(),
          website: website.trim() || undefined,
          full_name: adminName.trim(),
          designation: designation.trim(),
          recovery_email: recoveryEmail.trim(),
          mobile: adminMobile.trim(),
          user_id: adminUserId.trim(),
          password,
          grades_offered: gradesOffered,
          student_strength: studentStrength,
          curricula,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(studentFriendlyApiError(txt, res.status, MSG.signupFailed));
      setSuccess(true);
    } catch (e) {
      toast({ title: "Couldn't create account", description: studentFriendlyError(e, MSG.signupFailed), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SignupSuccessFrame>
        <SignupSuccessCard accountType="school">
          <Building2 className="mx-auto h-16 w-16 text-blue-600" />
          <h2 className="mt-4 text-xl font-bold text-foreground">All Set! Your School Workspace is Ready</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{schoolName}</span> has been registered successfully.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Download Credentials</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Mail className="h-4 w-4" />Send Credentials</Button>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={cn("mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white", SIGNUP_THEMES.school.button)}
          >
            Go to School Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </SignupSuccessCard>
      </SignupSuccessFrame>
    );
  }

  const SF = SCHOOL_SIGNUP_FIELDS;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <FormHeader accountType="school" eyebrow="School Signup" title="Set up your school workspace in minutes" />

      <FormSection title="School Information" accountType="school">
        <FormRow cols={2}>
          <FormField label={SF.schoolName.label} required={SF.schoolName.required}>
            <IconField icon={Building2} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Greenwood High School" />
          </FormField>
          <FormField label={SF.schoolEmail.label} required={SF.schoolEmail.required}>
            <IconField icon={Mail} type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder="admin@school.edu" />
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label={SF.schoolPhone.label} required={SF.schoolPhone.required}>
            <IconField icon={Phone} value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label={SF.website.label}>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://school.edu" className={cn("h-10", signupFieldClass)} />
          </FormField>
        </FormRow>
        <FormField label={SF.address.label} required={SF.address.required}>
          <SignupTextarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State" rows={2} />
        </FormField>
      </FormSection>

      <FormSection title="Administrator Login" accountType="school">
        <FormRow cols={2}>
          <FormField label={SF.adminName.label} required={SF.adminName.required}>
            <IconField icon={User} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" />
          </FormField>
          <FormField label={SF.designation.label} required={SF.designation.required}>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="School Administrator" className={cn("h-10", signupFieldClass)} />
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label={SF.recoveryEmail.label} required={SF.recoveryEmail.required}>
            <IconField icon={Mail} type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="admin@email.com" />
          </FormField>
          <FormField label={SF.adminMobile.label} required={SF.adminMobile.required}>
            <IconField icon={Phone} value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
        </FormRow>
        <FormField label={SF.adminUserId.label} required={SF.adminUserId.required}>
          <UserIdField value={adminUserId} onChange={setAdminUserId} suggestions={adminSuggestions} accountType="school" />
        </FormField>
        <FormRow cols={2}>
          <FormField label={SF.password.label} required={SF.password.required}>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label={SF.confirmPassword.label} required={SF.confirmPassword.required}>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="School Preferences" accountType="school">
        <FormRow cols={2}>
          <FormField label={SF.gradesOffered.label} required={SF.gradesOffered.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={gradesOffered || undefined} onValueChange={setGradesOffered} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select grade range" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.school_grade_ranges ?? []).map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
          <FormField label={SF.studentStrength.label} required={SF.studentStrength.required}>
            <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="select">
              <Select value={studentStrength || undefined} onValueChange={setStudentStrength} disabled={!options}>
                <SignupSelectTrigger><SelectValue placeholder="Select student strength" /></SignupSelectTrigger>
                <SelectContent>
                  {(options?.student_strength ?? []).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionsSlot>
          </FormField>
        </FormRow>
        <FormField label={SF.curricula.label} required={SF.curricula.required}>
          <OptionsSlot loading={optionsLoading} error={optionsError} onRetry={retryOptions} variant="pills">
            <PillSelect
              options={options?.curricula ?? []}
              value={curricula}
              onChange={(v) => setCurricula(v as string[])}
              multiple
              accountType="school"
            />
          </OptionsSlot>
        </FormField>
      </FormSection>

    

      <SubmitButton accountType="school" onClick={submit} loading={loading} label="Create School Account" />
    </div>
  );
}
