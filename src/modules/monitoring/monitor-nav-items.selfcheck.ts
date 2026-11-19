/**
 * Assert-based self-check for monitor nav (no test runner).
 * Run: npx tsx src/modules/monitoring/monitor-nav-items.selfcheck.ts
 */
import { isMonitorNavActive, monitorNavItems } from "./monitor-nav-items";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(monitorNavItems.length === 13, "monitor nav count");
assert(monitorNavItems[0].url.endsWith("/overview"), "overview first");
assert(monitorNavItems[12].url.endsWith("/settings"), "settings last");
assert(isMonitorNavActive("/master-admin/monitor/overview", "/master-admin/monitor/overview"), "exact");
assert(!isMonitorNavActive("/master-admin/monitor/logs", "/master-admin/monitor/overview"), "mismatch");

console.log("monitor-nav-items.selfcheck: ok");
