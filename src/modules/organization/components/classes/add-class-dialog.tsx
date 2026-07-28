import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, School, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const classRowSchema = z.object({
  grade: z.string().min(1, "Grade required"),
  section: z.string().min(1, "Section required"),
  curriculum: z.string().min(1, "Curriculum required"),
});

const addClassesSchema = z
  .object({
    classes: z.array(classRowSchema).min(1, "Add at least one class"),
  })
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    data.classes.forEach((row, index) => {
      const key = `${row.grade.trim()}-${row.section.trim().toUpperCase()}-${row.curriculum.trim().toLowerCase()}`;
      if (keys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate class in this form",
          path: ["classes", index, "grade"],
        });
      }
      keys.add(key);
    });
  });

export type AddClassRowValues = z.infer<typeof classRowSchema>;
export type AddClassesFormValues = z.infer<typeof addClassesSchema>;

const emptyRow = (curriculum = ""): AddClassRowValues => ({ grade: "", section: "", curriculum });

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curricula: string[];
  onSubmit: (values: AddClassesFormValues) => void;
  isSubmitting?: boolean;
}

export function AddClassDialog({
  open,
  onOpenChange,
  curricula,
  onSubmit,
  isSubmitting,
}: AddClassDialogProps) {
  const form = useForm<AddClassesFormValues>({
    resolver: zodResolver(addClassesSchema),
    defaultValues: { classes: [emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "classes",
  });

  useEffect(() => {
    if (open) form.reset({ classes: [emptyRow()] });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Add Classes
          </DialogTitle>
          <DialogDescription>Add one or more classes with grade, section, and curriculum.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4 pt-2"
            onSubmit={form.handleSubmit((values) => {
              onSubmit({
                classes: values.classes.map((row) => ({
                  grade: row.grade.trim(),
                  section: row.section.trim().toUpperCase(),
                  curriculum: row.curriculum.trim(),
                })),
              });
            })}
          >
            <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.2fr)_auto] gap-x-3 gap-y-1 border-b border-border/60 pb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Class / Grade
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Section
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Curriculum
              </span>
              <span className="w-9" aria-hidden />
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.2fr)_auto] items-start gap-x-3"
                >
                  <FormField
                    control={form.control}
                    name={`classes.${index}.grade`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. 6" autoComplete="off" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`classes.${index}.section`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="e.g. A"
                            className="uppercase"
                            autoComplete="off"
                            maxLength={20}
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`classes.${index}.curriculum`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Select value={f.value || undefined} onValueChange={f.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background">
                              <SelectValue placeholder="Select Curriculum" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {curricula.map((curriculum) => (
                              <SelectItem key={curriculum} value={curriculum}>
                                {curriculum}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
              <Button type="submit" disabled={isSubmitting || curricula.length === 0}>
                {isSubmitting ? "Saving…" : `Add ${fields.length} class${fields.length === 1 ? "" : "es"}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
