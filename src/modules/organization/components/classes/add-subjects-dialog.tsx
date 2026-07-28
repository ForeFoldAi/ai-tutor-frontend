import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const subjectRowSchema = z.object({
  name: z.string(),
  code: z.string(),
});

const addSubjectsSchema = z
  .object({
    subjects: z.array(subjectRowSchema).min(1, "Add at least one subject"),
  })
  .superRefine((data, ctx) => {
    const codes = new Set<string>();
    data.subjects.forEach((row, index) => {
      const name = row.name.trim();
      const code = row.code.trim().toUpperCase();
      if (!name && !code) return;
      if (!name || !code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: !name ? "Name required (min 2 characters)" : "Code required",
          path: !name ? ["subjects", index, "name"] : ["subjects", index, "code"],
        });
        return;
      }
      if (name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name must be at least 2 characters",
          path: ["subjects", index, "name"],
        });
        return;
      }
      if (codes.has(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate code in this form",
          path: ["subjects", index, "code"],
        });
      }
      codes.add(code);
    });
    const filled = data.subjects.filter((row) => row.name.trim() && row.code.trim());
    if (filled.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one subject with name and code",
        path: ["subjects"],
      });
    }
  });

export type AddSubjectsFormValues = z.infer<typeof addSubjectsSchema>;

interface AddSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddSubjectsFormValues) => void;
  isSubmitting?: boolean;
}

export function AddSubjectsDialog({ open, onOpenChange, onSubmit, isSubmitting }: AddSubjectsDialogProps) {
  const form = useForm<AddSubjectsFormValues>({
    resolver: zodResolver(addSubjectsSchema),
    defaultValues: { subjects: [{ name: "", code: "" }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  useEffect(() => {
    if (open) form.reset({ subjects: [{ name: "", code: "" }] });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add Subjects
          </DialogTitle>
          <DialogDescription>Add one or more subjects with name and code.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4 pt-2"
            onSubmit={form.handleSubmit((values) => {
              const subjects = values.subjects
                .map((row) => ({
                  name: row.name.trim(),
                  code: row.code.trim().toUpperCase(),
                }))
                .filter((row) => row.name && row.code);
              if (subjects.length === 0) return;
              onSubmit({ subjects });
            })}
          >
            <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3 gap-y-1 border-b border-border/60 pb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Subject Name
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Subject Code
              </span>
              <span className="w-9" aria-hidden />
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-x-3">
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Mathematics" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.code`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. MATH" className="uppercase" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={fields.length === 1}
                    aria-label="Remove row"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => append({ name: "", code: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another subject
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Add subjects"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
