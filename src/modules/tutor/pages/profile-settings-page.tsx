import { StudentSettingsContent } from "@/components/settings/student-settings-content";

/** Same settings shell as student / school-admin (tabs + shared preferences). */
export default function TutorProfileSettingsPage() {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
      <StudentSettingsContent />
    </div>
  );
}
