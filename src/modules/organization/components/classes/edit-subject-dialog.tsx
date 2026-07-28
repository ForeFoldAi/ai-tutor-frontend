import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";

const editSubjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  code: z.string().trim().min(1, "Code required"),
});

export type EditSubjectFormValues = z.infer<typeof editSubjectSchema> & {
  /** classId → tagged */
  taggedClasses: Record<string, boolean>;
};

interface EditSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectItem | null;
  classes: ClassOverviewItem[];
  mappings: Record<string, Record<string, boolean>>;
  onSubmit: (values: EditSubjectFormValues) => void;
  isSubmitting?: boolean;
}

function classCurriculum(cls: ClassOverviewItem) {
  return cls.curriculums[0] ?? "";
}

function initialTagged(
  subject: SubjectItem | null,
  classes: ClassOverviewItem[],
  mappings: Record<string, Record<string, boolean>>,
): Record<string, boolean> {
  if (!subject) return {};
  const tagged: Record<string, boolean> = {};
  for (const cls of classes) {
    const key = classSubjectMappingKey(cls.id, classCurriculum(cls));
    if (mappings[key]?.[subject.id]) tagged[cls.id] = true;
  }
  return tagged;
}

export function EditSubjectDialog({
  open,
  onOpenChange,
  subject,
  classes,
  mappings,
  onSubmit,
  isSubmitting,
}: EditSubjectDialogProps) {
  const form = useForm<z.infer<typeof editSubjectSchema>>({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: { name: "", code: "" },
  });
  const [taggedClasses, setTaggedClasses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !subject) return;
    form.reset({ name: subject.name, code: subject.code });
    setTaggedClasses(initialTagged(subject, classes, mappings));
  }, [open, subject, classes, mappings, form]);

  // Only classes already tagged when the dialog opened (so the user can uncheck).
  const classOptions = useMemo(() => {
    const ids = Object.keys(taggedClasses);
    return [...classes]
      .filter((cls) => ids.includes(cls.id))
      .sort((a, b) => {
        const g = a.grade.localeCompare(b.grade, undefined, { numeric: true });
        if (g !== 0) return g;
        return a.section.localeCompare(b.section);
      });
  }, [classes, taggedClasses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Edit Subject
          </DialogTitle>
          <DialogDescription>
            Update details. Uncheck a tagged class to remove it from this subject.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({
                name: values.name.trim(),
                code: values.code.trim().toUpperCase(),
                taggedClasses,
              }),
            )}
          >
            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MATH" className="uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Tagged Classes</Label>
                {classOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes tagged yet. Use Map Subjects on a class to add this subject.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
                    {classOptions.map((cls) => {
                      const curriculum = classCurriculum(cls);
                      const label = `Grade ${cls.grade} · Section ${cls.section}${
                        curriculum ? ` · ${curriculum}` : ""
                      }`;
                      return (
                        <label
                          key={cls.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={taggedClasses[cls.id] ?? false}
                            onCheckedChange={(checked) =>
                              setTaggedClasses((prev) => ({
                                ...prev,
                                [cls.id]: checked === true,
                              }))
                            }
                          />
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
