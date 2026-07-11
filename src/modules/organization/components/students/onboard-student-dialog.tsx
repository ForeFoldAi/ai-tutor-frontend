import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { schoolDisplayName } from "@/modules/organization/components/class-placement-form";
import type { OrganizationSchoolSummary } from "@/api/types";

const onboardStudentSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  school_id: z.string().min(1, "Select a school"),
  teaching_board: z.string().optional(),
  grade: z.string().min(1, "Enter grade / class"),
  section: z.string().min(1, "Enter section"),
});

export type OnboardStudentFormValues = z.infer<typeof onboardStudentSchema>;

interface OnboardStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OnboardStudentFormValues) => void;
  isPending: boolean;
  error?: string | null;
  fixedSchoolId: string;
  schools: OrganizationSchoolSummary[];
  canSubmit: boolean;
}

export function OnboardStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
  fixedSchoolId,
  schools,
  canSubmit,
}: OnboardStudentDialogProps) {
  const form = useForm<OnboardStudentFormValues>({
    resolver: zodResolver(onboardStudentSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      grade: "",
      section: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        school_id: "",
        teaching_board: "",
        grade: "",
        section: "",
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Onboard Student
          </DialogTitle>
          <DialogDescription>
            Assign a school and board. Each student belongs to exactly one grade and one section.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-3 pt-2 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="school_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>School</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={schools.length ? "Select school" : "No schools — add one first"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {schoolDisplayName(s)}
                          {s.board ? ` · ${s.board}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teaching_board"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Board / curriculum (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CBSE, IB, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3 md:col-span-2">
              <FormLabel className="m-0">Class &amp; section</FormLabel>
              <div className="grid grid-cols-[3.5rem_7rem] gap-x-3 gap-y-2 border-b border-border/60 pb-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Section</span>
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <Input className="h-9" placeholder="9" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <Input
                          className="h-9 uppercase"
                          placeholder="A"
                          autoComplete="off"
                          maxLength={20}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Initial password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !canSubmit}>
                {isPending ? "Creating…" : "Create student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
