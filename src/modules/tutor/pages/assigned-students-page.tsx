import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, GraduationCap, Plus } from "lucide-react";
import { UserTable } from "@/modules/master-admin/components/user-table";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";
import { createOrganizationStudent } from "@/api/organization";
import type { StudentClassEnrollment } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const onboardStudentSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "At least 8 characters."),
  teaching_board: z.string().optional(),
  grade: z.string().min(1, "Enter class / grade."),
  section: z.string().min(1, "Enter section."),
});

type OnboardStudentFormValues = z.infer<typeof onboardStudentSchema>;

function errorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Could not create student.";
  return err.message || "Could not create student.";
}

export default function TutorAssignedStudentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { studentsQuery } = useTutorData();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const students = studentsQuery.data || [];
  const form = useForm<OnboardStudentFormValues>({
    resolver: zodResolver(onboardStudentSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      teaching_board: "",
      grade: "",
      section: "",
    },
  });

  const onboardMutation = useMutation({
    mutationFn: (values: OnboardStudentFormValues) => {
      if (!user?.schoolId) throw new Error("Tutor is not linked to a school.");
      const teaching_classes: [StudentClassEnrollment] = [
        {
          grade: values.grade.trim(),
          sections: [values.section.trim().toUpperCase()] as [string],
        },
      ];
      return createOrganizationStudent({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        school_id: user.schoolId,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      form.reset();
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["tutor", "students"] });
      void qc.invalidateQueries({ queryKey: ["tutor", "progress"] });
      toast({
        title: "Student onboarded",
        description: "Student is created and auto-assigned by class/section.",
      });
    },
    onError: (e) => {
      toast({
        title: "Onboarding failed",
        description: errorMessage(e),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Assigned Students</h1>
        <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Onboard student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Onboard Student
              </DialogTitle>
              <DialogDescription>
                Student must match your tagged class and section.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                className="grid gap-4 md:grid-cols-2 pt-2"
                onSubmit={form.handleSubmit((v) => onboardMutation.mutate(v))}
              >
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student full name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" {...field} />
                      </div>
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
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="password" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teaching_board"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board / curriculum (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CBSE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class / grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 9" {...field} />
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
                      <Input placeholder="e.g. A" className="uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOnboardOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={onboardMutation.isPending}>
                  {onboardMutation.isPending ? "Creating..." : "Create student"}
                </Button>
              </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataState
        loading={studentsQuery.isLoading}
        error={studentsQuery.error ? String(studentsQuery.error) : null}
        empty={students.length === 0}
        emptyText="No assigned students found."
        onRetry={() => void studentsQuery.refetch()}
      >
        <UserTable title="Students" users={students} />
      </DataState>
    </div>
  );
}
