import { StudentSettingsContent } from "@/components/settings/student-settings-content";

export default function SettingsPage() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <StudentSettingsContent />
    </div>
  );
}
