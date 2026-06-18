import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Menu,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Square,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import {
  mockChatVoiceStream,
  mockSendChapterChatMessage,
  mockSendChatMessage,
  mockStreamChapterChatMessage,
  mockUploadPdf,
} from "@/mock-data";
import {
  AssistantMessageContent,
  type RelatedTextbookImage,
} from "@/components/assistant-message-content";
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

// Upload PDF file (mock)
const uploadPDF = async (file: File): Promise<void> => {
  await mockUploadPdf(file);
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
  return mockSendChatMessage(query);
};

const sendChapterChatMessage = async (
  query: string,
  ctx: ChapterContext,
  _conversationHistory?: Array<{ role: string; content: string }>,
): Promise<{ answer: string; relatedImages: RelatedTextbookImage[] }> => {
  return mockSendChapterChatMessage(query, { subject: ctx.subject });
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
  },
  _conversationHistory?: Array<{ role: string; content: string }>,
): Promise<string> {
  return mockStreamChapterChatMessage(query, { subject: ctx.subject }, handlers);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatVoicePlayerRef = useRef<Mp3StreamPlayer | null>(null);
  const chatVoiceAbortRef = useRef<AbortController | null>(null);
  const lastVoicedMessageId = useRef<string | null>(null);
  const lastVoiceUrl = useRef<string | null>(null);
  const startGreetingHandledRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

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
    setMobileMenuOpen(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (file: File) => {
    console.log("handleFileUpload called with file:", file.name, file.type, file.size);
    
    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadPDF(file);
      setUploadedFile(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload PDF");
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
    setIsLoading(true);
    setIsStreaming(true);

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

      const patchAssistant = (content: string, images?: RelatedTextbookImage[]) => {
        setActiveConversation((prev) => {
          if (!prev) return prev;
          const messages = [...prev.messages];
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = {
            ...last,
            content,
            relatedImages: images ?? last.relatedImages,
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
          },
          history,
        );
        if (relatedImages.length === 0 && fullContent.trim()) {
          try {
            const fallback = await sendChapterChatMessage(content, chapterCtx, history);
            if (fallback.relatedImages.length > 0) {
              relatedImages = fallback.relatedImages;
              fullContent = fallback.answer || fullContent;
              patchAssistant(fullContent, relatedImages);
            }
          } catch {
            /* stream answer is still shown */
          }
        }
      } else {
        fullContent = await sendChatMessage(content);
        patchAssistant(fullContent);
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation!.id) {
            const messages = [...conversationWithAssistant.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content: fullContent,
              relatedImages,
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
          content: error instanceof Error 
            ? `I apologize, but I encountered an error: ${error.message}. Please try again.`
            : "I apologize, but I encountered an error. Please try again.",
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

    stopChatVoicePlayback();
    const controller = new AbortController();
    chatVoiceAbortRef.current = controller;
    const t0 = performance.now();

    try {
      setIsVoiceLoading(true);
      setVoiceError(null);

      const body = await mockChatVoiceStream(message.content);
      if (!body) {
        throw new Error("Voice response has no stream body");
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
      const reader = body.getReader();

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
      setVoiceError(
        error instanceof Error
          ? `Unable to fetch audio: ${error.message}`
          : "Unable to fetch audio. Please try again.",
      );
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
        setVoiceError(
          error instanceof Error
            ? `Unable to play audio: ${error.message}`
            : "Unable to play audio. Please try again."
        );
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

  const ConversationList = ({ 
    testIdSuffix = "",
    showToggle = false,
    onToggle,
    isOpen,
  }: { 
    testIdSuffix?: string;
    showToggle?: boolean;
    onToggle?: () => void;
    isOpen?: boolean;
  }) => (
    <>
      <div className="p-3 sm:p-4 border-b">
        <div className="flex gap-2">
          <Button
            onClick={createNewConversation}
            className="flex-1"
            data-testid={`button-new-chat${testIdSuffix}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          {showToggle && onToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              title={isOpen ? "Close sidebar" : "Open sidebar"}
              className="flex-shrink-0"
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover-elevate transition-colors",
                activeConversation?.id === conv.id && "bg-primary/10 text-primary"
              )}
              onClick={() => {
                setActiveConversation(conv);
                setMobileMenuOpen(false);
              }}
              data-testid={`conversation-${conv.id}`}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover-elevate rounded transition-opacity"
                data-testid={`button-delete-conversation-${conv.id}`}
                aria-label={`Delete conversation: ${conv.title}`}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No conversations yet
            </p>
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] relative">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "border-r bg-muted/30 flex-col hidden md:flex transition-all duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        {sidebarOpen && (
          <ConversationList 
            testIdSuffix="-desktop" 
            showToggle={true}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isOpen={sidebarOpen}
          />
        )}
      </div>

      {/* Toggle Button when sidebar is closed */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute left-0 top-4 z-20 h-8 w-8 rounded-r-md rounded-l-none border-r border-t border-b bg-background shadow-sm hover:bg-muted"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      <div className="flex-1 flex flex-col">
        <div className="md:hidden border-b p-2 flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Chat History
                </SheetTitle>
              </SheetHeader>
              <ConversationList testIdSuffix="-mobile" />
            </SheetContent>
          </Sheet>
          <span className="font-medium text-sm">
            {activeConversation?.title || "AI Tutor"}
          </span>
        </div>

        {/* Chapter context banner */}
        {chapterCtx && (
          <div className="border-b bg-primary/5 px-4 py-2.5 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setLocation(chapterSelectionPath(chapterCtx.subjectId))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {chapterCtx.subject}
                <span className="text-muted-foreground font-normal ml-2">
                  {chapterCtx.board} &middot; {chapterCtx.classLevel.replace("CLASS_", "Class ")}
                </span>
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {chapterCtx.chapterNames.map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-0">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

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
          <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
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
                            (message.relatedImages?.length ?? 0) > 0
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

            <div className="flex gap-2">
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
                title="Upload PDF"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 text-base"
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
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
