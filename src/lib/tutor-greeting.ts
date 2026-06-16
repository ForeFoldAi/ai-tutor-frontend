/** Shared Start Learning welcome copy (kept in sync with backend build_session_greeting). */

export function studentFirstName(fullName?: string | null): string {
  const name = (fullName || "").trim();
  if (!name) return "there";
  return name.split(/\s+/)[0] || "there";
}

export function buildStartLearningGreeting(opts: {
  firstName?: string;
  fullName?: string | null;
  subject: string;
  chapterNames?: string[];
}): string {
  const first = opts.firstName || studentFirstName(opts.fullName);
  const subject = opts.subject.trim() || "your subject";
  const names = (opts.chapterNames || []).map((n) => n.trim()).filter(Boolean);

  let scope: string;
  if (names.length === 1) {
    scope = `about ${names[0]} in ${subject}`;
  } else if (names.length === 2) {
    scope = `about ${names[0]} and ${names[1]} in ${subject}`;
  } else if (names.length > 2) {
    scope = `about ${names[0]}, ${names[1]}, and more in ${subject}`;
  } else {
    scope = `from your ${subject} textbook`;
  }

  return (
    `Hello ${first}! Welcome back. I'm your AI Tutor. ` +
    `What would you like to learn today? ` +
    `Feel free to ask any question ${scope}, from your homework, or about topics you're curious about.`
  );
}

/** Remove greet=1 from the URL so refresh does not replay the welcome. */
export function stripGreetSearchParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get("greet") !== "1") return;
  params.delete("greet");
  const qs = params.toString();
  const path = window.location.pathname;
  window.history.replaceState(null, "", qs ? `${path}?${qs}` : path);
}

export function hasGreetSearchParam(): boolean {
  return new URLSearchParams(window.location.search).get("greet") === "1";
}
