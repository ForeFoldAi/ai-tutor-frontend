import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Mic, MicOff, PhoneOff, Send, Square, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TutorMessageProse } from "@/lib/render-tutor-text";
import type { TranscriptLine, VoiceState } from "@/types/voice";
import { AiWaveform } from "./ai-waveform";
import { VoiceButton } from "./VoiceButton";

const START_LABEL: Record<VoiceState, string> = {
  IDLE: "Start Talking",
  CONNECTING: "Connecting...",
  LISTENING: "Listening...",
  PROCESSING: "Hearing you...",
  THINKING: "Thinking...",
  SPEAKING: "AI is speaking...",
  INTERRUPTED: "Listening...",
  ERROR: "Try again",
  ENDED: "Start Talking",
};

function formatTranscriptTime(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function voiceStateHint(state: VoiceState, hint: string, subject: string): string {
  if (hint.trim()) return hint;
  switch (state) {
    case "SPEAKING":
      return `Speaking about ${subject}`;
    case "THINKING":
      return "Thinking about what you said…";
    case "LISTENING":
    case "INTERRUPTED":
      return `Listening · ${subject}`;
    case "PROCESSING":
      return "Hearing you…";
    case "CONNECTING":
      return "Connecting to your tutor…";
    case "ERROR":
      return "Connection lost — tap Start Talking to retry";
    default:
      return "Ready when you are";
  }
}

function MessageBubble({
  line,
  timeSec,
}: {
  line: TranscriptLine;
  timeSec: number;
}) {
  const isUser = line.role === "user";
  return (
    <div className={cn("flex gap-2.5 items-end min-w-0", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mb-0.5",
          isUser ? "bg-primary/80" : "bg-gradient-to-br from-indigo-500 to-violet-600",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div className={cn("min-w-0 flex flex-col gap-1", isUser ? "items-end max-w-[92%]" : "items-start max-w-[96%]")}>
        <div className={cn("flex items-center gap-2 px-1", isUser && "flex-row-reverse")}>
          <span
            className={cn(
              "text-[10px] font-medium",
              isUser ? "text-muted-foreground" : "text-indigo-600 dark:text-indigo-300",
            )}
          >
            {isUser ? "You" : "AI Voice"}
          </span>
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">{formatTranscriptTime(timeSec)}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground whitespace-pre-wrap"
              : "rounded-bl-md border border-primary/25 bg-[hsl(var(--ai-purple-light))] text-foreground",
            line.pending && "opacity-70",
          )}
        >
          {isUser ? line.text : <TutorMessageProse text={line.text} className="break-words tutor-message-content" />}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5 items-end min-w-0">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex flex-col gap-1 items-start max-w-[96%]">
        <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 px-1">AI Voice</span>
        <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 sm:px-4 sm:py-3 border border-primary/25 bg-[hsl(var(--ai-purple-light))] text-sm leading-relaxed shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
            </span>
            <span>Composing reply…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoiceTutor({
  subject,
  state,
  error,
  hint = "",
  transcript,
  muted,
  level,
  callSeconds = 0,
  studentName,
  studentInitial,
  onStart,
  onMute,
  onInterrupt,
  onEnd,
  onSendText,
}: {
  subject: string;
  state: VoiceState;
  error: string;
  hint?: string;
  transcript: TranscriptLine[];
  muted: boolean;
  level: number;
  callSeconds?: number;
  studentName: string;
  studentInitial: string;
  onStart: () => void;
  onMute: () => void;
  onInterrupt: () => void;
  onEnd: () => void;
  onSendText?: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState("");
  const live = state !== "IDLE" && state !== "ENDED" && state !== "ERROR";
  const canInterrupt = state === "SPEAKING" || state === "THINKING";
  const tutorTurn = state === "SPEAKING" || state === "THINKING";
  const userTurn = (state === "LISTENING" || state === "INTERRUPTED" || state === "PROCESSING") && !muted;
  const studentActive = userTurn && level >= 0.02;
  const statusText = voiceStateHint(state, hint, subject || "your subject");
  const showThinking = state === "THINKING";
  const startDisabled = state === "CONNECTING" || state === "THINKING";
  const showCenterStart = !live && transcript.length === 0;

  const handleSendText = () => {
    if (!live) return;
    const trimmed = textInput.trim();
    if (!trimmed || !onSendText) return;
    onSendText(trimmed);
    setTextInput("");
  };

  const entriesWithTime = useMemo(
    () => transcript.map((line, i) => ({ line, timeSec: Math.max(0, callSeconds - (transcript.length - i) * 3) })),
    [callSeconds, transcript],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcript, showThinking, state]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden bg-background">
      <div
        className={cn(
          "shrink-0 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors duration-300",
          tutorTurn
            ? "bg-indigo-500/10 dark:bg-indigo-500/10"
            : userTurn
              ? "bg-emerald-500/10 dark:bg-emerald-500/10"
              : "bg-muted/40",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className={cn(
                "h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
                tutorTurn
                  ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-600 ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-background"
                  : userTurn
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-background"
                    : "bg-muted-foreground/30 ring-1 ring-border",
              )}
            >
              {tutorTurn ? (
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              ) : (
                <span className="text-sm sm:text-base font-semibold text-white">{studentInitial}</span>
              )}
            </div>
            {(tutorTurn || studentActive) && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background animate-pulse",
                  tutorTurn ? "bg-indigo-500" : "bg-emerald-500",
                )}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {tutorTurn ? "AI Voice Tutor" : studentName}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{statusText}</p>
          </div>
          <div className="hidden sm:block w-24 shrink-0">
            <AiWaveform
              active={tutorTurn ? state === "SPEAKING" : studentActive}
              intensity={tutorTurn ? 0.72 : Math.max(0.35, 0.35 + level * 0.65)}
              variant={tutorTurn ? "ai" : "student"}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth px-2 py-3 sm:px-3 bg-background"
      >
        <div className="w-full min-w-0 space-y-4">
          {showCenterStart ? (
            <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border bg-indigo-500/10 border-indigo-500/20">
                <Bot className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">
                {state === "ERROR" ? "Connection lost" : "Start a conversation"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                {state === "ERROR"
                  ? "Tap Try again and allow microphone access to reconnect."
                  : "Tap Start Talking and allow microphone access. Your tutor will reply with voice and text."}
              </p>
              <VoiceButton
                onClick={onStart}
                label={START_LABEL[state]}
                disabled={startDisabled}
              />
            </div>
          ) : null}

          {live && transcript.length === 0 && !showThinking ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">Your tutor is ready — ask your question out loud.</p>
            </div>
          ) : null}

          {entriesWithTime.map(({ line, timeSec }) => (
            <MessageBubble key={`${line.turnId}-${line.role}`} line={line} timeSec={timeSec} />
          ))}

          {showThinking ? <ThinkingBubble /> : null}

          {error ? <p className="text-center text-sm text-destructive px-4">{error}</p> : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-md">
        {live ? (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-4 pt-2.5 pb-1.5 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full border",
                !muted
                  ? "text-primary border-primary/30 bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground bg-muted border-border",
              )}
              onClick={onMute}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            >
              {!muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canInterrupt}
              className={cn(
                "h-9 w-9 rounded-full border",
                canInterrupt
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25"
                  : "border-border text-muted-foreground bg-muted/50 cursor-not-allowed opacity-50",
              )}
              onClick={onInterrupt}
              aria-label="Interrupt AI tutor"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md ml-0.5"
              onClick={onEnd}
              aria-label="End call"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        ) : showCenterStart ? null : (
          <div className="flex flex-col items-center px-4 pt-4 sm:pt-5">
            <VoiceButton onClick={onStart} label={START_LABEL[state]} disabled={startDisabled} />
          </div>
        )}
        <div className="px-4 pb-3 sm:px-6 sm:pb-3.5">
          <div className="flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (!live) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder={live ? "Type or speak your question…" : "Tap Start Talking, then type or speak…"}
              disabled={!live}
              className="flex-1 h-10 rounded-full bg-background border-border text-sm disabled:opacity-60"
            />
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white disabled:opacity-50"
              onClick={handleSendText}
              disabled={!live || !textInput.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
