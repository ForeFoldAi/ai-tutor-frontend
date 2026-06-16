import { useEffect, useRef } from "react";
import {
  Bot,
  Mic,
  MicOff,
  PhoneOff,
  Square,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TextbookImageGallery,
  TextbookImagesRetrieving,
  type RelatedTextbookImage,
} from "@/components/assistant-message-content";
import { AiWaveform } from "./ai-waveform";
import type { TranscriptEntry, VoicePhase, VoiceRelatedImage } from "./voice-types";

const figureGalleryClass =
  "border-border [&_figure]:border-border [&_figure]:bg-muted/60 [&_figcaption]:text-muted-foreground [&_figcaption]:border-border";

function formatTranscriptTime(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

type Phase = VoicePhase;

function phaseLabel(phase: Phase, subjectLabel: string, tutorHint: string | null): string {
  switch (phase) {
    case "speaking":
      return `Speaking about ${subjectLabel}${tutorHint ? ` · ${tutorHint}` : ""}`;
    case "thinking":
      return "Thinking…";
    case "listening":
      return `Listening${tutorHint ? ` · ${tutorHint}` : ""}`;
    case "connecting":
      return "Connecting to your tutor…";
    default:
      return "Ready when you are";
  }
}

function VoicePresence({
  phase,
  subjectLabel,
  tutorHint,
  studentName,
  studentInitial,
  aiActive,
  aiIntensity,
  studentActive,
  studentIntensity,
  micEnabled,
}: {
  phase: Phase;
  subjectLabel: string;
  tutorHint: string | null;
  studentName: string;
  studentInitial: string;
  aiActive: boolean;
  aiIntensity: number;
  studentActive: boolean;
  studentIntensity: number;
  micEnabled: boolean;
}) {
  const tutorTurn = phase === "speaking" || phase === "thinking";
  const userTurn = phase === "listening" && (studentActive || micEnabled);
  const statusText = tutorTurn
    ? phase === "thinking"
      ? "EduAI is preparing a reply…"
      : "EduAI is speaking"
    : userTurn
      ? studentActive
        ? "You're speaking"
        : micEnabled
          ? "Listening for your voice"
          : "Microphone muted"
      : phaseLabel(phase, subjectLabel, tutorHint);

  return (
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
          {(tutorTurn || (userTurn && studentActive)) && (
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
            {tutorTurn ? "EduAI Tutor" : studentName}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{statusText}</p>
        </div>

        <div className="hidden sm:block w-24 shrink-0">
          <AiWaveform
            active={tutorTurn ? aiActive : studentActive}
            intensity={tutorTurn ? aiIntensity : studentIntensity}
            variant={tutorTurn ? "ai" : "student"}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  entry,
  accessToken,
}: {
  entry: TranscriptEntry;
  accessToken?: string | null;
}) {
  const isUser = entry.role === "user";
  const images = (entry.images ?? []) as RelatedTextbookImage[];
  const hasImages = images.length > 0;

  return (
    <div className={cn("flex gap-2.5 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
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

      <div className={cn("min-w-0 flex flex-col gap-1", isUser ? "items-end max-w-[85%]" : "items-start max-w-[90%]")}>
        <div className={cn("flex items-center gap-2 px-1", isUser && "flex-row-reverse")}>
          <span className={cn("text-[10px] font-medium", isUser ? "text-muted-foreground" : "text-indigo-600 dark:text-indigo-300")}>
            {isUser ? "You" : "EduAI"}
          </span>
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">{formatTranscriptTime(entry.timeSec)}</span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-card border border-border text-foreground",
          )}
        >
          {isUser ? (
            <>
              {entry.text ? <p className="whitespace-pre-wrap">{entry.text}</p> : null}
              {entry.userImageUrl ? (
                <div className="mt-2 rounded-xl overflow-hidden border border-primary-foreground/20 bg-black/10 dark:bg-black/20">
                  <img src={entry.userImageUrl} alt="Shared" className="w-full max-h-40 object-contain" />
                  {entry.userImageCaption ? (
                    <p className="text-xs text-primary-foreground/80 px-2.5 py-2 border-t border-primary-foreground/15">
                      {entry.userImageCaption}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col w-full min-w-0 gap-2">
              {entry.text ? <p className="whitespace-pre-wrap break-words">{entry.text}</p> : null}
              {hasImages ? (
                <TextbookImageGallery images={images} token={accessToken} className={figureGalleryClass} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StreamingBubble({
  streamingAssistantText,
  streamingRelatedImages,
  imagesRetrieving,
  imagesRetrievingHint,
  accessToken,
}: {
  streamingAssistantText?: string;
  streamingRelatedImages?: VoiceRelatedImage[];
  imagesRetrieving?: boolean;
  imagesRetrievingHint?: string;
  accessToken?: string | null;
}) {
  const streamingImages = (streamingRelatedImages ?? []) as RelatedTextbookImage[];

  return (
    <div className="flex gap-2.5 items-end">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex flex-col gap-1 items-start max-w-[90%]">
        <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 px-1">EduAI</span>
        <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 sm:px-4 sm:py-3 bg-card border border-border text-sm leading-relaxed shadow-sm w-full min-w-0 text-foreground">
          {!streamingAssistantText ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
              </span>
              <span>Composing reply…</span>
            </div>
          ) : (
            <div className="flex flex-col w-full min-w-0 gap-2">
              <p className="whitespace-pre-wrap break-words">
                {streamingAssistantText}
                <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
              </p>
              {streamingImages.length > 0 ? (
                <TextbookImageGallery images={streamingImages} token={accessToken} className={figureGalleryClass} />
              ) : imagesRetrieving ? (
                <TextbookImagesRetrieving
                  hint={imagesRetrievingHint}
                  className="border-border [&>div]:border-border [&>div]:bg-muted/50 [&_p]:text-muted-foreground"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VoiceLiveCall({
  phase,
  subjectLabel,
  studentName,
  studentInitial,
  micEnabled,
  speakerEnabled,
  aiActive,
  aiIntensity,
  studentActive,
  studentIntensity,
  tutorState,
  entries,
  isTyping,
  streamingAssistantText,
  streamingRelatedImages,
  imagesRetrieving,
  imagesRetrievingHint,
  accessToken,
  onToggleMic,
  onToggleSpeaker,
  onInterrupt,
  canInterrupt,
  onEndCall,
}: {
  phase: Phase;
  subjectLabel: string;
  studentName: string;
  studentInitial: string;
  micEnabled: boolean;
  speakerEnabled: boolean;
  aiActive: boolean;
  aiIntensity: number;
  studentActive: boolean;
  studentIntensity: number;
  tutorState?: string;
  entries: TranscriptEntry[];
  isTyping: boolean;
  streamingAssistantText?: string;
  streamingRelatedImages?: VoiceRelatedImage[];
  imagesRetrieving?: boolean;
  imagesRetrievingHint?: string;
  accessToken?: string | null;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onInterrupt: () => void;
  canInterrupt: boolean;
  onEndCall: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tutorHint =
    tutorState && tutorState !== "LISTENING" && tutorState !== "TEACHING"
      ? tutorState.replace(/_/g, " ").toLowerCase()
      : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [entries, isTyping, streamingAssistantText, streamingRelatedImages]);

  const showEmptyState = entries.length === 0 && !isTyping;

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden bg-background">
      <VoicePresence
        phase={phase}
        subjectLabel={subjectLabel}
        tutorHint={tutorHint}
        studentName={studentName}
        studentInitial={studentInitial}
        aiActive={aiActive}
        aiIntensity={aiIntensity}
        studentActive={studentActive}
        studentIntensity={studentIntensity}
        micEnabled={micEnabled}
      />

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth px-4 py-4 sm:px-6 lg:px-8 bg-background"
      >
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {showEmptyState ? (
            <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Ask a question out loud or type below. Your tutor will reply with voice and text.
              </p>
            </div>
          ) : null}

          {entries.map((entry) => (
            <MessageBubble key={entry.id} entry={entry} accessToken={accessToken} />
          ))}

          {isTyping ? (
            <StreamingBubble
              streamingAssistantText={streamingAssistantText}
              streamingRelatedImages={streamingRelatedImages}
              imagesRetrieving={imagesRetrieving}
              imagesRetrievingHint={imagesRetrievingHint}
              accessToken={accessToken}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-4 pt-2.5 pb-1.5 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full border",
              micEnabled
                ? "text-primary border-primary/30 bg-primary/10 hover:bg-primary/15"
                : "text-muted-foreground bg-muted border-border",
            )}
            onClick={onToggleMic}
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full border border-border",
              speakerEnabled ? "text-foreground bg-muted hover:bg-muted/80" : "text-muted-foreground bg-muted/50",
            )}
            onClick={onToggleSpeaker}
            aria-label={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
          >
            {speakerEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
            onClick={onEndCall}
            aria-label="End call"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
