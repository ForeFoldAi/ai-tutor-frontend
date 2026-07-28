/** Known board/curriculum labels — not subjects like Science. */
const KNOWN_CURRICULA = new Set(
  ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Cambridge"].map((s) => s.toLowerCase()),
);

const SUBJECT_LIKE = new Set(
  ["Mathematics", "Science", "Physics", "Chemistry", "English", "Biology", "Social", "Hindi", "Sanskrit", "Computer"].map(
    (s) => s.toLowerCase(),
  ),
);

export type TeachingClassLike = {
  grade: string;
  sections: string[];
  curriculum?: string | null;
};

/** True when value is a board/curriculum, not a subject name. */
export function isCurriculumLabel(value?: string | null): boolean {
  const v = value?.trim();
  if (!v) return false;
  if (KNOWN_CURRICULA.has(v.toLowerCase())) return true;
  if (SUBJECT_LIKE.has(v.toLowerCase())) return false;
  return true;
}

/** Prefer per-class curriculum, then a valid teaching board. */
export function resolveClassCurriculum(
  assignedClass: TeachingClassLike | undefined,
  teachingBoard?: string | null,
): string {
  const fromClass = assignedClass?.curriculum?.trim();
  if (fromClass) return fromClass;
  const board = teachingBoard?.trim();
  if (board && isCurriculumLabel(board)) return board;
  return "";
}

export function classOptionLabel(grade: string, section: string, curriculum?: string | null): string {
  const base = `Grade ${String(grade).replace(/^CLASS_/, "")} · Section ${section}`;
  return curriculum?.trim() ? `${base} · ${curriculum.trim()}` : base;
}
