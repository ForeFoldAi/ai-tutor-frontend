/** Learning Studio subject page where students pick chapters. */
export function chapterSelectionPath(subjectId: string | null | undefined): string {
  if (subjectId?.trim()) {
    return `/ai-learning-studio/subject/${subjectId.trim()}`;
  }
  return "/ai-learning-studio";
}
