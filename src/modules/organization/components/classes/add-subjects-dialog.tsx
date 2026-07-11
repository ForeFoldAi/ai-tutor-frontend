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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const subjectRowSchema = z.object({
  name: z.string().min(2, "Name required"),
  code: z.string().min(1, "Code required"),
});

const addSubjectsSchema = z.object({
  subjects: z.array(subjectRowSchema).min(1, "Add at least one subject"),
});

export type AddSubjectsFormValues = z.infer<typeof addSubjectsSchema>;

interface AddSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddSubjectsFormValues) => void;
}

export function AddSubjectsDialog({ open, onOpenChange, onSubmit }: AddSubjectsDialogProps) {
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
              onSubmit({
                subjects: values.subjects.map((row) => ({
                  name: row.name.trim(),
                  code: row.code.trim().toUpperCase(),
                })),
              });
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
              <Button type="submit">Add subjects</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
