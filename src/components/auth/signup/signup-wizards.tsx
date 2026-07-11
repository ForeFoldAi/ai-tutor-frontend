import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bot,
  Building2,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  Mic,
  Phone,
  PlayCircle,
  RefreshCw,
  Upload,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/api";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { cn } from "@/lib/utils";
import { SIGNUP_THEMES } from "./signup-shell";
import {
  FormField,
  FormRow,
  FormSection,
  IconField,
  MethodCard,
  PasswordField,
  PillSelect,
  SignupSelectTrigger,
  SignupTextarea,
  signupFieldClass,
  SuccessPanel,
  UserIdField,
} from "./signup-shared";

const CURRICULUMS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Cambridge"];
const GRADES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const SUBJECTS = ["Mathematics", "Science", "English", "Computer", "Hindi", "Sanskrit"];
const LEARNING_GOALS = ["Improve Grades", "Exam Preparation", "Build Concepts", "Homework Help", "Competitive Exams"];

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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [board, setBoard] = useState("");
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
    if (!fullName.trim()) {
      toast({ title: "Enter your name", variant: "destructive" });
      return;
    }
    if (!grade) {
      toast({ title: "Select your grade", variant: "destructive" });
      return;
    }
    if (!board) {
      toast({ title: "Choose a curriculum", variant: "destructive" });
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
      const email = parentEmail.trim() || `${userId || slugName(fullName)}@signup.aitutor.app`;
      const res = await fetch(`${API_BASE}/auth/signup/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          school_name: "Individual Learning",
          grade: grade.replace("Grade ", ""),
          board,
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <FormHeader
        accountType="student"
        eyebrow="Individual Student Signup"
        title="Start your personalized learning journey"
      />

      <FormSection title="Basic Information" accountType="student">
        <FormRow cols={2}>
          <FormField label="Full Name" required>
            <IconField icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rahul Sharma" />
          </FormField>
          <FormField label="Grade / Class" required>
            <Select value={grade || undefined} onValueChange={setGrade}>
              <SignupSelectTrigger><SelectValue placeholder="Select grade" /></SignupSelectTrigger>
              <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label="Parent Phone (Optional)">
            <IconField icon={Phone} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="Parent Email (Optional)">
            <IconField icon={Mail} type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@email.com" />
          </FormField>
        </FormRow>
        <FormField label="Choose Curriculum" required>
          <PillSelect options={CURRICULUMS} value={board} onChange={(v) => setBoard(v as string)} accountType="student" />
        </FormField>
      </FormSection>

      <FormSection title="Login Details" accountType="student">
        <FormField label="Choose User ID" required>
          <UserIdField value={userId} onChange={setUserId} suggestions={suggestions} accountType="student" />
        </FormField>
        <FormRow cols={2}>
          <FormField label="Password" required>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label="Confirm Password" required>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Personalize Learning" accountType="student">
        <FormField label="Favorite Subjects">
          <PillSelect options={SUBJECTS} value={subjects} onChange={(v) => setSubjects(v as string[])} multiple accountType="student" />
        </FormField>
        <FormField label="Learning Goals">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {LEARNING_GOALS.map((g) => (
              <label key={g} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <Checkbox checked={goals.includes(g)} onCheckedChange={(c) => setGoals(c ? [...goals, g] : goals.filter((x) => x !== g))} />
                {g}
              </label>
            ))}
          </div>
        </FormField>
        <FormField label="Preferred Learning Method">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <MethodCard accountType="student" title="AI Tutor (Text to Text)" description="Chat with AI for step-by-step explanations." icon={Bot} selected={method === "ai-tutor"} onSelect={() => setMethod("ai-tutor")} />
            <MethodCard accountType="student" title="AI Voice Tutor" description="Learn hands-free with voice interaction." icon={Mic} selected={method === "ai-voice"} onSelect={() => setMethod("ai-voice")} />
            <MethodCard accountType="student" title="Pre-recorded Videos" description="Watch concept videos at your own pace." icon={PlayCircle} selected={method === "videos"} onSelect={() => setMethod("videos")} />
          </div>
        </FormField>
      </FormSection>

      <SubmitButton accountType="student" onClick={submit} loading={loading} />
    </div>
  );
}

// ─── Teacher ─────────────────────────────────────────────────────────────────

const TEACHER_SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "English", "Biology"];
const EXPERIENCE = ["Less than 1 Year", "1-3 Years", "3-5 Years", "5+ Years"];
const GRADE_RANGES = ["1st Grade - 5th Grade", "6th Grade - 10th Grade", "11th Grade - 12th Grade", "All Grades"];
const CLASS_SIZES = ["1 - 20 Students", "21 - 40 Students", "41 - 60 Students", "60+ Students"];

export function TeacherSignupWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
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
  const [teachingMode, setTeachingMode] = useState("");
  const [bio, setBio] = useState("");
  const [classSize, setClassSize] = useState("");

  const suggestions = useMemo(() => {
    const base = slugName(fullName);
    if (!base) return [];
    return [`mathwith${base}`, `${base}.math`, `teach.${base}`];
  }, [fullName]);

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      toast({ title: "Check your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    // ponytail: no tutor self-signup endpoint yet — UI completes with success state
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <FormHeader accountType="teacher" eyebrow="Individual Teacher Signup" title="Set up your teaching profile" />

      <FormSection title="Teacher Details" accountType="teacher">
        <FormRow cols={2}>
          <FormField label="Full Name" required>
            <IconField icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anita Verma" />
          </FormField>
          <FormField label="Teaching Experience" required>
            <Select value={experience || undefined} onValueChange={setExperience}>
              <SignupSelectTrigger><SelectValue placeholder="Select experience" /></SignupSelectTrigger>
              <SelectContent>{EXPERIENCE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label="Grades You Teach" required>
            <Select value={gradeRange || undefined} onValueChange={setGradeRange}>
              <SignupSelectTrigger><SelectValue placeholder="Select grades" /></SignupSelectTrigger>
              <SelectContent>{GRADE_RANGES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Class Size (Average)" required>
            <Select value={classSize || undefined} onValueChange={setClassSize}>
              <SignupSelectTrigger><SelectValue placeholder="Select class size" /></SignupSelectTrigger>
              <SelectContent>{CLASS_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </FormRow>
        <FormField label="Teaching Subjects" required>
          <PillSelect options={TEACHER_SUBJECTS} value={teachSubjects} onChange={(v) => setTeachSubjects(v as string[])} multiple accountType="teacher" />
        </FormField>
        <FormRow cols={2}>
          <FormField label="Email (for recovery)" required>
            <IconField icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anita@email.com" />
          </FormField>
          <FormField label="Mobile Number (for recovery)" required>
            <IconField icon={Phone} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Login Details" accountType="teacher">
        <FormField label="Choose Teacher User ID" required>
          <UserIdField value={userId} onChange={setUserId} suggestions={suggestions} accountType="teacher" />
        </FormField>
        <FormRow cols={2}>
          <FormField label="Password" required>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label="Confirm Password" required>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Teaching Profile" accountType="teacher">
        <FormField label="Teaching Mode" required>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["online", "in-person", "hybrid"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTeachingMode(m)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium capitalize",
                  teachingMode === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-muted-foreground hover:border-slate-400"
                )}
              >
                {m.replace("-", " ")}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Short Bio / Introduction (Optional)">
          <SignupTextarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))} placeholder="Tell students about your teaching style..." rows={3} />
          <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length} / 200</p>
        </FormField>
      </FormSection>

      <SubmitButton accountType="teacher" onClick={submit} loading={loading} />
    </div>
  );
}

// ─── School ──────────────────────────────────────────────────────────────────

const DEMO_STUDENTS = [
  { name: "Rahul Sharma", grade: "6 - A", userId: "rahul.sharma", password: "Rs@4837", type: "Teacher Guided", teacher: "Anita Verma" },
  { name: "Priya Patel", grade: "6 - B", userId: "priya.patel", password: "Pp@2910", type: "Self Learning", teacher: "Anita Verma" },
  { name: "Arjun Singh", grade: "7 - A", userId: "arjun.singh", password: "As@7721", type: "Teacher Guided", teacher: "Rajesh Kumar" },
];
const DEMO_TEACHERS = [
  { name: "Anita Verma", grade: "6-10", userId: "anita.verma", password: "Av@5521", type: "Mathematics", teacher: "—" },
  { name: "Rajesh Kumar", grade: "7-9", userId: "rajesh.kumar", password: "Rk@8834", type: "Science", teacher: "—" },
];

export function SchoolSignupWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
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
    if (!schoolName.trim() || !schoolEmail.trim() || !adminName.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      toast({ title: "Check your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const email = recoveryEmail.trim() || schoolEmail.trim();
      const res = await fetch(`${API_BASE}/auth/signup/organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: adminName,
          email,
          password,
          organization_name: schoolName,
          phone: schoolPhone || adminMobile,
          address,
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
      <div className="mx-auto max-w-lg text-center">
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
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <FormHeader accountType="school" eyebrow="School Signup" title="Set up your school workspace in minutes" />

      <FormSection title="School Information" accountType="school">
        <FormRow cols={2}>
          <FormField label="School Name" required>
            <IconField icon={Building2} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Greenwood High School" />
          </FormField>
          <FormField label="Official School Email" required>
            <IconField icon={Mail} type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder="admin@school.edu" />
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label="Phone Number" required>
            <IconField icon={Phone} value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="School Website (Optional)">
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://school.edu" className={cn("h-10", signupFieldClass)} />
          </FormField>
        </FormRow>
        <FormField label="School Address" required>
          <SignupTextarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State" rows={2} />
        </FormField>
      </FormSection>

      <FormSection title="Administrator Login" accountType="school">
        <FormRow cols={2}>
          <FormField label="Administrator Name" required>
            <IconField icon={User} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" />
          </FormField>
          <FormField label="Designation" required>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="School Administrator" className={cn("h-10", signupFieldClass)} />
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label="Recovery Email" required>
            <IconField icon={Mail} type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="admin@email.com" />
          </FormField>
          <FormField label="Mobile Number" required>
            <IconField icon={Phone} value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="+91 98765 43210" />
          </FormField>
        </FormRow>
        <FormField label="Choose Admin User ID" required>
          <UserIdField value={adminUserId} onChange={setAdminUserId} suggestions={adminSuggestions} accountType="school" />
        </FormField>
        <FormRow cols={2}>
          <FormField label="Create Password" required>
            <PasswordField value={password} onChange={setPassword} />
          </FormField>
          <FormField label="Confirm Password" required>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="School Preferences" accountType="school">
        <FormRow cols={2}>
          <FormField label="Grades Offered" required>
            <Select value={gradesOffered || undefined} onValueChange={setGradesOffered}>
              <SignupSelectTrigger><SelectValue placeholder="Select grade range" /></SignupSelectTrigger>
              <SelectContent>
                <SelectItem value="1st Grade - 5th Grade">1st Grade - 5th Grade</SelectItem>
                <SelectItem value="1st Grade - 10th Grade">1st Grade - 10th Grade</SelectItem>
                <SelectItem value="6th Grade - 12th Grade">6th Grade - 12th Grade</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Student Strength" required>
            <Select value={studentStrength || undefined} onValueChange={setStudentStrength}>
              <SignupSelectTrigger><SelectValue placeholder="Select student strength" /></SignupSelectTrigger>
              <SelectContent>
                <SelectItem value="1 - 100 Students">1 - 100 Students</SelectItem>
                <SelectItem value="101 - 500 Students">101 - 500 Students</SelectItem>
                <SelectItem value="501 - 1000 Students">501 - 1000 Students</SelectItem>
                <SelectItem value="1000+ Students">1000+ Students</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
        <FormField label="Curriculum Offered" required>
          <PillSelect options={CURRICULUMS} value={curricula} onChange={(v) => setCurricula(v as string[])} multiple accountType="school" />
        </FormField>
      </FormSection>

      <FormSection title="Bulk Onboarding" accountType="school">
        <FormRow cols={2}>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <Upload className="h-8 w-8 text-blue-600" />
            <p className="mt-2 text-sm font-semibold text-foreground">Upload Teachers</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag & drop Excel/CSV</p>
            <button type="button" className="mt-2 text-xs font-medium text-blue-600 hover:underline">
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
              Download template
            </button>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <Upload className="h-8 w-8 text-blue-600" />
            <p className="mt-2 text-sm font-semibold text-foreground">Upload Students</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag & drop Excel/CSV</p>
            <button type="button" className="mt-2 text-xs font-medium text-blue-600 hover:underline">
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
              Download template
            </button>
          </div>
        </FormRow>
        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="teachers">Teachers ({DEMO_TEACHERS.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({DEMO_STUDENTS.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="teachers">
            <CredentialsPreviewTable rows={DEMO_TEACHERS} isTeacher />
          </TabsContent>
          <TabsContent value="students">
            <CredentialsPreviewTable rows={DEMO_STUDENTS} />
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-slate-300"><RefreshCw className="h-3.5 w-3.5" />Regenerate All Passwords</Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-slate-300"><Download className="h-3.5 w-3.5" />Download Preview (Excel)</Button>
        </div>
      </FormSection>

      <SubmitButton accountType="school" onClick={submit} loading={loading} label="Create School Account" />
    </div>
  );
}

function CredentialsPreviewTable({
  rows,
  isTeacher,
}: {
  rows: { name: string; grade: string; userId: string; password: string; type: string; teacher: string }[];
  isTeacher?: boolean;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-300 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>{isTeacher ? "Grades" : "Grade / Subject"}</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Temp Password</TableHead>
            {!isTeacher && <TableHead>Learning Type</TableHead>}
            {!isTeacher && <TableHead>Assigned Teacher</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.grade}</TableCell>
              <TableCell className="text-muted-foreground">{r.userId}</TableCell>
              <TableCell className="font-mono text-xs">{r.password}</TableCell>
              {!isTeacher && <TableCell>{r.type}</TableCell>}
              {!isTeacher && <TableCell>{r.teacher}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
