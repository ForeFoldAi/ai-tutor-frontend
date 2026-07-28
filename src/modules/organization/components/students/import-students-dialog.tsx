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
import type { AddStudentRowValues } from "@/modules/organization/components/students/add-student-dialog";
import { csvToRecords, pickCsvColumns } from "@/modules/organization/utils/parse-csv";

const STUDENT_COLUMNS = ["roll_number", "student_name", "parent_phone", "parent_email"] as const;

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: AddStudentRowValues[]) => void;
  /** When true, only the dialog content is rendered (open via onOpenChange). */
  hideTrigger?: boolean;
}

function downloadStudentsTemplate() {
  const csv =
    "roll_number*,student_name*,parent_phone*,parent_email*\n" +
    "1042,Rahul Sharma,+91 98765 43210,rahul.parent@email.com\n" +
    "1043,Priya Reddy,+91 91234 56789,priya.parent@email.com\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseStudentImport(text: string): { rows: AddStudentRowValues[]; error?: string } {
  const records = csvToRecords(text);
  if (records.length === 0) {
    return { rows: [], error: "The file is empty or has no data rows." };
  }

  const { rows, missingHeaders } = pickCsvColumns(records, [...STUDENT_COLUMNS]);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      error: `Missing column(s): ${missingHeaders.join(", ")}. Use the template format.`,
    };
  }

  const parsed: AddStudentRowValues[] = [];
  for (const row of rows) {
    const roll_number = row.roll_number.trim();
    const student_name = row.student_name.trim();
    const parent_phone = row.parent_phone.trim();
    const parent_email = row.parent_email.trim();
    if (!roll_number || !student_name || !parent_phone || !parent_email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) continue;
    parsed.push({ roll_number, student_name, parent_phone, parent_email });
  }

  if (parsed.length === 0) {
    return { rows: [], error: "No valid student rows found. Check required fields and email format." };
  }

  return { rows: parsed };
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onImport,
  hideTrigger = false,
}: ImportStudentsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const { rows, error } = parseStudentImport(text);
      if (error) {
        toast({ title: "Import failed", description: error, variant: "destructive" });
        return;
      }

      onImport(rows);
      onOpenChange(false);
    } catch {
      toast({
        title: "Import failed",
        description: "Could not read the CSV file.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-9 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm !border !border-slate-300 bg-background hover:!border-slate-400 sm:h-10 sm:gap-2"
          >
            <Download className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
      ) : null}

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
              <span className="font-semibold text-foreground">Important:</span> Columns must be{" "}
              <span className="font-medium text-foreground">
                roll_number, student_name, parent_phone, parent_email
              </span>{" "}
              (same as Add Student).
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
