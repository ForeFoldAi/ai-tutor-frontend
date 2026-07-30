import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
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

const studentRowSchema = z.object({
  roll_number: z.string().min(1, "Roll number required"),
  student_name: z.string().min(2, "Name required"),
  parent_phone: z.string().min(6, "Phone required"),
  parent_email: z.string().email("Valid email required"),
});

const addStudentsSchema = z
  .object({
    students: z.array(studentRowSchema).min(1, "Add at least one student"),
  })
  .superRefine((data, ctx) => {
    const rollNumbers = new Set<string>();
    data.students.forEach((row, index) => {
      const roll = row.roll_number.trim().toLowerCase();
      if (rollNumbers.has(roll)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate roll number in this form",
          path: ["students", index, "roll_number"],
        });
      }
      rollNumbers.add(roll);
    });
  });

export type AddStudentRowValues = z.infer<typeof studentRowSchema>;
export type AddStudentsFormValues = z.infer<typeof addStudentsSchema>;

const emptyRow = (): AddStudentRowValues => ({
  roll_number: "",
  student_name: "",
  parent_phone: "",
  parent_email: "",
});

// ponytail: one grid template for header + rows; real column minimums so narrow
// viewports scroll the dialog instead of crushing the inputs.
const ROW_GRID =
  "grid grid-cols-[minmax(5rem,0.75fr)_minmax(9rem,1.2fr)_minmax(8rem,1fr)_minmax(9rem,1.2fr)_auto] gap-x-3";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddStudentsFormValues) => void;
}

export function AddStudentDialog({ open, onOpenChange, onSubmit }: AddStudentDialogProps) {
  const form = useForm<AddStudentsFormValues>({
    resolver: zodResolver(addStudentsSchema),
    defaultValues: { students: [emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "students",
  });

  useEffect(() => {
    if (open) form.reset({ students: [emptyRow()] });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Add Students
          </DialogTitle>
          <DialogDescription>
            Add one or more students with roll number, name, and parent contact details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4 pt-2"
            onSubmit={form.handleSubmit((values) => {
              onSubmit({
                students: values.students.map((row) => ({
                  roll_number: row.roll_number.trim(),
                  student_name: row.student_name.trim(),
                  parent_phone: row.parent_phone.trim(),
                  parent_email: row.parent_email.trim(),
                })),
              });
            })}
          >
            <div className={`${ROW_GRID} gap-y-1 border-b border-border/60 pb-2`}>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Roll no.
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Student name
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Parent phone
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Parent email
              </span>
              <span className="w-9" aria-hidden />
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`${ROW_GRID} items-start`}
                >
                  <FormField
                    control={form.control}
                    name={`students.${index}.roll_number`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. 1042" autoComplete="off" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`students.${index}.student_name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Rahul Sharma" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`students.${index}.parent_phone`}
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
                    name={`students.${index}.parent_email`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" autoComplete="off" placeholder="parent@email.com" {...f} />
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
                Add {fields.length} student{fields.length === 1 ? "" : "s"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
