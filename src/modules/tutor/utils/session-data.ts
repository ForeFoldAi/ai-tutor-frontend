import type { TutorSession } from "@/modules/tutor/types";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";

/** Local calendar day key — avoids UTC/local mismatch for filters and dots. */
export function localDayKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Midnight-local Date for calendar modifiers. */
export function toLocalDayDate(input: string | Date): Date | null {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toSessionDisplayItem(session: TutorSession): SessionDisplayItem {
  const start = new Date(session.startsAt).getTime();
  const duration = Number(session.durationMinutes) || 60;
  const end = start + duration * 60_000;
  const now = Date.now();
  let status: SessionDisplayItem["status"] = "scheduled";

  if (!Number.isFinite(start)) {
    status = "scheduled";
  } else if (now >= start && now <= end) status = "live";
  else if (now > end) status = "completed";
  else if (localDayKey(session.startsAt) === localDayKey(new Date())) status = "upcoming";

  return {
    id: session.id,
    title: session.title,
    subject: session.subject,
    chapterId: session.chapterId,
    chapter: session.chapter || "",
    grade: session.grade,
    section: session.section,
    curriculum: session.curriculum || "",
    startsAt: session.startsAt,
    durationMinutes: duration,
    status,
    meetingLink: session.meetingLink,
    notes: session.notes,
  };
}

export function buildSessionGroups(sessions: TutorSession[]) {
  const all = sessions
    .map(toSessionDisplayItem)
    .filter((session) => Boolean(localDayKey(session.startsAt)))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const todayKey = localDayKey(new Date());
  const now = Date.now();

  return {
    all,
    today: all.filter((session) => localDayKey(session.startsAt) === todayKey),
    upcoming: all.filter(
      (session) =>
        new Date(session.startsAt).getTime() > now && localDayKey(session.startsAt) !== todayKey,
    ),
  };
}

export function sessionsOnDate(sessions: SessionDisplayItem[], date: Date) {
  const key = localDayKey(date);
  return sessions.filter((session) => localDayKey(session.startsAt) === key);
}
