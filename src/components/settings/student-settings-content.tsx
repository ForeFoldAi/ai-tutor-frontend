import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getMyProfile, updateMyProfile } from "@/api/profile";
import { getMySettings, updateMySettings } from "@/api/settings";
import type { UserSettings } from "@/api/types";
import { parseStudentApiError } from "@/lib/student-messages";

export type SettingsTab = "profile" | "notifications" | "appearance" | "security";

const ALL_NAV_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  description: string;
}[] = [
  { id: "profile", label: "Profile", icon: User, description: "Personal details" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alerts & reminders" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme & display" },
  { id: "security", label: "Security", icon: Shield, description: "Password & access" },
];

const ROLE_LABELS: Record<string, string> = {
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
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_1fr]">
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
}

export function StudentSettingsContent({ excludeTabs = [] }: StudentSettingsContentProps) {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navItems = ALL_NAV_ITEMS.filter((item) => !excludeTabs.includes(item.id));
  const [activeTab, setActiveTab] = useState<SettingsTab>(navItems[0]?.id ?? "profile");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
    Promise.all([getMyProfile(), getMySettings()])
      .then(([profile, settings]) => {
        if (cancelled) return;
        setFullName(profile.full_name);
        setEmail(profile.email);
        applySettings(settings);
        updateUser({
          fullName: profile.full_name,
          email: profile.email,
          username: settings.username ?? profile.email.split("@", 1)[0],
        });
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
  }, []);

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || "User" : "User";

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const [profile, settings] = await Promise.all([
        updateMyProfile({ full_name: fullName.trim(), email: email.trim() }),
        updateMySettings({ username: username.trim() || null, language: language.trim() || "en" }),
      ]);
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
      <>
        <div className="mb-4 shrink-0 space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <SettingsContentSkeleton />
      </>
    );
  }

  const tabContent = (
    <>
      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-card">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 px-4 py-5 sm:px-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                    <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xl">
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
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-foreground">{fullName || user?.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">{email || user?.email}</p>
                  <Badge className="mt-1.5 bg-primary/10 text-primary hover:bg-primary/10">{roleLabel}</Badge>
                </div>
              </div>
            </div>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    data-testid="input-fullname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                      className="pl-9"
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
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

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
                    className="pl-9"
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
                    className="pl-9"
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
                    className="pl-9"
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
    <>
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit shrink-0 shadow-card lg:h-full lg:max-h-none">
        <CardContent className="p-2 sm:p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex min-w-[140px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full",
                  activeTab === item.id
                    ? "bg-gradient-brand text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p
                    className={cn(
                      "hidden truncate text-xs lg:block",
                      activeTab === item.id ? "text-primary-foreground/80" : "text-muted-foreground"
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

      <div className="min-h-0 flex-1 overflow-y-auto">{tabContent}</div>
    </div>
    </>
  );
}
