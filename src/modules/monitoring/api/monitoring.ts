import { apiFetch } from "@/api";

const BASE = "/auth/admin/monitoring";

export type OverviewResponse = {
  overall_status: string;
  api_success_rate: number | null;
  error_rate: number | null;
  request_volume: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  latency_p99_ms: number | null;
  active_incidents: number;
  open_issues: number;
  affected_users: number;
  cpu_percent: number | null;
  ram_percent: number | null;
  disk_percent: number | null;
  database_status: string;
  redis_status: string;
  containers: Record<string, unknown>[];
  ai_tutor_status: string;
  recent_deployments: Record<string, unknown>[];
  recent_alerts: Record<string, unknown>[];
  services: Record<string, unknown>[];
  unavailable: string[];
};

export type IssueOut = {
  id: number;
  fingerprint: string;
  title: string;
  culprit: string | null;
  severity: string;
  status: string;
  environment: string;
  service_key: string | null;
  release: string | null;
  occurrence_count: number;
  affected_users: number;
  assignee_user_id: number | null;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

export type LogEntry = {
  ts: string | null;
  environment: string | null;
  service: string | null;
  module: string | null;
  severity: string | null;
  message: string;
  request_id: string | null;
  trace_id: string | null;
  release: string | null;
  duration_ms: number | null;
  raw: Record<string, unknown> | null;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function getMonitoringOverview(params: {
  environment?: string;
  service?: string;
  hours?: number;
} = {}) {
  return apiFetch<OverviewResponse>(`${BASE}/overview${qs(params)}`);
}

export function getMonitoringIssues(params: {
  status?: string;
  severity?: string;
  service?: string;
  q?: string;
  page?: number;
  page_size?: number;
} = {}) {
  return apiFetch<{ items: IssueOut[]; total: number; page: number; page_size: number }>(
    `${BASE}/issues${qs(params)}`,
  );
}

export function getMonitoringIssue(id: number) {
  return apiFetch<{
    issue: IssueOut;
    events: Record<string, unknown>[];
    comments: { id: number; issue_id: number; author_user_id: number; body: string; created_at: string }[];
  }>(`${BASE}/issues/${id}`);
}

export function patchMonitoringIssue(
  id: number,
  body: { status?: string; severity?: string; assignee_user_id?: number },
) {
  return apiFetch<IssueOut>(`${BASE}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function commentMonitoringIssue(id: number, body: string) {
  return apiFetch(`${BASE}/issues/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export function getMonitoringLogs(params: {
  q?: string;
  service?: string;
  severity?: string;
  request_id?: string;
  trace_id?: string;
  hours?: number;
  limit?: number;
} = {}) {
  return apiFetch<{
    items: LogEntry[];
    next_cursor: string | null;
    source: string;
    unavailable: boolean;
    message: string | null;
  }>(`${BASE}/logs${qs(params)}`);
}

export function getMonitoringIncidents(status?: string) {
  return apiFetch<{ items: Record<string, unknown>[]; total: number }>(
    `${BASE}/incidents${qs({ status })}`,
  );
}

export function createMonitoringIncident(body: {
  title: string;
  severity?: string;
  service_key?: string;
  environment?: string;
  related_issue_ids?: number[];
}) {
  return apiFetch(`${BASE}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getMonitoringIncident(id: number) {
  return apiFetch<{
    incident: Record<string, unknown>;
    events: Record<string, unknown>[];
    comments: Record<string, unknown>[];
  }>(`${BASE}/incidents/${id}`);
}

export function patchMonitoringIncident(
  id: number,
  body: Record<string, unknown>,
) {
  return apiFetch(`${BASE}/incidents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getMonitoringServices() {
  return apiFetch<{ items: Record<string, unknown>[] }>(`${BASE}/services`);
}

export function getMonitoringInfrastructure() {
  return apiFetch<Record<string, unknown>>(`${BASE}/infrastructure`);
}

export function getMonitoringPerformance(params: { hours?: number; service?: string } = {}) {
  return apiFetch<Record<string, unknown>>(`${BASE}/performance${qs(params)}`);
}

export function getMonitoringAiTutor(params: { hours?: number } = {}) {
  return apiFetch<Record<string, unknown>>(`${BASE}/ai-tutor${qs(params)}`);
}

export function getMonitoringLlmRouting() {
  return apiFetch<Record<string, unknown>>(`${BASE}/llm-routing`);
}

export function getMonitoringActiveUsers(params: { minutes?: number } = {}) {
  return apiFetch<Record<string, unknown>>(`${BASE}/active-users${qs(params)}`);
}

export function getMonitoringUx(params: { hours?: number } = {}) {
  return apiFetch<Record<string, unknown>>(`${BASE}/ux${qs(params)}`);
}

export function getMonitoringAlerts(status?: string) {
  return apiFetch<{ items: Record<string, unknown>[]; total: number }>(
    `${BASE}/alerts${qs({ status })}`,
  );
}

export function ackMonitoringAlert(id: number, note?: string) {
  return apiFetch(`${BASE}/alerts/${id}/ack${qs({ note })}`, { method: "POST" });
}

export function getMonitoringAlertRules() {
  return apiFetch<Record<string, unknown>[]>(`${BASE}/alert-rules`);
}

export function createMonitoringAlertRule(body: Record<string, unknown>) {
  return apiFetch(`${BASE}/alert-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getMonitoringDeployments() {
  return apiFetch<Record<string, unknown>[]>(`${BASE}/deployments`);
}

export function getMonitoringReports(hours = 168) {
  return apiFetch<Record<string, unknown>>(`${BASE}/reports${qs({ hours })}`);
}

export function getMonitoringSettings() {
  return apiFetch<Record<string, unknown>>(`${BASE}/settings`);
}

export function patchMonitoringSettings(body: Record<string, unknown>) {
  return apiFetch(`${BASE}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
