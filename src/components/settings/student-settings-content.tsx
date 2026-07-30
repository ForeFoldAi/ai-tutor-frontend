import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Mail,
  Lock,
  Globe,
  Moon,
  Sun,
  Camera,
  Check,
  Building2,
  Bot,
  Mic,
  PlayCircle,
  Phone,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getMyProfile, updateMyProfile } from "@/api/profile";
import { getMySettings, updateMySettings } from "@/api/settings";
import { getSchoolDetail, updateSchoolProfile } from "@/api/organization";
import { fetchSignupOptions } from "@/api/signup";
import type { SignupOptions, UserSettings } from "@/api/types";
import { parseStudentApiError } from "@/lib/student-messages";
import { Checkbox } from "@/components/ui/checkbox";
import { SCHOOL_SIGNUP_FIELDS, STUDENT_SIGNUP_FIELDS } from "@/components/auth/signup/signup-fields";
import { MethodCard, PillSelect, signupFieldClass } from "@/components/auth/signup/signup-shared";
import { isIndividualStudent } from "@/lib/app-nav-items";
import { UserRole } from "@/types/schema";

export type SettingsTab = "profile" | "school" | "notifications" | "appearance" | "security";

const SF = SCHOOL_SIGNUP_FIELDS;
const STF = STUDENT_SIGNUP_FIELDS;
const fieldClass = cn(
  signupFieldClass,
  "dark:!border-slate-600 dark:bg-background dark:hover:!border-slate-500",
);

const LEARNING_METHOD_META: Record<string, { title: string; description: string; icon: typeof Bot }> = {
  "ai-tutor": { title: "AI Tutor (Text to Text)", description: "Chat with AI for step-by-step explanations.", icon: Bot },
  "ai-voice": { title: "AI Voice Tutor", description: "Learn hands-free with voice interaction.", icon: Mic },
  videos: { title: "Pre-recorded Videos", description: "Watch concept videos at your own pace.", icon: PlayCircle },
};

const ALL_NAV_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  description: string;
}[] = [
  { id: "profile", label: "Profile", icon: User, description: "Personal details" },
  { id: "school", label: "School", icon: Building2, description: "School profile" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alerts & reminders" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme & display" },
  { id: "security", label: "Security", icon: Shield, description: "Password & access" },
];

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TUTOR: "Tutor",
  SCHOOL_ADMIN: "School Admin",
  MASTER_ADMIN: "Master Admin",
  student: "Student",
  tutor: "Tutor",
  school_admin: "School Admin",
  org_admin: "Organization",
  master_admin: "Master Admin",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
};

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
    </div>
  );
}

function SettingsContentSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[clamp(12rem,17vw,16rem)_minmax(0,1fr)]">
      <Card className="h-fit shadow-card">
        <CardContent className="space-y-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

interface StudentSettingsContentProps {
  excludeTabs?: SettingsTab[];
  /** School-admin: show School tab + phone on profile. */
  includeSchool?: boolean;
}

