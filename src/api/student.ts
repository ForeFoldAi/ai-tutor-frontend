import { apiFetch } from "@/api/index";
import type { StudentSubjectApi } from "@/api/types";

export type MySubjectsParams = {
  classLevel?: string;
  board?: string;
};

function toClassLevelParam(grade: string): string {
  const trimmed = grade.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("CLASS_") ? trimmed : `CLASS_${trimmed}`;
}

export async function getMySubjects(params?: MySubjectsParams): Promise<StudentSubjectApi[]> {
  const qs = new URLSearchParams();
  if (params?.classLevel) qs.set("class_level", toClassLevelParam(params.classLevel));
  if (params?.board?.trim()) qs.set("board", params.board.trim());
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<StudentSubjectApi[]>(`/auth/catalog/my-subjects${suffix}`);
}
