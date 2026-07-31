/** Learning Studio subject page where students pick chapters. */
export function chapterSelectionPath(
  subjectId: string | null | undefined,
  opts?: { from?: "my-learning" },
): string {
  const base = subjectId?.trim()
    ? `/ai-learning-studio/subject/${subjectId.trim()}`
    : "/ai-learning-studio";
  if (opts?.from === "my-learning") {
    return `${base}?from=my-learning`;
  }
  return base;
}
