import { Download, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CredentialsToolbarProps {
  onDownloadExcel: () => void;
  onSendCreds: () => void;
  onAddCreds: () => void;
}

export function CredentialsToolbar({ onDownloadExcel, onSendCreds, onAddCreds }: CredentialsToolbarProps) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
        onClick={onDownloadExcel}
      >
        <Download className="h-4 w-4" />
        Download
      </Button>
      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 whitespace-nowrap !border !border-slate-300 hover:!border-slate-400"
        onClick={onSendCreds}
      >
        <Mail className="h-4 w-4" />
        Send Creds
      </Button>
      <Button className="h-10 shrink-0 gap-2 whitespace-nowrap bg-primary px-4" onClick={onAddCreds}>
        <Plus className="h-4 w-4" />
        Add Creds
      </Button>
    </div>
  );
}
