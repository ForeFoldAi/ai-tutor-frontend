import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, UserPlus } from "lucide-react";
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

const teacherRowSchema = z.object({
  full_name: z.string().min(2, "Name required"),
  phone: z.string().min(6, "Phone required"),
  email: z.string().email("Valid email required"),
});

const addTeachersSchema = z
  .object({
    teachers: z.array(teacherRowSchema).min(1, "Add at least one teacher"),
  })
  .superRefine((data, ctx) => {
    const emails = new Set<string>();
    data.teachers.forEach((row, index) => {
      const email = row.email.trim().toLowerCase();
      if (emails.has(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate email in this form",
          path: ["teachers", index, "email"],
        });
      }
      emails.add(email);
    });
  });

export type AddTeacherRowValues = z.infer<typeof teacherRowSchema>;
export type AddTeachersFormValues = z.infer<typeof addTeachersSchema>;

const emptyRow = (): AddTeacherRowValues => ({ full_name: "", phone: "", email: "" });

interface AddTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddTeachersFormValues) => void;
}

export function AddTeacherDialog({ open, onOpenChange, onSubmit }: AddTeacherDialogProps) {
  const form = useForm<AddTeachersFormValues>({
    resolver: zodResolver(addTeachersSchema),
    defaultValues: { teachers: [emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teachers",
  });

  useEffect(() => {
    if (open) form.reset({ teachers: [emptyRow()] });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Teachers
          </DialogTitle>
          <DialogDescription>Add one or more teachers with name, phone, and email.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4 pt-2"
            onSubmit={form.handleSubmit((values) => {
              onSubmit({
                teachers: values.teachers.map((row) => ({
                  full_name: row.full_name.trim(),
                  phone: row.phone.trim(),
                  email: row.email.trim(),
                })),
              });
            })}
          >
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-x-3 gap-y-1 border-b border-border/60 pb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Full name
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Phone
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </span>
              <span className="w-9" aria-hidden />
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-x-3"
                >
                  <FormField
                    control={form.control}
                    name={`teachers.${index}.full_name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Anita Verma" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachers.${index}.phone`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="tel" placeholder="+91 98765 43210" autoComplete="tel" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachers.${index}.email`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" autoComplete="off" placeholder="teacher@school.com" {...f} />
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
              className="h-8 gap-1 text-xs"
              onClick={() => append(emptyRow())}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more ({fields.length} row{fields.length === 1 ? "" : "s"})
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add {fields.length} teacher{fields.length === 1 ? "" : "s"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