export function StudentSettingsContent({
  excludeTabs = [],
  includeSchool = false,
}: StudentSettingsContentProps) {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isStudent = user?.role === UserRole.STUDENT;
  const isIndividual = isIndividualStudent(user?.role, user?.schoolId, user?.createdBy);
  const hiddenTabs: SettingsTab[] = includeSchool ? excludeTabs : [...excludeTabs, "school"];
  const navItems = ALL_NAV_ITEMS.filter((item) => !hiddenTabs.includes(item.id));
  const [activeTab, setActiveTab] = useState<SettingsTab>(navItems[0]?.id ?? "profile");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [language, setLanguage] = useState("en");

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    assignments: true,
    classes: true,
    messages: false,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [gradesOffered, setGradesOffered] = useState("");
  const [studentStrength, setStudentStrength] = useState("");
  const [curricula, setCurricula] = useState<string[]>([]);
  const [signupOptions, setSignupOptions] = useState<SignupOptions | null>(null);

  const [grade, setGrade] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [learningMethod, setLearningMethod] = useState("");

  const applySettings = (settings: UserSettings) => {
    setUsername(settings.username ?? "");
    setLanguage(settings.language);
    setTheme(settings.theme);
    setNotifications({
      email: settings.notify_email,
      push: settings.notify_push,
      assignments: settings.notify_assignments,
      classes: settings.notify_sessions,
      messages: settings.notify_messages,
    });
    updateUser({ username: settings.username ?? user?.username ?? "" });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loaders: Promise<unknown>[] = [getMyProfile(), getMySettings()];
    if (includeSchool || isIndividual) {
      loaders.push(fetchSignupOptions());
    }
    if (includeSchool) {
      loaders.push(getSchoolDetail());
    }

    Promise.all(loaders)
      .then((results) => {
        if (cancelled) return;
        const profile = results[0] as Awaited<ReturnType<typeof getMyProfile>>;
        const settings = results[1] as UserSettings;
        setFullName(profile.full_name);
        setEmail(profile.email);
        setPhone(profile.phone ?? "");
        setDesignation(profile.designation ?? "");
        if (isStudent) {
          setParentPhone(profile.phone ?? "");
          if (isIndividual) {
            setGrade(profile.student_grade ?? "");
            setParentEmail(profile.parent_email ?? "");
            setCurricula(profile.curricula ?? []);
            setFavoriteSubjects(profile.favorite_subjects ?? []);
            setLearningGoals(profile.learning_goals ?? []);
            setLearningMethod(profile.preferred_learning_method ?? "");
          }
        }
        applySettings(settings);
        updateUser({
          fullName: profile.full_name,
          email: profile.email,
          username: settings.username ?? profile.email.split("@", 1)[0],
        });
        // loaders: [profile, settings, ?(signupOptions), ?(school)]
        let nextIdx = 2;
        if (includeSchool || isIndividual) {
          setSignupOptions(results[nextIdx++] as SignupOptions);
        }
        if (includeSchool) {
          const school = results[nextIdx] as Awaited<ReturnType<typeof getSchoolDetail>>;
          setSchoolName(school.name);
          setSchoolEmail(school.email ?? "");
          setSchoolPhone(school.phone ?? "");
          setWebsite(school.website ?? "");
          setAddress(school.address ?? "");
          setGradesOffered(school.grades_offered ?? "");
          setStudentStrength(school.student_strength ?? "");
          setCurricula(school.curricula ?? []);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (user) {
          setFullName(user.fullName);
          setEmail(user.email);
          setUsername(user.username);
        }
        toast({
          title: "Could not load settings",
          description: parseStudentApiError(error, "Please try again."),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeSchool, isStudent, isIndividual]);

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || "User" : "User";

  const handleSaveProfile = async () => {
    if (isIndividual && !grade.trim()) {
      toast({ title: "Select your grade", variant: "destructive" });
      return;
    }
    if (isIndividual && !curricula.length) {
      toast({ title: "Choose a curriculum", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const profilePayload = isStudent
        ? isIndividual
          ? {
              full_name: fullName.trim(),
              email: email.trim(),
              phone: parentPhone.trim() || null,
              grade: grade.trim(),
              curricula,
              parent_email: parentEmail.trim() || null,
              favorite_subjects: favoriteSubjects,
              learning_goals: learningGoals,
              preferred_learning_method: learningMethod || null,
            }
          : {
              full_name: fullName.trim(),
              email: email.trim(),
              phone: parentPhone.trim() || null,
            }
        : {
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            ...(includeSchool ? { designation: designation.trim() || null } : {}),
          };
      const [profile, settings] = await Promise.all([
        updateMyProfile(profilePayload),
        updateMySettings({ username: username.trim() || null, language: language.trim() || "en" }),
      ]);
      setDesignation(profile.designation ?? "");
      if (isStudent) {
        setParentPhone(profile.phone ?? "");
        if (isIndividual) {
          setGrade(profile.student_grade ?? "");
          setParentEmail(profile.parent_email ?? "");
          setCurricula(profile.curricula ?? []);
          setFavoriteSubjects(profile.favorite_subjects ?? []);
          setLearningGoals(profile.learning_goals ?? []);
          setLearningMethod(profile.preferred_learning_method ?? "");
        }
      }
      updateUser({
        fullName: profile.full_name,
        email: profile.email,
        username: settings.username ?? username.trim(),
      });
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: parseStudentApiError(error, "Could not save profile."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchool = async () => {
    if (!schoolName.trim() || !schoolEmail.trim() || !schoolPhone.trim() || !address.trim()) {
      toast({
        title: "Fill required fields",
        description: "School name, email, phone, and address are required.",
        variant: "destructive",
      });
      return;
    }
    if (!gradesOffered || !studentStrength || !curricula.length) {
      toast({
        title: "Complete school preferences",
        description: "Grades, student strength, and curriculum are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateSchoolProfile({
        name: schoolName,
        email: schoolEmail,
        phone: schoolPhone,
        website,
        address,
        grades_offered: gradesOffered,
        student_strength: studentStrength,
        curricula,
      });
      toast({ title: "School saved", description: "School details have been updated." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: parseStudentApiError(error, "Could not save school details."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const settings = await updateMySettings({
        notify_email: notifications.email,
        notify_push: notifications.push,
        notify_assignments: notifications.assignments,
        notify_sessions: notifications.classes,
        notify_messages: notifications.messages,
      });
      applySettings(settings);
      toast({ title: "Preferences saved", description: "Notification settings updated." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: parseStudentApiError(error, "Could not save notifications."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (next: "light" | "dark") => {
    setTheme(next);
    try {
      await updateMySettings({ theme: next });
    } catch (error) {
      toast({
        title: "Theme not saved",
        description: parseStudentApiError(error, "Theme applied locally only."),
        variant: "destructive",
      });
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing fields",
        description: "Enter your current and new password.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match the new password.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateMyProfile({
        full_name: fullName.trim() || user?.fullName || "",
        email: email.trim() || user?.email || "",
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    } catch (error) {
      toast({
        title: "Update failed",
        description: parseStudentApiError(error, "Could not update password."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <div className="shrink-0 space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <SettingsContentSkeleton />
      </div>
    );
  }

  const tabContent = (
    <>
      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-card">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 px-3 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 border-4 border-background shadow-md sm:h-20 sm:w-20">
                    <AvatarFallback className="bg-gradient-brand text-lg text-primary-foreground sm:text-xl">
                      {fullName?.charAt(0)?.toUpperCase() || user?.fullName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm"
                    aria-label="Change photo"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-foreground">
                    {fullName || user?.fullName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{email || user?.email}</p>
                  <Badge className="mt-1.5 bg-primary/10 text-primary hover:bg-primary/10">{roleLabel}</Badge>
                </div>
              </div>
            </div>

            <CardContent className="space-y-4 p-3 sm:p-5">
              {includeSchool ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="fullName"
                      label={SF.adminName.label}
                      required={SF.adminName.required}
                    />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className={fieldClass}
                      data-testid="input-fullname"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="designation"
                      label={SF.designation.label}
                      required={SF.designation.required}
                    />
                    <Input
                      id="designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="School Administrator"
                      className={fieldClass}
                      data-testid="input-designation"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="email"
                      label={SF.recoveryEmail.label}
                      required={SF.recoveryEmail.required}
                    />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@email.com"
                        className={cn("pl-9", fieldClass)}
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="phone"
                      label={SF.adminMobile.label}
                      required={SF.adminMobile.required}
                    />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={fieldClass}
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel
                      htmlFor="username"
                      label={SF.adminUserId.label}
                      required={SF.adminUserId.required}
                    />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={fieldClass}
                      data-testid="input-username"
                    />
                  </div>
                </div>
              ) : isStudent ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Basic Information</h2>
                    <p className="text-sm text-muted-foreground">
                      {isIndividual
                        ? "Same details collected during individual student signup"
                        : "Update your name, contact, and login details"}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="fullName"
                        label={STF.fullName.label}
                        required={STF.fullName.required}
                      />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className={fieldClass}
                        data-testid="input-fullname"
                      />
                    </div>
                    {isIndividual ? (
                      <div className="space-y-2">
                        <FieldLabel htmlFor="grade" label={STF.grade.label} required={STF.grade.required} />
                        <Select value={grade || undefined} onValueChange={setGrade}>
                          <SelectTrigger id="grade" className={fieldClass}>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {(signupOptions?.student_grades ?? []).map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="parentPhone"
                        label={isIndividual ? STF.parentPhone.label : "Phone"}
                      />
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="parentPhone"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className={cn("pl-9", fieldClass)}
                        />
                      </div>
                    </div>
                    {isIndividual ? (
                      <>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="parentEmail" label={STF.parentEmail.label} />
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="parentEmail"
                              type="email"
                              value={parentEmail}
                              onChange={(e) => setParentEmail(e.target.value)}
                              placeholder="parent@email.com"
                              className={cn("pl-9", fieldClass)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <FieldLabel
                            htmlFor="curricula"
                            label={STF.curricula.label}
                            required={STF.curricula.required}
                          />
                          <PillSelect
                            options={signupOptions?.curricula ?? []}
                            value={curricula}
                            onChange={(v) => setCurricula(v as string[])}
                            multiple
                            accountType="student"
                          />
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Login Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="username"
                          label={STF.userId.label}
                          required={STF.userId.required}
                        />
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={fieldClass}
                          data-testid="input-username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Recovery Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={cn("pl-9", fieldClass)}
                            data-testid="input-email"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="language"
                            value={LANGUAGE_LABELS[language] ?? language}
                            onChange={(e) => {
                              const value = e.target.value.toLowerCase();
                              if (value === "english") setLanguage("en");
                              else if (value === "hindi") setLanguage("hi");
                              else if (value === "telugu") setLanguage("te");
                              else setLanguage(value.slice(0, 32));
                            }}
                            className={cn("pl-9", fieldClass)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isIndividual ? (
                    <div className="border-t border-border/60 pt-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">Personalize Learning</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <FieldLabel htmlFor="subjects" label={STF.subjects.label} />
                          <PillSelect
                            options={signupOptions?.student_subjects ?? []}
                            value={favoriteSubjects}
                            onChange={(v) => setFavoriteSubjects(v as string[])}
                            multiple
                            accountType="student"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="goals" label={STF.goals.label} />
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {(signupOptions?.learning_goals ?? []).map((g) => (
                              <label
                                key={g}
                                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                              >
                                <Checkbox
                                  checked={learningGoals.includes(g)}
                                  onCheckedChange={(c) =>
                                    setLearningGoals(c ? [...learningGoals, g] : learningGoals.filter((x) => x !== g))
                                  }
                                />
                                {g}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="method" label={STF.method.label} />
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                            {(signupOptions?.learning_methods ?? []).map((m) => {
                              const meta = LEARNING_METHOD_META[m];
                              if (!meta) return null;
                              return (
                                <MethodCard
                                  key={m}
                                  title={meta.title}
                                  description={meta.description}
                                  icon={meta.icon}
                                  selected={learningMethod === m}
                                  onSelect={() => setLearningMethod(m)}
                                  accountType="student"
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={fieldClass}
                      data-testid="input-fullname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={fieldClass}
                      data-testid="input-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn("pl-9", fieldClass)}
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className={cn("pl-9", fieldClass)}
                        data-testid="input-phone"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="language">Language</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="language"
                        value={LANGUAGE_LABELS[language] ?? language}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase();
                          if (value === "english") setLanguage("en");
                          else if (value === "hindi") setLanguage("hi");
                          else if (value === "telugu") setLanguage("te");
                          else setLanguage(value.slice(0, 32));
                        }}
                        className={cn("pl-9", fieldClass)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-gradient-brand"
                data-testid="button-save-profile"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "school" && includeSchool && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">School Information</h2>
              <p className="text-sm text-muted-foreground">
                Same details collected during school signup
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="schoolName"
                  label={SF.schoolName.label}
                  required={SF.schoolName.required}
                />
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Greenwood High School"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="schoolEmail"
                  label={SF.schoolEmail.label}
                  required={SF.schoolEmail.required}
                />
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="admin@school.edu"
                    className={cn("pl-9", fieldClass)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="schoolPhone"
                  label={SF.schoolPhone.label}
                  required={SF.schoolPhone.required}
                />
                <Input
                  id="schoolPhone"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="website" label={SF.website.label} />
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://school.edu"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FieldLabel
                  htmlFor="address"
                  label={SF.address.label}
                  required={SF.address.required}
                />
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State"
                  rows={2}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="border-t border-border/60 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">School Preferences</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="gradesOffered"
                    label={SF.gradesOffered.label}
                    required={SF.gradesOffered.required}
                  />
                  <Select value={gradesOffered || undefined} onValueChange={setGradesOffered}>
                    <SelectTrigger id="gradesOffered" className={fieldClass}>
                      <SelectValue placeholder="Select grade range" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(signupOptions?.school_grade_ranges)
                        ? signupOptions.school_grade_ranges
                        : []
                      ).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="studentStrength"
                    label={SF.studentStrength.label}
                    required={SF.studentStrength.required}
                  />
                  <Select value={studentStrength || undefined} onValueChange={setStudentStrength}>
                    <SelectTrigger id="studentStrength" className={fieldClass}>
                      <SelectValue placeholder="Select student strength" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(signupOptions?.student_strength)
                        ? signupOptions.student_strength
                        : []
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <FieldLabel
                  htmlFor="curricula"
                  label={SF.curricula.label}
                  required={SF.curricula.required}
                />
                <PillSelect
                  options={Array.isArray(signupOptions?.curricula) ? signupOptions.curricula : []}
                  value={curricula}
                  onChange={(v) => setCurricula(v as string[])}
                  multiple
                  accountType="school"
                />
              </div>
            </div>

            <Button onClick={handleSaveSchool} disabled={isSaving} className="bg-gradient-brand">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground">Choose what notifications you receive</p>
            </div>

            <div className="space-y-2">
              <SettingRow
                label="Email Notifications"
                description="Receive notifications via email"
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                testId="switch-email-notifications"
              />
              <SettingRow
                label="Push Notifications"
                description="Receive push notifications in browser"
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                testId="switch-push-notifications"
              />
              <SettingRow
                label="Assignment Reminders"
                description="Get reminded about upcoming assignments"
                checked={notifications.assignments}
                onCheckedChange={(checked) => setNotifications({ ...notifications, assignments: checked })}
                testId="switch-assignment-notifications"
              />
              <SettingRow
                label="Session Reminders"
                description="Get notified before scheduled sessions"
                checked={notifications.classes}
                onCheckedChange={(checked) => setNotifications({ ...notifications, classes: checked })}
                testId="switch-class-notifications"
              />
              <SettingRow
                label="Messages"
                description="Notifications for new messages"
                checked={notifications.messages}
                onCheckedChange={(checked) => setNotifications({ ...notifications, messages: checked })}
              />
            </div>

            <Button onClick={handleSaveNotifications} disabled={isSaving} className="bg-gradient-brand">
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "appearance" && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how the app looks</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  theme === "light"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/30"
                )}
                data-testid="button-theme-light"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
                  <Sun className="h-5 w-5 text-amber-600" />
                </div>
                <p className="font-semibold text-foreground">Light</p>
                <p className="text-xs text-muted-foreground">Clean and bright</p>
                {theme === "light" && <Check className="mt-2 h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  theme === "dark"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/30"
                )}
                data-testid="button-theme-dark"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/40">
                  <Moon className="h-5 w-5 text-blue-600" />
                </div>
                <p className="font-semibold text-foreground">Dark</p>
                <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                {theme === "dark" && <Check className="mt-2 h-4 w-4 text-primary" />}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Security Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your password and security options</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={cn("pl-9", fieldClass)}
                    data-testid="input-current-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={cn("pl-9", fieldClass)}
                    data-testid="input-new-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={cn("pl-9", fieldClass)}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSavePassword} disabled={isSaving} className="bg-gradient-brand">
              <Save className="mr-2 h-4 w-4" />
              Update Password
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[clamp(12rem,17vw,16rem)_minmax(0,1fr)] lg:gap-4">
        <Card className="h-fit shrink-0 shadow-card lg:h-full lg:max-h-none">
          <CardContent className="p-2 sm:p-3">
            <nav
              className={cn(
                "grid gap-1 lg:flex lg:flex-col",
                navItems.length >= 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4",
              )}
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center transition-colors lg:w-full lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:text-left",
                    activeTab === item.id
                      ? "bg-gradient-brand text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-tight sm:text-xs lg:text-sm">
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "hidden truncate text-xs lg:block",
                        activeTab === item.id ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 lg:overflow-y-auto">{tabContent}</div>
      </div>
    </div>
  );
}
