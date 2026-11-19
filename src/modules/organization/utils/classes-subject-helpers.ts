import type { ClassOverviewItem } from "@/modules/organization/types/classes-admin";

export function classSubjectMappingKey(classId: string, curriculum: string) {
  return `${classId}:${curriculum}`;
}

export function subjectTaggedPlacements(
  subjectId: string,
  classes: ClassOverviewItem[],
  mappings: Record<string, Record<string, boolean>>,
) {
  const grades = new Set<string>();
  const sections = new Set<string>();
  for (const cls of classes) {
    for (const curriculum of cls.curriculums) {
      const key = classSubjectMappingKey(cls.id, curriculum);
      if (mappings[key]?.[subjectId]) {
        grades.add(cls.grade);
        sections.add(cls.section);
      }
    }
  }
  return {
    grades: [...grades].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    sections: [...sections].sort(),
  };
}
