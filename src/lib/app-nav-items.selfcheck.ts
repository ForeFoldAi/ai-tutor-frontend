/**
 * ponytail: assert-based self-check for shared nav helpers (no test runner).
 * Run: npx tsx src/lib/app-nav-items.selfcheck.ts
 */
import {
  getAppNavItems,
  isAppNavActive,
  isIndividualStudent,
  isIndividualTutor,
} from "./app-nav-items";
import { UserRole } from "@/types/schema";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(getAppNavItems(UserRole.STUDENT).length === 3, "individual student nav count");
assert(getAppNavItems(UserRole.STUDENT, "1").length === 5, "school student nav count");
assert(getAppNavItems(UserRole.STUDENT, null, "9").length === 5, "tutor-owned student nav count");
assert(getAppNavItems(UserRole.TUTOR, "12").length === 7, "school tutor nav count");
assert(getAppNavItems(UserRole.TUTOR, null).length === 9, "individual tutor nav count");
assert(getAppNavItems(UserRole.SCHOOL_ADMIN).length === 6, "school admin nav count");
assert(getAppNavItems(UserRole.MASTER_ADMIN).length === 9, "master admin nav count");
assert(isIndividualTutor(UserRole.TUTOR, null), "individual tutor flag");
assert(!isIndividualTutor(UserRole.TUTOR, "3"), "school tutor flag");
assert(isIndividualStudent(UserRole.STUDENT, null, null), "individual student flag");
assert(!isIndividualStudent(UserRole.STUDENT, "1", null), "school student flag");
assert(!isIndividualStudent(UserRole.STUDENT, null, "9"), "tutor-owned student flag");
assert(isAppNavActive("/dashboard", "/dashboard"), "exact active");
assert(isAppNavActive("/my-learning/xyz", "/my-learning"), "nested active");
assert(!isAppNavActive("/assignments", "/dashboard"), "inactive mismatch");

console.log("app-nav-items.selfcheck: ok");
