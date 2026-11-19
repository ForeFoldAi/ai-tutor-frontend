export function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatSessionDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + formatSessionTime(iso);
}

export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatSessionTimeRange(iso: string, durationMinutes: number) {
  const end = new Date(new Date(iso).getTime() + durationMinutes * 60_000);
  return `${formatSessionTime(iso)}–${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function combineDateAndTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d.toISOString();
}

/** Split ISO startsAt into local date (YYYY-MM-DD) and time (HH:mm) for the session form. */
export function splitStartsAt(iso: string): { date: string; startTime: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return {
      date: new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10),
      startTime: "10:00",
    };
  }
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return {
    date: local.toISOString().slice(0, 10),
    startTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export function sessionToFormValues(session: {
  title: string;
  subject: string;
  chapterId?: string;
  chapter?: string;
  grade: string;
  section: string;
  curriculum?: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
}): {
  title: string;
  subject: string;
  chapterId: string;
  chapter: string;
  classKey: string;
  grade: string;
  section: string;
  curriculum: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  meetingLink: string;
  notes: string;
} {
  const { date, startTime } = splitStartsAt(session.startsAt);
  const curriculum = session.curriculum?.trim() || "";
  return {
    title: session.title,
    subject: session.subject,
    chapterId: session.chapterId ? String(session.chapterId) : "",
    chapter: session.chapter || "",
    classKey: `${session.grade}::${session.section}::${curriculum || "none"}`,
    grade: session.grade,
    section: session.section,
    curriculum,
    date,
    startTime,
    durationMinutes: session.durationMinutes || 60,
    meetingLink: session.meetingLink || "",
    notes: session.notes || "",
  };
}
