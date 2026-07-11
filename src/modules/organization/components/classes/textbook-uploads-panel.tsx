import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadTextbookDialog,
  type UploadTextbookFormValues,
} from "@/modules/organization/components/classes/upload-textbook-dialog";
import type {
  ClassOverviewItem,
  SubjectItem,
  TextbookUploadRow,
  TextbookUploadStatus,
} from "@/modules/organization/types/classes-admin";

const STATUS_STYLES: Record<TextbookUploadStatus, string> = {
  Embedded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Processing: "border-amber-200 bg-amber-50 text-amber-700",
  Failed: "border-red-200 bg-red-50 text-red-600",
};

interface TextbookUploadsPanelProps {
  uploads: TextbookUploadRow[];
  classes: ClassOverviewItem[];
  subjects: SubjectItem[];
  subjectMappings: Record<string, Record<string, boolean>>;
  onUpload: (values: UploadTextbookFormValues) => void;
}

export function TextbookUploadsPanel({
  uploads,
  classes,
  subjects,
  subjectMappings,
  onUpload,
}: TextbookUploadsPanelProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Textbook Uploads</h2>
            <p className="text-sm text-muted-foreground">
              Upload textbook PDFs or DOCX files for a class.
            </p>
          </div>
          <Button className="h-10 shrink-0 gap-2 bg-primary px-4" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <div className="overflow-auto rounded-xl border border-border/70 bg-card">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">File</TableHead>
                <TableHead className="font-semibold text-foreground">Class</TableHead>
                <TableHead className="font-semibold text-foreground">Subject</TableHead>
                <TableHead className="font-semibold text-foreground">Type</TableHead>
                <TableHead className="font-semibold text-foreground">Chapter</TableHead>
                <TableHead className="font-semibold text-foreground">Chapter Name</TableHead>
                <TableHead className="font-semibold text-foreground">Uploaded</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No textbook uploads yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[200px] truncate font-medium text-blue-900 dark:text-blue-100">
                      {row.fileName}
                    </TableCell>
                    <TableCell>{row.classLabel}</TableCell>
                    <TableCell>{row.subjectName}</TableCell>
                    <TableCell>{row.contentType}</TableCell>
                    <TableCell className="text-muted-foreground">{row.chapter ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.chapterName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.uploadedAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UploadTextbookDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        classes={classes}
        subjects={subjects}
        subjectMappings={subjectMappings}
        onSubmit={(values) => {
          onUpload(values);
          setUploadOpen(false);
        }}
      />
    </>
  );
}
