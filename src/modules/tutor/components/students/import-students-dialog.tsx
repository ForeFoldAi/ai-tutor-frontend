import { useRef } from "react";
import { Download, FileText, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function downloadStudentsTemplate() {
  const csv = "full_name*,email*,grade*,section*,password*\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportStudentsDialog({ open, onOpenChange }: ImportStudentsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    toast({
      title: "File selected",
      description: `${file.name} is ready to import.`,
    });
    event.target.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 !border !border-slate-300 bg-background hover:!border-slate-400"
        >
          <Download className="h-4 w-4" />
          Import Students
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="space-y-0 border-b border-border px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Upload className="h-5 w-5 text-primary" />
            Import Students
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-0 px-6 py-5">
          <section className="border-b border-border pb-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-foreground">Download Template</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Download our CSV template with all required fields to ensure proper formatting.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full gap-2 !border !border-slate-300 hover:!border-slate-400"
              onClick={downloadStudentsTemplate}
            >
              <Download className="h-4 w-4" />
              Download Template (CSV)
            </Button>
          </section>

          <section className="border-b border-border py-5">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-foreground">Upload File</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your CSV file with student data. Make sure to follow the template format.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              className="mt-4 w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose File &amp; Upload
            </Button>
          </section>

          <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Important:</span> Fields marked with * are
              required. Make sure your file follows the template format for successful import.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className={cn("min-w-[100px] !border !border-slate-300 hover:!border-slate-400")}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
