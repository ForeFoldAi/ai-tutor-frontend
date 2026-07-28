import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyProfile } from "@/api/profile";
import { useAuthStore } from "@/lib/auth-store";
import { resolveClassCurriculum, classOptionLabel } from "@/lib/teaching-curriculum";
import { getTutorStudentOptions } from "@/api/tutor";
import { useLessonPlannerCatalog } from "@/modules/tutor/hooks/use-lesson-planner-catalog";
import { useToast } from "@/hooks/use-toast";
import type { CreateSessionFormValues } from "@/modules/tutor/types/sessions";

const createSessionSchema = z.object({
  title: z.string().trim().min(2, "Enter a topic or title"),
  subject: z.string().min(1, "Select a subject"),
  chapterId: z.string().default(""),
  chapter: z.string().default(""),
  classKey: z.string().min(1, "Select a class"),
  grade: z.string().min(1, "Select a class"),
  section: z.string().min(1, "Select a class"),
  curriculum: z.string().default(""),
  date: z.string().min(1, "Pick a date"),
  startTime: z.string().min(1, "Pick a start time"),
  durationMinutes: z.coerce.number().min(15).max(240),
  meetingLink: z.string().default(""),
  notes: z.string().default(""),
}).superRefine((data, ctx) => {
  if (!data.chapterId.trim() && !data.chapter.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a chapter",
      path: ["chapterId"],
    });
  }
  const link = data.meetingLink.trim();
  if (link && !/^https?:\/\/.+/i.test(link)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid Google Meet or Zoom link",
      path: ["meetingLink"],
    });
  }
});

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateSessionFormValues) => void;
  isPending?: boolean;
  /** When set, dialog opens in edit mode with these values. */
  initialValues?: CreateSessionFormValues | null;
  showTrigger?: boolean;
}

const EMPTY_CLASSES: { grade: string; sections: string[]; curriculum?: string | null }[] = [];

function defaultDateValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function emptyFormValues(curriculum: string): CreateSessionFormValues {
  return {
    title: "",
    subject: "",
    chapterId: "",
    chapter: "",
    classKey: "",
    grade: "",
    section: "",
    curriculum,
    date: defaultDateValue(),
    startTime: "10:00",
    durationMinutes: 60,
    meetingLink: "",
    notes: "",
  };
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  initialValues = null,
  showTrigger = true,
}: CreateSessionDialogProps) {
  const { toast } = useToast();
  const teachingClasses = useAuthStore((state) => state.user?.teachingClasses ?? EMPTY_CLASSES);
  const teachingBoard = useAuthStore((state) => state.user?.teachingBoard?.trim() ?? "");
  const updateUser = useAuthStore((state) => state.updateUser);
  const defaultCurriculum = resolveClassCurriculum(teachingClasses[0], teachingBoard);
  const isEditing = Boolean(initialValues);

  useQuery({
    queryKey: ["auth", "me", "create-session"],
    queryFn: async () => {
      const me = await getMyProfile();
      updateUser({
        teachingBoard: me.teaching_board ?? null,
        teachingSubjects: me.teaching_subjects ?? null,
        teachingClasses: me.teaching_classes ?? null,
      });
      return me;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: emptyFormValues(defaultCurriculum),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(initialValues ?? emptyFormValues(defaultCurriculum));
  }, [open, initialValues, defaultCurriculum, form]);

  const selectedGrade = form.watch("grade");
  const selectedCurriculum = form.watch("curriculum") || defaultCurriculum;
  const selectedSubjectName = form.watch("subject");
  const watchedChapterId = form.watch("chapterId");
  const watchedChapter = form.watch("chapter");
  const { subjects, loadingSubjects } = useLessonPlannerCatalog(
    selectedGrade,
    selectedCurriculum,
  );
  const taggedSubjectsQuery = useQuery({
    queryKey: ["tutor", "students", "options"],
    queryFn: getTutorStudentOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const classOptions = useMemo(() => {
    const opts = teachingClasses.flatMap((assignedClass) =>
      assignedClass.sections.map((section) => {
        const curriculum = resolveClassCurriculum(assignedClass, teachingBoard);
        return {
          key: `${assignedClass.grade}::${section}::${curriculum || "none"}`,
          grade: assignedClass.grade,
          section,
          curriculum,
        };
      }),
    );
    if (initialValues?.grade && initialValues?.section) {
      const key =
        initialValues.classKey ||
        `${initialValues.grade}::${initialValues.section}::${initialValues.curriculum || "none"}`;
      if (!opts.some((option) => option.key === key)) {
        opts.unshift({
          key,
          grade: initialValues.grade,
          section: initialValues.section,
          curriculum: initialValues.curriculum || "",
        });
      }
    }
    return opts;
  }, [teachingBoard, teachingClasses, initialValues]);

  const taggedSubjectNames = new Set(
    (taggedSubjectsQuery.data?.subjects ?? []).map((subject) => subject.toLowerCase()),
  );
  const filteredSubjects = taggedSubjectNames.size
    ? subjects.filter((subject) => taggedSubjectNames.has(subject.subject_name.toLowerCase()))
    : subjects;
  const availableSubjects = filteredSubjects.length ? filteredSubjects : subjects;
  const selectedSubject = availableSubjects.find(
    (subject) => subject.subject_name === selectedSubjectName,
  );
  const chapters = useMemo(() => {
    const rows = (selectedSubject?.chapters ?? []).map((chapter) => ({
      ...chapter,
      id: String(chapter.id),
    }));
    if (watchedChapterId && !rows.some((row) => row.id === watchedChapterId)) {
      rows.unshift({
        id: watchedChapterId,
        chapter: watchedChapter || `Chapter ${watchedChapterId}`,
        file_name: watchedChapter || `Chapter ${watchedChapterId}`,
      });
    }
    return rows;
  }, [selectedSubject, watchedChapterId, watchedChapter]);

  const selectClass = (classKey: string) => {
    const selected = classOptions.find((option) => option.key === classKey);
    if (!selected) return;
    form.setValue("classKey", classKey, { shouldValidate: true });
    form.setValue("grade", selected.grade);
    form.setValue("section", selected.section);
    form.setValue("curriculum", selected.curriculum);
    form.setValue("subject", "");
    form.setValue("chapterId", "");
    form.setValue("chapter", "");
  };

  const selectSubject = (subject: string) => {
    form.setValue("subject", subject, { shouldValidate: true });
    form.setValue("chapterId", "");
    form.setValue("chapter", "");
  };

  const selectChapter = (chapterId: string) => {
    const chapter = chapters.find((item) => item.id === chapterId);
    const label =
      chapter?.chapter?.trim() ||
      chapter?.file_name?.trim() ||
      `Chapter ${chapterId}`;
    form.setValue("chapterId", chapterId, { shouldValidate: true });
    form.setValue("chapter", label, { shouldValidate: true });
  };

  const closeDialog = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      form.reset(emptyFormValues(defaultCurriculum));
    }
  };

  const onInvalid = (errors: FieldErrors<CreateSessionFormValues>) => {
    const first =
      errors.title?.message ||
      errors.classKey?.message ||
      errors.subject?.message ||
      errors.chapterId?.message ||
      errors.date?.message ||
      errors.startTime?.message ||
      errors.meetingLink?.message ||
      errors.curriculum?.message ||
      "Please fill all required fields.";
    toast({
      title: isEditing ? "Can't save yet" : "Can't schedule yet",
      description: String(first),
      variant: "destructive",
    });
  };

  const submitForm = (values: CreateSessionFormValues) => {
    const curriculum =
      values.curriculum?.trim() ||
      defaultCurriculum ||
      resolveClassCurriculum(
        teachingClasses.find((c) => c.grade === values.grade),
        teachingBoard,
      );
    if (!curriculum) {
      toast({
        title: isEditing ? "Can't save yet" : "Can't schedule yet",
        description: "Selected class has no curriculum. Ask your school admin to set it.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({
      ...values,
      title: values.title.trim(),
      chapter: values.chapter?.trim() || `Chapter ${values.chapterId}`,
      curriculum,
      meetingLink: values.meetingLink?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button className="h-9 gap-1.5 bg-primary px-3 text-sm shadow-sm sm:h-10 sm:gap-2 sm:px-4">
            <Plus className="h-4 w-4" />
            Create Session
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900 dark:text-blue-100">
            {isEditing ? "Edit Session" : "Schedule a Session"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update class, subject, timing, or meeting details."
              : "Choose an assigned class, then select its subject and chapter."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-5 pt-2"
            noValidate
            onSubmit={form.handleSubmit(submitForm, onInvalid)}
          >
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Lesson details</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="classKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Class / Grade <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value || undefined} onValueChange={selectClass}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                classOptions.length ? "Select class" : "No classes assigned"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classOptions.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {classOptionLabel(option.grade, option.section, option.curriculum)}
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Subject <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={selectSubject}
                        disabled={!selectedGrade || loadingSubjects}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingSubjects
                                  ? "Loading subjects..."
                                  : selectedGrade
                                    ? "Select subject"
                                    : "Select class first"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubjects.map((subject) => (
                            <SelectItem key={String(subject.id)} value={subject.subject_name}>
                              {subject.subject_name}
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
                  name="chapterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Chapter <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={selectChapter}
                        disabled={!selectedSubject || chapters.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedSubject
                                  ? "Select subject first"
                                  : chapters.length
                                    ? "Select chapter"
                                    : "No chapters uploaded"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chapters.map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              {chapter.chapter ?? chapter.file_name}
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Topic / Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Introduction to fractions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Schedule</p>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="date" min={defaultDateValue()} {...field} />
                          <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Start Time <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Duration <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[30, 45, 60, 90, 120].map((minutes) => (
                            <SelectItem key={minutes} value={String(minutes)}>
                              {minutes < 60
                                ? `${minutes} minutes`
                                : `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="url"
                        placeholder="Google Meet or Zoom link"
                        className="pl-9"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Materials, preparation, or reminders..."
                      className="resize-none"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Saving..."
                    : "Scheduling..."
                  : isEditing
                    ? "Save Changes"
                    : "Schedule Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
