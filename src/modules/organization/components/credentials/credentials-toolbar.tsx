import type { ReactNode } from "react";
import { Download, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CredentialsToolbarProps {
  title: ReactNode;
  onDownloadExcel: () => void;
  onSendCreds: () => void;
  onAddCreds: () => void;
}

const outlineBtn =
  "h-9 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm !border !border-slate-300 hover:!border-slate-400 sm:h-10 sm:gap-2";

export function CredentialsToolbar({
  title,
  onDownloadExcel,
  onSendCreds,
  onAddCreds,
}: CredentialsToolbarProps) {
  const secondaryActions = (
    <>
      <Button type="button" variant="outline" className={outlineBtn} onClick={onDownloadExcel}>
        <Download className="h-4 w-4" />
        Download
      </Button>
      <Button type="button" variant="outline" className={outlineBtn} onClick={onSendCreds}>
        <Mail className="h-4 w-4" />
        Send Credentials
      </Button>
    </>
  );

  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1">{title}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">{secondaryActions}</div>
          <Button
            type="button"
            className="h-9 shrink-0 gap-1.5 whitespace-nowrap bg-primary px-3 text-sm sm:h-10 sm:gap-2 sm:px-4"
            onClick={onAddCreds}
          >
            <Plus className="h-4 w-4" />
            Add Credentials
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:hidden">{secondaryActions}</div>
    </>
  );
}
