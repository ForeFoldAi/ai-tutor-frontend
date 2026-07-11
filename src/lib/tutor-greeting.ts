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
  const names = (opts.chapterNames || []).map((n) => n.trim()).filter(Boolean);
  const subject = opts.subject.trim() || "your subject";

  let from: string;
  if (names.length === 1) {
    from = names[0];
  } else if (names.length === 2) {
    from = `${names[0]} and ${names[1]}`;
  } else if (names.length > 2) {
    from = `${names[0]}, ${names[1]}, and more`;
  } else {
    from = subject;
  }

  return `Hi ${first}, welcome back. What would you like to learn today from ${from}?`;
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
