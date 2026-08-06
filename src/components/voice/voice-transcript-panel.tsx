import { useEffect, useRef } from "react";
import { Bot, Paperclip, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TutorMessageProse } from "@/lib/render-tutor-text";
import {
  TextbookImageGallery,
  TextbookImagesRetrieving,
  type RelatedTextbookImage,
} from "@/components/assistant-message-content";
import { MathLessonPanel } from "@/components/math-lesson/math-lesson-panel";
import { ScienceExperimentPanel } from "@/components/science-experiment/science-experiment-panel";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import type { TranscriptEntry, VoiceRelatedImage } from "./voice-types";

function formatTranscriptTime(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export function VoiceTranscriptPanel({
  entries,
  isTyping,
  streamingAssistantText,
  streamingRelatedImages,
  streamingMathLesson,
  streamingScienceExperiment,
  imagesRetrieving,
  imagesRetrievingHint,
  textInput,
  onTextInputChange,
  onSendText,
  onAttachImage,
  accessToken,
}: {
  entries: TranscriptEntry[];
  isTyping: boolean;
  streamingAssistantText?: string;
  streamingRelatedImages?: VoiceRelatedImage[];
  streamingMathLesson?: MathLesson | null;
  streamingScienceExperiment?: ScienceExperiment | null;
  imagesRetrieving?: boolean;
  imagesRetrievingHint?: string;
  textInput: string;
  onTextInputChange: (v: string) => void;
  onSendText: () => void;
  onAttachImage: () => void;
  accessToken?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [entries, isTyping, streamingAssistantText, streamingRelatedImages, streamingMathLesson, streamingScienceExperiment]);

  const streamingImages = (streamingRelatedImages ?? []) as RelatedTextbookImage[];
  const showStreamingImages = streamingImages.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white">Live transcript</span>
        </div>
        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
          Auto-saving
        </Badge>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth px-3 py-3 sm:px-4 sm:py-4 space-y-3"
      >
        {entries.length === 0 && !isTyping ? (
          <p className="text-center text-sm text-slate-500 py-6">
            Your conversation will appear here. Speak or type to begin.
          </p>
        ) : null}
        {entries.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} accessToken={accessToken} />
        ))}

        {isTyping && (
          <div className="flex gap-2 items-start">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <div
              className={cn(
                "rounded-2xl rounded-tl-md px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-800/90 border border-white/10 min-w-0",
                (streamingImages.length > 0 || showStreamingImages) ? "w-full max-w-full" : "max-w-[92%]",
              )}
            >
              <p className="text-[10px] uppercase tracking-wide text-indigo-300 mb-1">AI Voice</p>
              {!streamingAssistantText ? (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                  <span>Typing…</span>
                </div>
              ) : null}
              {streamingAssistantText ? (
                <div className="flex flex-col w-full min-w-0" data-layout="text-top-images-row">
                  <TutorMessageProse
                    text={streamingAssistantText}
                    className="text-slate-200 break-words tutor-message-content"
                  >
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  </TutorMessageProse>
                  {showStreamingImages ? (
                    <TextbookImageGallery
                      images={streamingImages}
                      token={accessToken}
                      className="border-white/10 [&_figure]:border-white/15 [&_figure]:bg-slate-900/60 [&_figcaption]:text-slate-400 [&_figcaption]:border-white/10"
                    />
                  ) : imagesRetrieving ? (
                    <TextbookImagesRetrieving
                      hint={imagesRetrievingHint}
                      className="border-white/10 [&>div]:border-white/15 [&>div]:bg-slate-900/40 [&_p]:text-slate-300"
                    />
                  ) : null}
                  {streamingMathLesson ? <MathLessonPanel lesson={streamingMathLesson} /> : null}
                  {streamingScienceExperiment ? (
                    <ScienceExperimentPanel experiment={streamingScienceExperiment} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-2 sm:p-3 border-t border-white/10 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full text-slate-300 hover:bg-white/10"
            onClick={onAttachImage}
            aria-label="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={textInput}
            onChange={(e) => onTextInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendText();
              }
            }}
            placeholder="Type a message or question…"
            className="flex-1 bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 rounded-full h-9 sm:h-10 text-sm"
          />
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white"
            onClick={onSendText}
            disabled={!textInput.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({
  entry,
  accessToken,
}: {
  entry: TranscriptEntry;
  accessToken?: string | null;
}) {
  const isUser = entry.role === "user";
  const label = isUser ? "You" : "AI Voice";
  const images = (entry.images ?? []) as RelatedTextbookImage[];
  const hasImages = images.length > 0;

  return (
    <div className={cn("flex gap-2 items-start", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-slate-600" : "bg-gradient-to-br from-indigo-500 to-violet-600",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" /> : <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />}
      </div>
      <div
        className={cn(
          "min-w-0 flex flex-col",
          isUser ? "items-end max-w-[88%]" : hasImages ? "items-start w-full max-w-full" : "items-start max-w-[92%]",
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isUser ? "text-slate-400" : "text-indigo-300")}>
            {label}
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">{formatTranscriptTime(entry.timeSec)}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 border text-sm leading-relaxed w-full min-w-0 overflow-hidden",
            isUser
              ? "rounded-tr-md bg-indigo-500/25 border-indigo-400/20 text-slate-100 whitespace-pre-wrap"
              : "rounded-tl-md bg-slate-800/90 border-white/10 text-slate-100",
          )}
        >
          {isUser ? (
            <>
              {entry.text ? <p className="whitespace-pre-wrap">{entry.text}</p> : null}
              {entry.userImageUrl ? (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                  <img src={entry.userImageUrl} alt="Shared" className="w-full max-h-36 object-contain" />
                  {entry.userImageCaption ? (
                    <p className="text-xs text-slate-400 px-2 py-1.5 border-t border-white/10">{entry.userImageCaption}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col w-full min-w-0" data-layout="text-top-images-row">
              {entry.text ? (
                <TutorMessageProse text={entry.text} className="break-words tutor-message-content" />
              ) : null}
              {hasImages ? (
                <TextbookImageGallery
                  images={images}
                  token={accessToken}
                  className="border-white/10 [&_figure]:border-white/15 [&_figure]:bg-slate-900/60 [&_figcaption]:text-slate-400 [&_figcaption]:border-white/10"
                />
              ) : null}
              {entry.mathLesson ? <MathLessonPanel lesson={entry.mathLesson} /> : null}
              {entry.scienceExperiment ? (
                <ScienceExperimentPanel experiment={entry.scienceExperiment} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
