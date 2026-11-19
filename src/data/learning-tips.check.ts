/** Self-check: 370 tips + stable daily pick. Run: npx tsx src/data/learning-tips.check.ts */
import assert from "node:assert/strict";
import { LEARNING_TIPS, getTodaysLearningTip } from "./learning-tips";

assert.equal(LEARNING_TIPS.length, 370);
assert.equal(new Set(LEARNING_TIPS).size, 370);

const a = getTodaysLearningTip(new Date(2026, 6, 21));
const b = getTodaysLearningTip(new Date(2026, 6, 21, 23, 59));
const c = getTodaysLearningTip(new Date(2026, 6, 22));
assert.equal(a, b);
assert.notEqual(a, c);
assert.ok(LEARNING_TIPS.includes(a));

console.log("learning-tips.check: ok");
