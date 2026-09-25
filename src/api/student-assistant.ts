import { apiFetch, authFetch } from "@/api";
import type { AskAiTutorMode } from "@/lib/ask-ai-tutor-store";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StudentAssistantSuggestions {
  greeting: string;
  suggested_prompts: string[];
}

export interface StudentAssistantChatResponse {
  answer: string;
  suggested_prompts: string[];
}

export async function getStudentAssistantSuggestions(
  agentMode: AskAiTutorMode = "free",
): Promise<StudentAssistantSuggestions> {
  const qs = agentMode !== "free" ? `?agent_mode=${encodeURIComponent(agentMode)}` : "";
  return apiFetch<StudentAssistantSuggestions>(`/auth/student/assistant/suggestions${qs}`);
}

export async function sendStudentAssistantMessage(
  query: string,
  conversationHistory?: ConversationTurn[],
  agentMode: AskAiTutorMode = "free",
): Promise<StudentAssistantChatResponse> {
  return apiFetch<StudentAssistantChatResponse>("/auth/student/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      query,
      conversation_history: conversationHistory ?? [],
      agent_mode: agentMode,
    }),
  });
}

export async function streamStudentAssistantMessage(
  query: string,
  handlers: { onToken: (chunk: string) => void },
  conversationHistory?: ConversationTurn[],
  agentMode: AskAiTutorMode = "free",
  imageIds?: string[],
): Promise<void> {
  const res = await authFetch("/auth/student/assistant/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      conversation_history: conversationHistory ?? [],
      agent_mode: agentMode,
      image_ids: imageIds?.length ? imageIds : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Chat failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as { type: string; content?: string };
        if (evt.type === "token" && evt.content) handlers.onToken(evt.content);
        if (evt.type === "error" && evt.content) throw new Error(evt.content);
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.includes("JSON")) throw e;
        // Skip a torn NDJSON line rather than aborting the whole reply.
      }
    }
  }
}
