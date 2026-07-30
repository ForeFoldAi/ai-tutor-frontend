import { PageShell } from "@/components/page-shell";
import { StudentSettingsContent } from "@/components/settings/student-settings-content";

export default function OrganizationSettingsPage() {
  return (
    <PageShell size="standard" contentClassName="min-h-0 flex-1">
      <StudentSettingsContent includeSchool />
    </PageShell>
  );
}
