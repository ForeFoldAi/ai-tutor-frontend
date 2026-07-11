import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";
import type { TutorSession } from "@/modules/tutor/types";

function atToday(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function atFutureDate(daysFromToday: number, hours: number, minutes: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const DEMO_TODAY_SESSIONS: SessionDisplayItem[] = [
  {
    id: "today-1",
    title: "Algebra Basics",
    subject: "Mathematics",
    grade: "7",
    section: "A",
    startsAt: atToday(10, 0),
    durationMinutes: 60,
    studentCount: 8,
    status: "live",
    mode: "video",
  },
  {
    id: "today-2",
    title: "Fractions Revision",
    subject: "Mathematics",
    grade: "6",
    section: "B",
    startsAt: atToday(11, 30),
    durationMinutes: 45,
    studentCount: 12,
    status: "upcoming",
    mode: "hybrid",
  },
  {
    id: "today-3",
    title: "Geometry Concepts",
    subject: "Mathematics",
    grade: "6",
    section: "A",
    startsAt: atToday(14, 0),
    durationMinutes: 60,
    studentCount: 10,
    status: "upcoming",
    mode: "video",
  },
  {
    id: "today-4",
    title: "Word Problems",
    subject: "Mathematics",
    grade: "6",
    section: "C",
    startsAt: atToday(16, 30),
    durationMinutes: 45,
    studentCount: 6,
    status: "upcoming",
    mode: "ai-guided",
  },
];

export const DEMO_UPCOMING_SESSIONS: SessionDisplayItem[] = [
  {
    id: "upcoming-1",
    title: "Percentage Applications",
    subject: "Mathematics",
    grade: "6",
    section: "A",
    startsAt: atFutureDate(2, 10, 0),
    durationMinutes: 60,
    studentCount: 5,
    status: "scheduled",
    mode: "video",
  },
  {
    id: "upcoming-2",
    title: "Linear Equations",
    subject: "Mathematics",
    grade: "7",
    section: "B",
    startsAt: atFutureDate(4, 11, 30),
    durationMinutes: 45,
    studentCount: 8,
    status: "scheduled",
    mode: "hybrid",
  },
  {
    id: "upcoming-3",
    title: "Decimals Practice",
    subject: "Mathematics",
    grade: "6",
    section: "A",
    startsAt: atFutureDate(7, 14, 0),
    durationMinutes: 60,
    studentCount: 9,
    status: "scheduled",
    mode: "video",
  },
];

export const SESSION_STUDENT_OPTIONS = [
  { id: "rahul-sharma", name: "Rahul Sharma" },
  { id: "priya-reddy", name: "Priya Reddy" },
  { id: "aarav-patel", name: "Aarav Patel" },
  { id: "kiran-kumar", name: "Kiran Kumar" },
  { id: "sneha-iyer", name: "Sneha Iyer" },
  { id: "meera-singh", name: "Meera Singh" },
];

export function toSessionDisplayItem(session: TutorSession): SessionDisplayItem {
  const start = new Date(session.startsAt).getTime();
  const now = Date.now();
  const end = start + session.durationMinutes * 60 * 1000;
  let status: SessionDisplayItem["status"] = "scheduled";
  if (now >= start && now <= end) status = "live";
  else if (start > now) {
    const isToday =
      new Date(session.startsAt).toDateString() === new Date().toDateString();
    status = isToday ? "upcoming" : "scheduled";
  }

  return {
    id: session.id,
    title: session.title,
    subject: session.subject,
    grade: session.grade,
    section: session.section,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    studentCount: 6,
    status,
    notes: session.notes,
  };
}

export function mergeSessionLists(apiSessions: TutorSession[]): {
  today: SessionDisplayItem[];
  upcoming: SessionDisplayItem[];
  all: SessionDisplayItem[];
} {
  const mapped = apiSessions.map(toSessionDisplayItem);
  const today = mapped.filter((s) => {
    const d = new Date(s.startsAt);
    return d.toDateString() === new Date().toDateString();
  });
  const upcoming = mapped.filter((s) => {
    const d = new Date(s.startsAt);
    return d > new Date() && d.toDateString() !== new Date().toDateString();
  });

  return {
    today: today.length ? today : DEMO_TODAY_SESSIONS,
    upcoming: upcoming.length ? upcoming : DEMO_UPCOMING_SESSIONS,
    all: [...(today.length ? today : DEMO_TODAY_SESSIONS), ...(upcoming.length ? upcoming : DEMO_UPCOMING_SESSIONS)],
  };
}
