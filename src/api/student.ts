import { apiFetch } from "@/api/index";
import type { StudentSubjectApi } from "@/api/types";

export async function getMySubjects(): Promise<StudentSubjectApi[]> {
  return apiFetch<StudentSubjectApi[]>("/auth/catalog/my-subjects");
}
