import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Bot,
  Lightbulb,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PencilLine,
  PhoneOff,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useAskAiTutorStore, type AskAiTutorMode } from "@/lib/ask-ai-tutor-store";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import {
  getStudentAssistantSuggestions,
  streamStudentAssistantMessage,
  type ConversationTurn,
} from "@/api/student-assistant";
import { studentFriendlyError } from "@/lib/student-messages";
import { AssistantMessageContent } from "@/components/assistant-message-content";
import { useVoiceTutor } from "@/hooks/voice/useVoiceTutor";
import { AiWaveform } from "@/components/voice/ai-waveform";
import type { VoiceState } from "@/types/voice";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MODE_META: Record<
  AskAiTutorMode,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    icon: typeof MessageCircle;
    fallbackPrompts: string[];
  }
> = {
  free: {
    title: "Ask AI Tutor",
    subtitle: "Platform help + school questions — including outside the textbook",
    placeholder: "Ask about school topics, homework, progress, or the platform…",
    icon: MessageCircle,
    fallbackPrompts: [],
  },
  ask: {
    title: "Ask Textbook Q&A",
    subtitle: "Short textbook Q&A — out-of-book? Use Ask AI Tutor",
    placeholder: "Ask a question from your textbook subjects…",
    icon: MessageCircle,
    fallbackPrompts: [
      "What is photosynthesis?",
      "How do I find the area of a triangle?",
    ],
  },
  practice: {
    title: "Practice Problems",
    subtitle: "Textbook practice problems — one at a time with feedback",
    placeholder: "Name a textbook topic you want to practice…",
    icon: PencilLine,
    fallbackPrompts: [
      "Give me a practice problem on fractions",
      "Practice linear equations",
    ],
  },
  explain: {
    title: "Explain a Topic",
    subtitle: "Step-by-step textbook explanation — not a quiz",
    placeholder: "What textbook topic should I explain step by step?",
    icon: Lightbulb,
    fallbackPrompts: [
      "Explain photosynthesis step by step",
      "Explain how to add fractions",
    ],
  },
};

function sanitizeAssistantText(s: string) {
  return s.replace(/\*/g, "");
}

function voiceStatusLabel(state: VoiceState): string {
  switch (state) {
    case "CONNECTING":
      return "Connecting…";
    case "LISTENING":
    case "INTERRUPTED":
      return "Listening…";
    case "PROCESSING":
      return "Hearing you…";
    case "THINKING":
      return "Thinking…";
    case "SPEAKING":
      return "Speaking…";
    case "ERROR":
      return "Voice error";
    default:
      return "";
  }
}

function isVoiceLive(state: VoiceState, sessionId: string): boolean {
  if (sessionId) return state !== "ENDED" && state !== "ERROR" && state !== "IDLE";
  return state === "CONNECTING";
}

