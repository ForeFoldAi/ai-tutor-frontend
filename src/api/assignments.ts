import { apiFetch } from "@/api/index";

export type AssignableArtifactType = "worksheet" | "quiz" | "homework";

export type TutorAssignmentCounts = {
  pending: number;
  in_progress: number;
  submitted: number;
  graded: number;
  overdue: number;
  total: number;
};

export type TutorAssignmentItem = {
  id: number;
  lesson_plan_id?: number | null;
  title: string;
  artifact_type: AssignableArtifactType | string;
  subject: string;
  grade: string;
  section: string;
  curriculum: string;
  chapter_name: string;
  deadline: string;
  status: string;
  counts: TutorAssignmentCounts;
  created_at: string;
};

export type CreateAssignmentsPayload = {
  lesson_plan_id: number;
  artifact_types: AssignableArtifactType[];
  deadline: string;
  grade: string;
  section: string;
  curriculum?: string;
  subject?: string;
};

export type CreateAssignmentsResponse = {
  created: TutorAssignmentItem[];
  message: string;
};

export type PreviewMatchResponse = {
  matched_count: number;
  grade: string;
  section: string;
  curriculum: string;
  subject: string | null;
};

export type StudentResultItem = {
  id: string;
  question: string;
  student_answer: string;
  correct_answer?: string | null;
  is_correct?: boolean | null;
};

export type StudentResultRow = {
  submission_id: number;
  student_id: number;
  student_name: string;
  status: string;
  score: number | null;
  max_score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  result_items?: StudentResultItem[];
  auto_scored?: boolean | null;
};

export type AssignmentResultsResponse = {
  assignment: TutorAssignmentItem;
  students: StudentResultRow[];
};

export type StudentAssignmentListItem = {
  id: number;
  submission_id: number;
  title: string;
  artifact_type: string;
  subject: string;
  teacher_name: string;
  grade: string;
  section: string;
  curriculum: string;
  chapter_name: string;
  deadline: string;
  status: string;
  question_count: number;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
};

export type AssignmentContentItem = {
  id: string;
  number: number;
  question?: string;
  title?: string;
  description?: string;
  type: string;
  options?: string[];
  option_keys?: string[];
};

export type StudentAssignmentDetail = {
  id: number;
  submission_id: number;
  title: string;
  artifact_type: string;
  subject: string;
  teacher_name: string;
  deadline: string;
  status: string;
  content: { kind?: string; items?: AssignmentContentItem[] } | null;
  answers: Record<string, string> | null;
  result: {
    items?: Array<{
      id: string;
      question: string;
      student_answer: string;
      correct_answer?: string | null;
      is_correct?: boolean | null;
    }>;
    auto_scored?: boolean;
  } | null;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
};

export function previewAssignmentMatch(payload: {
  grade: string;
  section: string;
  curriculum?: string;
  subject?: string;
}) {
  return apiFetch<PreviewMatchResponse>("/api/tutor/assignments/preview-match", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createTutorAssignments(payload: CreateAssignmentsPayload) {
  return apiFetch<CreateAssignmentsResponse>("/api/tutor/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listTutorAssignments() {
  return apiFetch<{ items: TutorAssignmentItem[]; total: number }>("/api/tutor/assignments");
}

export function getAssignmentResults(assignmentId: number) {
  return apiFetch<AssignmentResultsResponse>(`/api/tutor/assignments/${assignmentId}/results`);
}

export function patchAssignmentDeadline(assignmentId: number, deadline: string) {
  return apiFetch<TutorAssignmentItem>(`/api/tutor/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ deadline }),
  });
}

export function listStudentAssignments() {
  return apiFetch<{ items: StudentAssignmentListItem[]; total: number }>("/api/student/assignments");
}

export function getStudentAssignment(assignmentId: number) {
  return apiFetch<StudentAssignmentDetail>(`/api/student/assignments/${assignmentId}`);
}

export function startStudentAssignment(assignmentId: number) {
  return apiFetch<StudentAssignmentDetail>(`/api/student/assignments/${assignmentId}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function submitStudentAssignment(assignmentId: number, answers: Record<string, string>) {
  return apiFetch<StudentAssignmentDetail>(`/api/student/assignments/${assignmentId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
