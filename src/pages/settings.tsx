import { PageShell } from "@/components/page-shell";
import { StudentSettingsContent } from "@/components/settings/student-settings-content";

export default function SettingsPage() {
  return (
    <PageShell size="standard" contentClassName="min-h-0 flex-1">
      <StudentSettingsContent />
    </PageShell>
  );
}
