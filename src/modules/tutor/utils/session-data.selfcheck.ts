/**
 * ponytail: session date-key self-check.
 * Run: npx tsx src/modules/tutor/utils/session-data.selfcheck.ts
 */
import { localDayKey, sessionsOnDate, toLocalDayDate } from "./session-data";
import type { SessionDisplayItem } from "@/modules/tutor/types/sessions";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const iso = "2026-07-18T11:50:00.000Z"; // 17:20 IST
const local = new Date(iso);
assert(localDayKey(iso) === localDayKey(local), "iso and Date share day key");

const day = toLocalDayDate(iso);
assert(day != null && day.getHours() === 0, "local day is midnight");

const session: SessionDisplayItem = {
  id: "1",
  title: "overview",
  subject: "Science",
  chapter: "Ch1",
  grade: "9",
  section: "A",
  curriculum: "CBSE",
  startsAt: iso,
  durationMinutes: 60,
  status: "upcoming",
};

assert(sessionsOnDate([session], local).length === 1, "session matches its local day");
assert(sessionsOnDate([session], new Date(2026, 6, 24)).length === 0, "not on other day");

console.log("session-data.selfcheck: ok");
