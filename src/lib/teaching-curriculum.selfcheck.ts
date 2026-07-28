/**
 * ponytail: assert-based self-check for curriculum vs subject labels.
 * Run: npx tsx src/lib/teaching-curriculum.selfcheck.ts
 */
import {
  classOptionLabel,
  isCurriculumLabel,
  resolveClassCurriculum,
} from "./teaching-curriculum";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(isCurriculumLabel("CBSE"), "cbse is curriculum");
assert(isCurriculumLabel("State Board"), "state board is curriculum");
assert(!isCurriculumLabel("Science"), "science is subject");
assert(!isCurriculumLabel("Mathematics"), "math is subject");

assert(
  resolveClassCurriculum({ grade: "9", sections: ["A"], curriculum: "CBSE" }, "Science") === "CBSE",
  "prefer class curriculum over subject-as-board",
);
assert(
  resolveClassCurriculum({ grade: "9", sections: ["A"] }, "CBSE") === "CBSE",
  "fall back to valid board",
);
assert(
  resolveClassCurriculum({ grade: "9", sections: ["A"] }, "Science") === "",
  "reject subject-as-board",
);
assert(
  classOptionLabel("9", "A", "CBSE") === "Grade 9 · Section A · CBSE",
  "option label",
);

console.log("teaching-curriculum.selfcheck: ok");
