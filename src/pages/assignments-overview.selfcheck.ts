/**
 * Assignment overview bucket math (no framework).
 * Run: npx tsx src/pages/assignments-overview.selfcheck.ts
 */
function bucketCounts(
  statuses: string[]
): { pending: number; inProgress: number; graded: number; total: number } {
  let pending = 0;
  let inProgress = 0;
  let graded = 0;
  for (const status of statuses) {
    if (status === "pending" || status === "overdue") pending += 1;
    else if (status === "in_progress") inProgress += 1;
    else if (status === "graded" || status === "submitted") graded += 1;
  }
  return { pending, inProgress, graded, total: pending + inProgress + graded };
}

const sample = bucketCounts([
  "pending",
  "pending",
  "in_progress",
  "graded",
  "submitted",
]);
if (sample.pending !== 2 || sample.inProgress !== 1 || sample.graded !== 2 || sample.total !== 5) {
  throw new Error(`unexpected buckets: ${JSON.stringify(sample)}`);
}

const topPendingAndInProcess = [
  { artifact_type: "quiz", status: "pending", deadline: "2026-07-25" },
  { artifact_type: "worksheet", status: "in_progress", deadline: "2026-07-20" },
  { artifact_type: "quiz", status: "overdue", deadline: "2026-07-18" },
  { artifact_type: "quiz", status: "pending", deadline: "2026-07-30" },
  { artifact_type: "quiz", status: "graded", deadline: "2026-07-10" },
]
  .filter((i) => i.status === "pending" || i.status === "overdue" || i.status === "in_progress")
  .sort((a, b) => {
    const rank = (s: string) => (s === "in_progress" ? 0 : 1);
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return a.deadline.localeCompare(b.deadline);
  })
  .slice(0, 3);

if (topPendingAndInProcess.length !== 3) throw new Error("expected 3 items");
if (topPendingAndInProcess[0]!.status !== "in_progress") throw new Error("in progress should rank first");

console.log("ok: assignments overview self-check");
