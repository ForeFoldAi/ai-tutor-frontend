/** Self-check: WS URL helpers for Vercel. Run: npx tsx src/lib/api-base.check.ts */
function eq(actual: string, expected: string) {
  if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function toWsBase(httpBase: string): string {
  if (httpBase) return httpBase.replace(/^http/, "ws");
  return "ws://localhost:3000";
}

function buildWsUrl(httpBase: string, path: string, query?: Record<string, string>): string {
  const wsBase = toWsBase(httpBase);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "")).toString()}`
    : "";
  return `${wsBase}${normalized}${qs}`;
}

eq(toWsBase("https://api.example.com"), "wss://api.example.com");
eq(toWsBase("http://127.0.0.1:8000"), "ws://127.0.0.1:8000");
eq(
  buildWsUrl("https://api.example.com", "/ws/voice", { token: "abc" }),
  "wss://api.example.com/ws/voice?token=abc",
);
eq(
  buildWsUrl("", "/ws/events", { access_token: "t" }),
  "ws://localhost:3000/ws/events?access_token=t",
);

console.log("api-base.check: ok");