function AskAiTutorChat({
  mode,
  onClose,
}: {
  mode: AskAiTutorMode;
  onClose?: () => void;
}) {
  const { user, token } = useAuthStore();
  const [, setLocation] = useLocation();
  const meta = MODE_META[mode];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(meta.fallbackPrompts);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceEndRef = useRef<() => void>(() => undefined);

  const conversationHistory = useMemo(
    (): ConversationTurn[] =>
      messages
        .filter((m) => m.content.trim())
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  const voice = useVoiceTutor({
    token: token || "",
    scope: null,
    agentMode: mode,
    conversationHistory,
    greet: false,
  });
  voiceEndRef.current = voice.end;

  const voiceLive = isVoiceLive(voice.state, voice.sessionId);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setInput("");
    setError(null);
    setBootLoading(true);
    (async () => {
      try {
        const data = await getStudentAssistantSuggestions(mode);
        if (cancelled) return;
        setSuggestedPrompts(
          (data.suggested_prompts.length
            ? data.suggested_prompts
            : MODE_META[mode].fallbackPrompts
          ).slice(0, 2)
        );
      } catch (e) {
        if (!cancelled) {
          setSuggestedPrompts(MODE_META[mode].fallbackPrompts);
          setError(sanitizeAssistantText(studentFriendlyError(e, "Could not load assistant.")));
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      voiceEndRef.current();
    };
  }, []);

  // Merge voice transcript lines into the shared message list (including
  // in-progress assistant text so it appears while the tutor is speaking).
  useEffect(() => {
    setMessages((prev) => {
      const kept = prev.filter((m) => !m.id.startsWith("v-"));
      const voiceMsgs: Message[] = [];
      for (const line of voice.transcript) {
        if (line.pending && line.role !== "user" && line.role !== "assistant") continue;
        voiceMsgs.push({
          id: `v-${line.role === "user" ? "u" : "a"}-${line.turnId}`,
          role: line.role,
          content:
            line.role === "assistant" ? sanitizeAssistantText(line.text) : line.text,
        });
      }
      return [...kept, ...voiceMsgs];
    });
  }, [voice.transcript]);

  useEffect(() => {
    if (voice.error) setError(sanitizeAssistantText(voice.error));
  }, [voice.error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: streaming || voiceLive ? "auto" : "smooth",
    });
  }, [messages, streaming, voiceLive, voice.state]);

  const history = useCallback((): ConversationTurn[] => {
    return messages
      .filter((m) => m.content.trim())
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const sendMessage = async (text: string) => {
    const query = text.trim();
    if (!query || loading || streaming) return;

    setError(null);
    setInput("");

    if (voiceLive && voice.sessionId) {
      voice.sendText(query);
      return;
    }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: query };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setLoading(true);
    setStreaming(true);

    try {
      await streamStudentAssistantMessage(
        query,
        {
          onToken: (chunk) => {
            const safeChunk = sanitizeAssistantText(chunk);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + safeChunk } : m
              )
            );
          },
        },
        history(),
        mode
      );
    } catch (e) {
      setError(sanitizeAssistantText(studentFriendlyError(e, "Something went wrong. Please try again.")));
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const toggleVoice = () => {
    if (voiceLive) {
      voice.end();
      return;
    }
    void voice.start();
  };

  const firstName = user?.fullName?.split(" ")[0] || "Student";
  const status = voiceStatusLabel(voice.state);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4 pb-6">
          {bootLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your assistant…
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex items-start gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="mt-0.5 h-8 w-8 shrink-0 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
                      msg.role === "user"
                        ? "bg-gradient-brand text-white"
                        : "border border-border/60 bg-card text-foreground shadow-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      msg.content ? (
                        <AssistantMessageContent
                          content={msg.content}
                          isStreaming={
                            streaming && msg.id === messages[messages.length - 1]?.id
                          }
                        />
                      ) : streaming && msg.id === messages[messages.length - 1]?.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null
                    ) : (
                      <p className="whitespace-pre-wrap leading-[1.5]">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-muted text-xs font-medium">
                        {firstName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {!loading && !bootLoading && suggestedPrompts.length > 0 && messages.length === 0 && (
                <div className="space-y-2 pt-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Try asking
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 sm:text-sm"
                      >
                        {sanitizeAssistantText(prompt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="shrink-0 border-t bg-background/90 px-4 py-3"
      >
        {voiceLive ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5">
            <AiWaveform
              active={
                voice.state === "LISTENING" ||
                voice.state === "SPEAKING" ||
                voice.state === "PROCESSING"
              }
              intensity={voice.state === "SPEAKING" ? 0.55 : Math.max(0.15, voice.level)}
              variant={voice.state === "SPEAKING" ? "ai" : "student"}
              className="h-6 w-16 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {voice.hint || status || "Voice on"}
            </span>
            {voice.state === "SPEAKING" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => voice.interrupt()}
                title="Interrupt"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive"
              onClick={() => voice.end()}
              title="End voice"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={voiceLive ? "Type while talking, or just speak…" : meta.placeholder}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none !border-2 !border-slate-300 bg-white shadow-sm placeholder:text-slate-400 focus-visible:!border-primary dark:!border-slate-500 dark:bg-card"
            disabled={bootLoading || loading}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(
              "h-11 w-11 shrink-0",
              voiceLive
                ? "border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                : "border-slate-200 text-slate-400 bg-slate-50 opacity-70 dark:border-slate-600 dark:text-slate-500 dark:bg-slate-900/40",
            )}
            disabled={bootLoading || !token || voice.state === "CONNECTING"}
            onClick={toggleVoice}
            title={voiceLive ? "Mic on — tap to turn off" : "Mic off — tap to talk"}
            aria-pressed={voiceLive}
            aria-label={voiceLive ? "Turn microphone off" : "Turn microphone on"}
          >
            {voice.state === "CONNECTING" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : voiceLive ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 bg-gradient-brand"
            disabled={bootLoading || loading || !input.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {mode === "free" ? (
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                voice.end();
                onClose?.();
                setLocation("/ai-learning-studio");
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Study a chapter
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}

/** Modal popup for Ask AI Tutor / Quick Start modes — no subject/chapter picker. */
export function AskAiTutorDialog() {
  const open = useAskAiTutorStore((s) => s.open);
  const mode = useAskAiTutorStore((s) => s.mode);
  const setOpen = useAskAiTutorStore((s) => s.setAskAiTutorOpen);
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="!flex h-[min(88dvh,720px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full [&>button]:right-3 [&>button]:top-3">
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-sm">
              {mode === "free" ? (
                <AiTutorButtonIcon className="h-7 w-7" />
              ) : (
                <Icon className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">{meta.title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">{meta.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {open ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AskAiTutorChat key={mode} mode={mode} onClose={() => setOpen(false)} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
