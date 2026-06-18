import type { TutorSession } from "@/modules/tutor/types";

export const initialTutorSessions: TutorSession[] = [
  {
    id: "session-1",
    title: "Algebra revision",
    subject: "Mathematics",
    grade: "9",
    section: "A",
    startsAt: "2026-05-10T10:00:00Z",
    durationMinutes: 60,
  },
  {
    id: "session-2",
    title: "Physics numericals",
    subject: "Physics",
    grade: "10",
    section: "B",
    startsAt: "2026-05-11T14:00:00Z",
    durationMinutes: 75,
  },
];
