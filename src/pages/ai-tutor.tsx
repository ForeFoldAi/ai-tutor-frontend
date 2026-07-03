import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  FileText,
  Loader2,
  Plus,
  MessageSquare,
  Trash2,
  Upload,
  X,
  ChevronRight,
  Volume2,
  Square,
  ArrowLeft,
  History,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { apiFetch, authFetch } from "@/api";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import {
  AssistantMessageContent,
  type RelatedTextbookImage,
} from "@/components/assistant-message-content";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { cn } from "@/lib/utils";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import {
  buildStartLearningGreeting,
  hasGreetSearchParam,
  stripGreetSearchParam,
} from "@/lib/tutor-greeting";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";

export type { RelatedTextbookImage };

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relatedImages?: RelatedTextbookImage[];
  mathLesson?: MathLesson | null;
  scienceExperiment?: ScienceExperiment | null;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const quickActions = [
  { label: "Explain simpler", icon: Lightbulb, prompt: "Can you explain that in simpler terms?" },
  { label: "Give example", icon: FileText, prompt: "Can you give me an example?" },
  { label: "Summarize", icon: MessageSquare, prompt: "Can you summarize the key points?" },
];

const suggestedTopics = [
  "Help me understand quadratic equations",
  "Explain photosynthesis step by step",
  "What are the key themes in Shakespeare's Hamlet?",
  "How does Newton's third law work?",
];

// API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || "";

// Voice API URL from environment
const VOICE_URL = import.meta.env.VITE_VOICE_URL || API_URL;

// Upload PDF file
const uploadPDF = async (file: File): Promise<void> => {
  if (!API_URL) {
    throw new Error(MSG.configUnavailable);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(studentFriendlyApiError(errorText, response.status, MSG.uploadFailed));
  }
};

interface ChapterContext {
  board: string;
  classLevel: string;
  subject: string;
  subjectId: string | null;
  chapterIds: string[];
  chapterNames: string[];
}

function useChapterContext(): ChapterContext | null {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const board = params.get("board");
    const classLevel = params.get("class");
    const subject = params.get("subject");
    const chaptersRaw = params.get("chapters");
    if (!board || !classLevel || !subject || !chaptersRaw) return null;
    return {
      board,
      classLevel,
      subject,
      subjectId: params.get("subjectId"),
      chapterIds: chaptersRaw.split(",").filter(Boolean),
      chapterNames: (params.get("chapterNames") || "").split("||").filter(Boolean),
    };
  }, []);
}

const sendChatMessage = async (query: string): Promise<string> => {
  if (!API_URL) {
    throw new Error(MSG.configUnavailable);
  }

  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(studentFriendlyApiError(errorText, response.status, MSG.chatFailed));
  }

  const data = await response.json();
  return data.answer || "";
};

const sendChapterChatMessage = async (
  query: string,
  ctx: ChapterContext,
  conversationHistory?: Array<{ role: string; content: string }>,
): Promise<{
  answer: string;
  relatedImages: RelatedTextbookImage[];
  mathLesson?: MathLesson | null;
  scienceExperiment?: ScienceExperiment | null;
}> => {
  const data = await apiFetch<{
    answer: string;
    related_images?: RelatedTextbookImage[];
    math_lesson?: MathLesson | null;
    science_experiment?: ScienceExperiment | null;
  }>("/auth/chat", {
    method: "POST",
    body: JSON.stringify({
      query,
      board: ctx.board,
      class_level: ctx.classLevel,
      subject_name: ctx.subject,
      chapter_ids: ctx.chapterIds,
      chapter: ctx.chapterNames[0] || "",
      chapter_names: ctx.chapterNames,
      conversation_history: conversationHistory ?? [],
    }),
  });
  return {
    answer: data.answer || "",
    relatedImages: data.related_images ?? [],
    mathLesson: data.math_lesson ?? null,
    scienceExperiment: data.science_experiment ?? null,
  };
};

function buildConversationHistory(
  messages: Message[],
  maxTurns = 8,
): Array<{ role: string; content: string }> {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-maxTurns)
    .map((m) => ({ role: m.role, content: m.content }));
}

