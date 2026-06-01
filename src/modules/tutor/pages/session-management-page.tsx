import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { SessionList } from "@/modules/tutor/components/session-list";
import { DataState } from "@/modules/shared/components/data-state";
import { createTutorSession } from "@/api/tutor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const createSessionSchema = z.object({
  title: z.string().min(2, "Enter a session title"),
  subject: z.string().min(2, "Enter a subject"),
  grade: z.string().min(1, "Enter grade"),
  section: z.string().min(1, "Enter section"),
  startsAt: z.string().min(1, "Pick start date/time"),
  durationMinutes: z.coerce.number().min(15).max(240),
  meetingLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CreateSessionForm = z.infer<typeof createSessionSchema>;

export default function TutorSessionManagementPage() {
  const qc = useQueryClient();
  const { sessionsQuery } = useTutorData();
  const [open, setOpen] = useState(false);
  const sessions = sessionsQuery.data || [];
  const form = useForm<CreateSessionForm>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: "",
      subject: "",
      grade: "",
      section: "",
      startsAt: "",
      durationMinutes: 60,
      meetingLink: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: CreateSessionForm) =>
      createTutorSession({
        title: v.title.trim(),
        subject: v.subject.trim(),
        grade: v.grade.trim(),
        section: v.section.trim().toUpperCase(),
        startsAt: new Date(v.startsAt).toISOString(),
        durationMinutes: v.durationMinutes,
        meetingLink: v.meetingLink?.trim() || undefined,
        notes: v.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      form.reset();
      void qc.invalidateQueries({ queryKey: ["tutor", "sessions"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Session Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Live Session</DialogTitle>
              <DialogDescription>
                Add a tutor-created live session with grade, section, subject, and session details.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                className="grid gap-4 md:grid-cols-2 pt-2"
                onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              >
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem><FormLabel>Grade</FormLabel><FormControl><Input placeholder="e.g. 9" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="section" render={({ field }) => (
                  <FormItem><FormLabel>Section</FormLabel><FormControl><Input className="uppercase" placeholder="e.g. A" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="startsAt" render={({ field }) => (
                  <FormItem><FormLabel>Start time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" min={15} max={240} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meetingLink" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Meeting link (optional)</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Notes (optional)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create session"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataState
        loading={sessionsQuery.isLoading}
        error={sessionsQuery.error ? String(sessionsQuery.error) : null}
        empty={sessions.length === 0}
        emptyText="No sessions scheduled."
        onRetry={() => void sessionsQuery.refetch()}
      >
        <SessionList sessions={sessions} />
      </DataState>
    </div>
  );
}
