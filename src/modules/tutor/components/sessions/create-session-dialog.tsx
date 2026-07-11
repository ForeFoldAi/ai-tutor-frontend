import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SESSION_STUDENT_OPTIONS } from "@/modules/tutor/data/demo-sessions";
import type { CreateSessionFormValues } from "@/modules/tutor/types/sessions";

const createSessionSchema = z.object({
  title: z.string().min(2, "Enter a topic or title"),
  subject: z.string().min(1, "Select a subject"),
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
  grade: z.string().min(1, "Select a grade"),
  date: z.string().min(1, "Pick a date"),
  startTime: z.string().min(1, "Pick a start time"),
  durationMinutes: z.coerce.number().min(15).max(240),
  mode: z.enum(["video", "ai-guided", "hybrid"]),
  generateAiLessonKit: z.boolean(),
  notes: z.string().optional(),
});

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateSessionFormValues) => void;
  isPending?: boolean;
}

const DEFAULT_STUDENT_IDS = ["rahul-sharma", "priya-reddy", "aarav-patel", "kiran-kumar", "sneha-iyer", "meera-singh"];

function defaultDateValue() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateSessionDialogProps) {
  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: "",
      subject: "",
      studentIds: DEFAULT_STUDENT_IDS,
      grade: "",
      date: defaultDateValue(),
      startTime: "10:00",
      durationMinutes: 60,
      mode: "video",
      generateAiLessonKit: true,
      notes: "",
    },
  });

  const selectedStudentIds = form.watch("studentIds");
  const visibleTags = selectedStudentIds.slice(0, 3);
  const overflowCount = Math.max(0, selectedStudentIds.length - 3);

  const toggleStudent = (id: string, checked: boolean) => {
    const current = form.getValues("studentIds");
    form.setValue(
      "studentIds",
      checked ? [...current, id] : current.filter((item) => item !== id),
      { shouldValidate: true },
    );
  };

  const removeStudent = (id: string) => {
    form.setValue(
      "studentIds",
      form.getValues("studentIds").filter((item) => item !== id),
      { shouldValidate: true },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-10 gap-2 bg-primary px-4 shadow-sm">
          <Plus className="h-4 w-4" />
          Create Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900 dark:text-blue-100">
            Create New Session
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Topic / Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Algebra Fundamentals" {...field} />
                    </FormControl>
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
                      Subject <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Select Students <span className="text-red-500">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <button
                          type="button"
                          className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm"
                        >
                          {selectedStudentIds.length === 0 ? (
                            <span className="text-muted-foreground">Select students</span>
                          ) : (
                            <>
                              {visibleTags.map((id) => {
                                const student = SESSION_STUDENT_OPTIONS.find((s) => s.id === id);
                                if (!student) return null;
                                return (
                                  <Badge
                                    key={id}
                                    variant="secondary"
                                    className="gap-1 pr-1 font-normal"
                                  >
                                    {student.name}
                                    <button
                                      type="button"
                                      className="rounded-full p-0.5 hover:bg-muted"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeStudent(id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                              {overflowCount > 0 && (
                                <Badge variant="secondary" className="font-normal">
                                  +{overflowCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-3" align="start">
                      <div className="space-y-2">
                        {SESSION_STUDENT_OPTIONS.map((student) => (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selectedStudentIds.includes(student.id)}
                              onCheckedChange={(checked) =>
                                toggleStudent(student.id, checked === true)
                              }
                            />
                            <span className="text-sm">{student.name}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class / Grade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">Grade 6</SelectItem>
                      <SelectItem value="7">Grade 7</SelectItem>
                      <SelectItem value="8">Grade 8</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="date" {...field} />
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
                      Start Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:30">11:30 AM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="16:30">4:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
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
                      Duration <span className="text-red-500">*</span>
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
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mode <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-wrap gap-4"
                    >
                      {[
                        { value: "video", label: "Video" },
                        { value: "ai-guided", label: "AI Guided" },
                        { value: "hybrid", label: "Hybrid" },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center gap-2">
                          <RadioGroupItem value={option.value} id={`mode-${option.value}`} />
                          <Label htmlFor={`mode-${option.value}`} className="font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generateAiLessonKit"
              render={({ field }) => (
                <FormItem className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="font-medium leading-none">
                          Generate AI Lesson Kit
                        </FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Creates lesson plan, notes, worksheet, quiz, and more.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormDescription>
                        AI will create lesson plan, teaching notes, worksheet, quiz and more.
                      </FormDescription>
                    </div>
                  </div>
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
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary" disabled={isPending}>
                {isPending ? "Creating..." : "Create Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
