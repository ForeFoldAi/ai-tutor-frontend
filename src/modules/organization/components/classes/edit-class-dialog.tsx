import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassOverviewItem } from "@/modules/organization/types/classes-admin";

const editClassSchema = z.object({
  grade: z.string().trim().min(1, "Grade required"),
  section: z.string().trim().min(1, "Section required"),
  curriculum: z.string().trim().min(1, "Curriculum required"),
});

export type EditClassFormValues = z.infer<typeof editClassSchema>;

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassOverviewItem | null;
  curricula: string[];
  onSubmit: (values: EditClassFormValues) => void;
  isSubmitting?: boolean;
}

export function EditClassDialog({
  open,
  onOpenChange,
  classItem,
  curricula,
  onSubmit,
  isSubmitting,
}: EditClassDialogProps) {
  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassSchema),
    defaultValues: { grade: "", section: "", curriculum: "" },
  });

  useEffect(() => {
    if (open && classItem) {
      form.reset({
        grade: classItem.grade,
        section: classItem.section,
        curriculum: classItem.curriculums[0] ?? "",
      });
    }
  }, [open, classItem, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Edit Class
          </DialogTitle>
          <DialogDescription>Update grade, section, and curriculum.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({
                grade: values.grade.trim(),
                section: values.section.trim().toUpperCase(),
                curriculum: values.curriculum.trim(),
              }),
            )}
          >
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <FormControl>
                    <Input placeholder="9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <Input placeholder="A" className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curriculum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curriculum</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select curriculum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {curricula.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