async function streamChapterChatMessage(
  query: string,
  ctx: ChapterContext,
  handlers: {
    onToken: (chunk: string) => void;
    onImages: (images: RelatedTextbookImage[]) => void;
    onMathLesson?: (lesson: MathLesson, cleanAnswer: string) => void;
    onScienceExperiment?: (experiment: ScienceExperiment, cleanAnswer: string) => void;
  },
  conversationHistory?: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await authFetch("/auth/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      board: ctx.board,
      class_level: ctx.classLevel,
      subject_name: ctx.subject,
      chapter_ids: ctx.chapterIds,
      chapter: ctx.chapterNames[0] || "",
      chapter_names: ctx.chapterNames,
      conversation_history: conversationHistory ?? [],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(studentFriendlyApiError(text, res.status, MSG.streamFailed));
  }
  if (!res.body) {
    throw new Error(MSG.streamFailed);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const parseLine = (trimmed: string) => {
    if (!trimmed) return;
    let evt: {
      type?: string;
      content?: string;
      images?: RelatedTextbookImage[];
      lesson?: MathLesson;
      experiment?: ScienceExperiment;
      clean_answer?: string;
    };
    try {
      evt = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (evt.type === "token" && evt.content) {
      full += evt.content;
      handlers.onToken(evt.content);
    } else if (evt.type === "related_images" && Array.isArray(evt.images)) {
      handlers.onImages(evt.images);
    } else if (evt.type === "math_lesson" && evt.lesson) {
      handlers.onMathLesson?.(evt.lesson, evt.clean_answer ?? full);
    } else if (evt.type === "science_experiment" && evt.experiment) {
      handlers.onScienceExperiment?.(evt.experiment, evt.clean_answer ?? full);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      parseLine(line.trim());
    }
  }
  if (buffer.trim()) {
    parseLine(buffer.trim());
  }

  return full;
}

export default function AITutorPage() {
  const { user, token } = useAuthStore();
  const [, setLocation] = useLocation();
  const chapterCtx = useChapterContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatVoicePlayerRef = useRef<Mp3StreamPlayer | null>(null);
  const chatVoiceAbortRef = useRef<AbortController | null>(null);
  const lastVoicedMessageId = useRef<string | null>(null);
  const lastVoiceUrl = useRef<string | null>(null);
  const startGreetingHandledRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom(isStreaming ? "auto" : "smooth");
  }, [activeConversation?.messages, isStreaming, scrollToBottom]);

  // Welcome message when arriving from Learning Studio → Start Learning
  useEffect(() => {
    if (!chapterCtx || startGreetingHandledRef.current || !hasGreetSearchParam()) return;
    startGreetingHandledRef.current = true;
    stripGreetSearchParam();

    const greeting = buildStartLearningGreeting({
      fullName: user?.fullName,
      subject: chapterCtx.subject,
      chapterNames: chapterCtx.chapterNames,
    });
    const conv: Conversation = {
      id: `welcome-${Date.now()}`,
      title: chapterCtx.subject,
      messages: [
        {
          id: `welcome-msg-${Date.now()}`,
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation(conv);
  }, [chapterCtx, user?.fullName]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversation(newConversation);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (file: File) => {
    console.log("handleFileUpload called with file:", file.name, file.type, file.size);
    
    if (file.type !== "application/pdf") {
      setUploadError(MSG.uploadPdfOnly);
      return;
    }

    if (!API_URL) {
      setUploadError(MSG.configUnavailable);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      console.log("Uploading file to:", `${API_URL}/upload`);
      await uploadPDF(file);
      console.log("Upload successful");
      setUploadedFile(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(studentFriendlyError(error, MSG.uploadFailed));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.type);
      handleFileUpload(file);
    } else {
      console.log("No file selected");
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    let conversation = activeConversation;
    if (!conversation) {
      conversation = {
        id: Date.now().toString(),
        title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
        messages: [],
      };
      setConversations((prev) => [conversation!, ...prev]);
      setActiveConversation(conversation);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage],
    };

    setActiveConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversation!.id ? updatedConversation : c))
    );
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setIsStreaming(true);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    const conversationWithAssistant = {
      ...updatedConversation,
      messages: [...updatedConversation.messages, assistantMessage],
    };
    setActiveConversation(conversationWithAssistant);

    try {
      let fullContent = "";
      let relatedImages: RelatedTextbookImage[] = [];
      let mathLesson: MathLesson | null = null;
      let scienceExperiment: ScienceExperiment | null = null;

      const patchAssistant = (
        content: string,
        images?: RelatedTextbookImage[],
        lesson?: MathLesson | null,
        experiment?: ScienceExperiment | null,
      ) => {
        setActiveConversation((prev) => {
          if (!prev) return prev;
          const messages = [...prev.messages];
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = {
            ...last,
            content,
            relatedImages: images ?? last.relatedImages,
            mathLesson: lesson !== undefined ? lesson : last.mathLesson,
            scienceExperiment: experiment !== undefined ? experiment : last.scienceExperiment,
          };
          return { ...prev, messages };
        });
      };

      if (chapterCtx) {
        const history = buildConversationHistory(
          updatedConversation.messages.filter((m) => m.id !== assistantMessage.id),
        );
        fullContent = await streamChapterChatMessage(
          content,
          chapterCtx,
          {
            onToken: (chunk) => {
              fullContent += chunk;
              patchAssistant(fullContent);
            },
            onImages: (images) => {
              relatedImages = images;
              patchAssistant(fullContent, images);
            },
            onMathLesson: (lesson, cleanAnswer) => {
              mathLesson = lesson;
              fullContent = cleanAnswer;
              patchAssistant(cleanAnswer, relatedImages, lesson, scienceExperiment);
            },
            onScienceExperiment: (experiment, cleanAnswer) => {
              scienceExperiment = experiment;
              fullContent = cleanAnswer;
              patchAssistant(cleanAnswer, relatedImages, mathLesson, experiment);
            },
          },
          history,
        );
        if (relatedImages.length === 0 && fullContent.trim()) {
          try {
            const fallback = await sendChapterChatMessage(content, chapterCtx, history);
            if (fallback.relatedImages.length > 0 || fallback.mathLesson || fallback.scienceExperiment) {
              relatedImages = fallback.relatedImages;
              fullContent = fallback.answer || fullContent;
              mathLesson = fallback.mathLesson ?? mathLesson;
              scienceExperiment = fallback.scienceExperiment ?? scienceExperiment;
              patchAssistant(fullContent, relatedImages, mathLesson, scienceExperiment);
            }
          } catch {
            /* stream answer is still shown */
          }
        }
      } else if (API_URL) {
        fullContent = await sendChatMessage(content);
        patchAssistant(fullContent);
      } else {
        fullContent = `That's a great question! Let me explain this concept step by step.\n\nBased on your question about "${content.slice(0, 50)}...", here's a detailed explanation:\n\nThis topic involves several key concepts that work together. First, let's understand the fundamental principles. Then we can explore how these principles apply in different scenarios.\n\nKey points to remember:\n• Understanding the basics is crucial\n• Practice helps reinforce learning\n• Real-world applications make concepts clearer\n\nWould you like me to elaborate on any specific aspect of this topic?`;
        const words = fullContent.split(" ");
        for (let i = 0; i < words.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          const partial = words.slice(0, i + 1).join(" ");
          patchAssistant(partial);
        }
        fullContent = words.join(" ");
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation!.id) {
            const messages = [...conversationWithAssistant.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content: fullContent,
              relatedImages,
              mathLesson,
              scienceExperiment,
            };
            return { ...c, messages };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("Chat error:", error);
      setActiveConversation((prev) => {
        if (!prev) return prev;
        const messages = [...prev.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: MSG.tutorError,
        };
        return { ...prev, messages };
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  };

  const stopChatVoicePlayback = () => {
    chatVoiceAbortRef.current?.abort();
    chatVoiceAbortRef.current = null;
    chatVoicePlayerRef.current?.stop();
    chatVoicePlayerRef.current = null;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    setIsVoicePlaying(false);
    setIsVoiceLoading(false);
  };

  const bindVoiceElement = (el: HTMLAudioElement) => {
    el.onplay = () => {
      setIsVoiceLoading(false);
      setIsVoicePlaying(true);
    };
    el.onended = () => {
      setIsVoicePlaying(false);
      audioRef.current = null;
    };
  };

  // Stream MP3 from /chat-voice; optionally play while buffering for cache replay.
  const fetchVoiceForMessage = async (message: Message, opts?: { play?: boolean }) => {
    if (!message.content.trim()) return;
    if (!VOICE_URL) {
      setVoiceError(MSG.voiceUnavailable);
      return;
    }

    stopChatVoicePlayback();
    const controller = new AbortController();
    chatVoiceAbortRef.current = controller;
    const t0 = performance.now();

    try {
      setIsVoiceLoading(true);
      setVoiceError(null);

      const response = await fetch(`${VOICE_URL}/chat-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.content }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(studentFriendlyApiError(errorText, response.status, MSG.voiceError));
      }
      if (!response.body) {
        throw new Error(MSG.streamFailed);
      }

      const shouldPlay = Boolean(opts?.play);
      let player: Mp3StreamPlayer | null = null;
      if (shouldPlay) {
        player = new Mp3StreamPlayer();
        player.resetTurnClock();
        chatVoicePlayerRef.current = player;
        await player.ready();
        audioRef.current = player.element;
        bindVoiceElement(player.element);
      }

      const chunks: Uint8Array[] = [];
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;
        chunks.push(value);
        if (shouldPlay && player) {
          const ab = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
          player.enqueue(ab);
        }
      }

      if (controller.signal.aborted) return;

      console.debug(
        "[chat-voice] stream complete",
        `${(performance.now() - t0).toFixed(0)}ms`,
        `chunks=${chunks.length}`,
      );

      const blob = new Blob(chunks, { type: "audio/mpeg" });
      if (lastVoiceUrl.current) {
        URL.revokeObjectURL(lastVoiceUrl.current);
      }
      lastVoiceUrl.current = URL.createObjectURL(blob);
      lastVoicedMessageId.current = message.id;

      if (!shouldPlay) {
        setIsVoiceLoading(false);
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error("Voice error:", error);
      setVoiceError(studentFriendlyError(error, MSG.voiceError));
      setIsVoiceLoading(false);
    } finally {
      if (chatVoiceAbortRef.current === controller) {
        chatVoiceAbortRef.current = null;
      }
    }
  };

  const handleVoiceButtonClick = () => {
    if (isVoicePlaying) {
      stopChatVoicePlayback();
      return;
    }
    void handlePlayLastAssistantMessage();
  };

  const handlePlayLastAssistantMessage = async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    const lastAssistantMessage = [...activeConversation.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content.trim().length > 0);

    if (!lastAssistantMessage) return;

    // If we already have cached audio for this message, just play it
    if (
      lastVoicedMessageId.current === lastAssistantMessage.id &&
      lastVoiceUrl.current
    ) {
      try {
        setIsVoiceLoading(true);
        setVoiceError(null);

        stopChatVoicePlayback();

        const audio = new Audio(lastVoiceUrl.current);
        audioRef.current = audio;
        bindVoiceElement(audio);
        await audio.play();
        return;
      } catch (error) {
        console.error("Voice play error:", error);
        setVoiceError(studentFriendlyError(error, MSG.voiceError));
        setIsVoiceLoading(false);
        // fall through to refetch below
      }
    }

    // Otherwise fetch (and play) now as a fallback
    await fetchVoiceForMessage(lastAssistantMessage, { play: true });
  };

  // Auto-fetch voice for new assistant messages after streaming finishes (no auto play)
  useEffect(() => {
    if (!activeConversation || isStreaming) {
      return;
    }

    const lastAssistantMessage = [...activeConversation.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content.trim().length > 0);

    if (!lastAssistantMessage) {
      return;
    }

    if (lastAssistantMessage.id === lastVoicedMessageId.current) {
      return;
    }

    lastVoicedMessageId.current = lastAssistantMessage.id;
    // Fire and forget; errors are handled inside.
    // This will call the voice API and cache the audio, but NOT play it.
    void fetchVoiceForMessage(lastAssistantMessage, { play: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.messages, isStreaming]);

  const primaryChapterName =
    chapterCtx?.chapterNames[0] ||
    (chapterCtx?.chapterIds.length ? `Chapter ${chapterCtx.chapterIds.length}` : "Chapter");

  const formatClassLabel = (classLevel: string) =>
    classLevel.replace("CLASS_", "Class ");

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Chat header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {chapterCtx && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setLocation(chapterSelectionPath(chapterCtx.subjectId))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            {chapterCtx ? (
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                <span>{chapterCtx.subject}</span>
                <ChevronRight className="mx-1 inline h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{primaryChapterName}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-foreground sm:text-base">AI Tutor</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {chapterCtx && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-muted-foreground sm:text-sm">
                {chapterCtx.subject} {chapterCtx.board} · {formatClassLabel(chapterCtx.classLevel)}
              </span>
              <Badge variant="secondary" className="max-w-[140px] truncate text-xs font-medium">
                {primaryChapterName}
              </Badge>
            </div>
          )}

          <Button
            className="h-8 shrink-0 gap-1.5 bg-gradient-brand px-3 sm:h-9 sm:px-4"
            onClick={createNewConversation}
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">New Chat</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Chat history"
                data-testid="button-chat-history"
              >
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Chat History</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conversations.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <DropdownMenuItem
                    key={conv.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2",
                      activeConversation?.id === conv.id && "bg-primary/10 text-primary"
                    )}
                    onClick={() => selectConversation(conv)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="rounded p-1 hover:bg-destructive/10"
                      aria-label={`Delete conversation: ${conv.title}`}
                      data-testid={`button-delete-conversation-${conv.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-xl w-full text-center space-y-4 sm:space-y-6">
              <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">
                  {chapterCtx ? `${chapterCtx.subject} Tutor` : "AI Virtual Tutor"}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {chapterCtx
                    ? buildStartLearningGreeting({
                        fullName: user?.fullName,
                        subject: chapterCtx.subject,
                        chapterNames: chapterCtx.chapterNames,
                      })
                    : `Hello${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! I'm your AI tutor. Ask me anything about your studies.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Powered by advanced AI</span>
              </div>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                {(chapterCtx
                  ? chapterCtx.chapterNames.slice(0, 4).map((name) => `Explain the key concepts in ${name}`)
                  : suggestedTopics
                ).map((topic, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto p-3 sm:p-4 text-left justify-start hover-elevate text-sm"
                    onClick={() => sendMessage(topic)}
                    data-testid={`suggested-topic-${i}`}
                  >
                    <span className="line-clamp-2">{topic}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-3 sm:p-4">
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 sm:px-4 sm:py-3 min-w-0",
                      message.role === "user"
                        ? "max-w-[85%] sm:max-w-[80%] bg-primary text-primary-foreground"
                        : cn(
                            "border border-primary/25 bg-[hsl(var(--ai-purple-light))] text-foreground shadow-sm",
                            (message.relatedImages?.length ?? 0) > 0 || message.mathLesson
                              ? "max-w-[92%] sm:max-w-[min(92%,40rem)] w-full"
                              : "max-w-[85%] sm:max-w-[80%]",
                          ),
                    )}
                    data-testid={`message-${message.id}`}
                  >
                    {message.role === "assistant" ? (
                      <AssistantMessageContent
                        content={message.content}
                        relatedImages={message.relatedImages}
                        mathLesson={message.mathLesson}
                        scienceExperiment={message.scienceExperiment}
                        token={token}
                        isStreaming={
                          isStreaming &&
                          message.id ===
                            activeConversation.messages[activeConversation.messages.length - 1].id
                        }
                        imagesRetrieving={
                          Boolean(
                            chapterCtx &&
                              isStreaming &&
                              message.id ===
                                activeConversation.messages[activeConversation.messages.length - 1]
                                  .id &&
                              (message.relatedImages?.length ?? 0) === 0,
                          )
                        }
                        imagesRetrievingHint={
                          chapterCtx?.chapterNames?.[0]
                            ? `Looking up figures from ${chapterCtx.chapterNames[0]}…`
                            : undefined
                        }
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                        {user?.fullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {activeConversation.messages.length > 0 &&
                activeConversation.messages[activeConversation.messages.length - 1].role ===
                  "assistant" &&
                !isStreaming && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 ml-9 sm:ml-11">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-8 text-xs"
                        onClick={handleVoiceButtonClick}
                        disabled={isVoiceLoading && !isVoicePlaying}
                        title={
                          isVoicePlaying
                            ? "Stop audio"
                            : isVoiceLoading
                              ? "Loading audio…"
                              : "Play last answer as audio"
                        }
                        data-testid="button-play-voice"
                      >
                        {isVoicePlaying ? (
                          <Square className="h-3 w-3 fill-current" />
                        ) : isVoiceLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </Button>
                      {quickActions.map((action, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-7 sm:h-8 text-xs"
                          onClick={() => handleQuickAction(action.prompt)}
                          disabled={isLoading}
                          data-testid={`quick-action-${i}`}
                        >
                          <action.icon className="mr-1 h-3 w-3" />
                          <span className="hidden xs:inline">{action.label}</span>
                          <span className="xs:hidden">{action.label.split(" ")[0]}</span>
                        </Button>
                      ))}
                    </div>
                    {voiceError && (
                      <div className="ml-9 sm:ml-11 mt-1 text-xs text-destructive">
                        {voiceError}
                      </div>
                    )}
                  </>
                )}
            </div>
            <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
          </ScrollArea>
        )}

        <div className="border-t bg-background p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="max-w-3xl mx-auto space-y-2"
          >
            {/* Uploaded file display */}
            {uploadedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeUploadedFile}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Upload error display */}
            {uploadError && (
              <div className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">
                {uploadError}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isUploading || isLoading}
                className="flex-shrink-0"
                title={API_URL ? "Upload PDF" : "Upload isn't available right now"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Upload button clicked, API_URL:", API_URL);
                  console.log("File input ref:", fileInputRef.current);
                  if (fileInputRef.current && !isUploading && !isLoading) {
                    fileInputRef.current.click();
                  } else {
                    console.log("Cannot trigger file input - disabled or ref not available");
                  }
                }}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading) {
                      sendMessage(input);
                    }
                  }
                }}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className="flex-1 min-h-[44px] max-h-32 resize-none py-2.5 text-base leading-relaxed"
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0"
                data-testid="button-send-message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
