import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { CreateSessionDialog } from "@/modules/tutor/components/sessions/create-session-dialog";
import { SessionsCalendarCard } from "@/modules/tutor/components/sessions/sessions-calendar-card";
import { SessionsListView } from "@/modules/tutor/components/sessions/sessions-list-view";
import { TodaysSessionsCard } from "@/modules/tutor/components/sessions/todays-sessions-card";
import { UpcomingSessionsCard } from "@/modules/tutor/components/sessions/upcoming-sessions-card";
import { mergeSessionLists } from "@/modules/tutor/data/demo-sessions";
import { createTutorSession } from "@/api/tutor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { CreateSessionFormValues } from "@/modules/tutor/types/sessions";
import { combineDateAndTime } from "@/modules/tutor/utils/session-helpers";

export default function TutorSessionManagementPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { sessionsQuery } = useTutorData();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { today, upcoming, all } = useMemo(
    () => mergeSessionLists(sessionsQuery.data ?? []),
    [sessionsQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: (values: CreateSessionFormValues) =>
      createTutorSession({
        title: values.title.trim(),
        subject: values.subject,
        grade: values.grade,
        section: "A",
        startsAt: combineDateAndTime(values.date, values.startTime),
        durationMinutes: values.durationMinutes,
        notes: [
          values.notes?.trim(),
          `Mode: ${values.mode}`,
          values.generateAiLessonKit ? "AI Lesson Kit: enabled" : "AI Lesson Kit: disabled",
          `Students: ${values.studentIds.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["tutor", "sessions"] });
      toast({
        title: "Session created",
        description: "Your new session has been scheduled.",
      });
    },
    onError: () => {
      toast({
        title: "Could not create session",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your live and scheduled tutoring sessions.
          </p>
        </div>
        <CreateSessionDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      </div>

      <Tabs defaultValue="calendar" className="flex flex-col gap-4">
        <TabsList className="h-auto w-fit gap-6 rounded-none border-b border-border/60 bg-transparent p-0">
          <TabsTrigger
            value="calendar"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Calendar View
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-0 space-y-3">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
            <SessionsCalendarCard selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
            <TodaysSessionsCard sessions={today} />
          </div>
          <UpcomingSessionsCard sessions={upcoming} />
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <SessionsListView sessions={all} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
