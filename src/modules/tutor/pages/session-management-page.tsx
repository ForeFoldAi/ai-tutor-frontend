import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, Clock3 } from "lucide-react";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { CreateSessionDialog } from "@/modules/tutor/components/sessions/create-session-dialog";
import { SessionsCalendarCard } from "@/modules/tutor/components/sessions/sessions-calendar-card";
import { TodaysSessionsCard } from "@/modules/tutor/components/sessions/todays-sessions-card";
import { UpcomingSessionsCard } from "@/modules/tutor/components/sessions/upcoming-sessions-card";
import {
  buildSessionGroups,
  localDayKey,
  sessionsOnDate,
} from "@/modules/tutor/utils/session-data";
import {
  createTutorSession,
  deleteTutorSession,
  updateTutorSession,
} from "@/api/tutor";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import type {
  CreateSessionFormValues,
  SessionDisplayItem,
} from "@/modules/tutor/types/sessions";
import {
  combineDateAndTime,
  formatSessionDateTime,
  sessionToFormValues,
} from "@/modules/tutor/utils/session-helpers";

function toSessionPayload(values: CreateSessionFormValues) {
  return {
    title: values.title.trim(),
    subject: values.subject,
    chapterId: values.chapterId,
    chapter: values.chapter,
    grade: values.grade,
    section: values.section,
    curriculum: values.curriculum,
    startsAt: combineDateAndTime(values.date, values.startTime),
    durationMinutes: values.durationMinutes,
    meetingLink: values.meetingLink?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
}

export default function TutorSessionManagementPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { sessionsQuery } = useTutorData();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionDisplayItem | null>(null);
  const [deleteSession, setDeleteSession] = useState<SessionDisplayItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { today, upcoming, all } = useMemo(
    () => buildSessionGroups(sessionsQuery.data ?? []),
    [sessionsQuery.data],
  );
  const selectedSessions = useMemo(
    () => sessionsOnDate(all, selectedDate),
    [all, selectedDate],
  );
  const nextSession = upcoming[0] ?? today.find((session) => session.status !== "completed");
  const viewingToday = localDayKey(selectedDate) === localDayKey(new Date());
  const editFormValues = editSession ? sessionToFormValues(editSession) : null;

  const refresh = () => void invalidateManyAndBroadcast(qc, ["sessions"]);

  const createMutation = useMutation({
    mutationFn: (values: CreateSessionFormValues) =>
      createTutorSession(toSessionPayload(values)),
    onSuccess: () => {
      setCreateOpen(false);
      refresh();
      toast({ title: "Session created", description: "Your new session has been scheduled." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create session",
        description: error?.message?.trim() || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CreateSessionFormValues) => {
      if (!editSession) throw new Error("No session selected");
      return updateTutorSession(editSession.id, toSessionPayload(values));
    },
    onSuccess: () => {
      setEditSession(null);
      refresh();
      toast({ title: "Session updated", description: "Changes have been saved." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update session",
        description: error?.message?.trim() || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (session: SessionDisplayItem) => deleteTutorSession(session.id),
    onSuccess: () => {
      setDeleteSession(null);
      refresh();
      toast({ title: "Session deleted", description: "The session has been removed." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete session",
        description: error?.message?.trim() || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const actionsDisabled =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <PageShell>
      <div className="flex shrink-0 items-start justify-between gap-2 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
            Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan lessons and keep your teaching schedule in one place.
          </p>
        </div>
        <div className="shrink-0">
          <CreateSessionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={(values) => createMutation.mutate(values)}
            isPending={createMutation.isPending}
          />
        </div>
      </div>

      <CreateSessionDialog
        open={Boolean(editSession)}
        onOpenChange={(open) => {
          if (!open) setEditSession(null);
        }}
        initialValues={editFormValues}
        showTrigger={false}
        onSubmit={(values) => updateMutation.mutate(values)}
        isPending={updateMutation.isPending}
      />

      <AlertDialog
        open={Boolean(deleteSession)}
        onOpenChange={(open) => {
          if (!open) setDeleteSession(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSession
                ? `“${deleteSession.title}” will be removed from your schedule. This cannot be undone.`
                : "This session will be removed from your schedule."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteSession}
              onClick={(event) => {
                event.preventDefault();
                if (deleteSession) deleteMutation.mutate(deleteSession);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 sm:p-3">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Today</p>
              <p className="text-xl font-bold text-foreground sm:text-2xl">{today.length}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">scheduled sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 sm:p-3">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
              <p className="text-xl font-bold text-foreground sm:text-2xl">{upcoming.length}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">future sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 border-border/70 shadow-sm md:col-span-1">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-950/40 sm:p-3">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Next session</p>
              <p className="line-clamp-2 text-sm font-bold text-foreground">
                {nextSession?.title ?? "Nothing scheduled"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {nextSession ? formatSessionDateTime(nextSession.startsAt) : "Your schedule is clear"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[clamp(17rem,26vw,21rem)_minmax(0,1fr)] lg:items-start">
        <SessionsCalendarCard
          selected={selectedDate}
          sessions={all}
          onSelect={(date) => date && setSelectedDate(date)}
        />
        <TodaysSessionsCard
          sessions={selectedSessions}
          title={viewingToday ? "Today's Sessions" : "Selected Day"}
          subtitle={selectedDate.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          onEdit={setEditSession}
          onDelete={setDeleteSession}
          actionsDisabled={actionsDisabled}
        />
      </div>

      {!viewingToday ? (
        <TodaysSessionsCard
          sessions={today}
          subtitle={new Date().toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          onEdit={setEditSession}
          onDelete={setDeleteSession}
          actionsDisabled={actionsDisabled}
        />
      ) : null}

      <UpcomingSessionsCard
        sessions={upcoming}
        onEdit={setEditSession}
        onDelete={setDeleteSession}
        actionsDisabled={actionsDisabled}
      />
    </PageShell>
  );
}
