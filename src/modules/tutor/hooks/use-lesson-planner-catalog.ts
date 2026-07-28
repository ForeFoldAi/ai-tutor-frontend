import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMySubjects } from "@/api/student";
import { useAuthStore } from "@/lib/auth-store";
import { isCurriculumLabel, resolveClassCurriculum } from "@/lib/teaching-curriculum";

const EMPTY_CLASSES: { grade: string; sections: string[]; curriculum?: string | null }[] = [];
const EMPTY_SUBJECTS: string[] = [];

export function gradeLabel(grade: string): string {
  const n = grade.replace(/^CLASS_/, "");
  return `Grade ${n}`;
}

export function useLessonPlannerCatalog(selectedGrade: string, selectedBoard: string) {
  const teachingClasses = useAuthStore((s) => s.user?.teachingClasses ?? EMPTY_CLASSES);
  const teachingSubjects = useAuthStore((s) => s.user?.teachingSubjects ?? EMPTY_SUBJECTS);
  const teachingBoard = useAuthStore((s) => s.user?.teachingBoard?.trim() ?? "");
  const defaultBoard = resolveClassCurriculum(
    teachingClasses.find((c) => c.grade === selectedGrade) ?? teachingClasses[0],
    teachingBoard,
  );

  const gradeOptions = useMemo(
    () => [...new Set(teachingClasses.map((c) => c.grade).filter(Boolean))].sort(),
    [teachingClasses],
  );

  const sectionOptions = useMemo(() => {
    const match = teachingClasses.find((c) => c.grade === selectedGrade);
    return match?.sections ?? [];
  }, [teachingClasses, selectedGrade]);

  const board = (selectedBoard && isCurriculumLabel(selectedBoard) ? selectedBoard : "") || defaultBoard;

  const { data: catalogSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["lesson-planner", "subjects", board, selectedGrade] as const,
    queryFn: () => getMySubjects({ classLevel: selectedGrade, board }),
    enabled: Boolean(board && selectedGrade && isCurriculumLabel(board)),
    staleTime: 5 * 60 * 1000,
  });

  const subjects = useMemo(() => {
    const tagged = new Set(
      teachingSubjects.map((name) => name.trim().toLowerCase()).filter(Boolean),
    );
    if (!tagged.size) return [];
    return catalogSubjects.filter((subject) =>
      tagged.has(subject.subject_name.trim().toLowerCase()),
    );
  }, [catalogSubjects, teachingSubjects]);

  return { gradeOptions, sectionOptions, subjects, loadingSubjects, defaultBoard };
}
