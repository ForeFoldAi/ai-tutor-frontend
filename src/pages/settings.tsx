import { StudentSettingsContent } from "@/components/settings/student-settings-content";

export default function SettingsPage() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
      <StudentSettingsContent />
    </div>
  );
}
