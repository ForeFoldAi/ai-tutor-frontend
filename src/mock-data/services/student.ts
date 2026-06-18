import type { StudentSubjectApi } from "@/api/types";
import { delay } from "../delay";
import { studentSubjects } from "../fixtures/student-subjects";

export async function getMySubjects(): Promise<StudentSubjectApi[]> {
  await delay();
  return [...studentSubjects];
}
