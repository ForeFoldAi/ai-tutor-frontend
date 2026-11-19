import { PageShell } from "@/components/page-shell";
import { StudentSettingsContent } from "@/components/settings/student-settings-content";

/** Same settings shell as student / school-admin (tabs + shared preferences). */
export default function TutorProfileSettingsPage() {
  return (
    <PageShell size="standard" contentClassName="min-h-0 flex-1">
      <StudentSettingsContent />
    </PageShell>
  );
}
