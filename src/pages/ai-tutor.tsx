import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  FileText,
  Languages,
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
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  { label: "Translate", icon: Languages, prompt: "Can you translate this to a different language?" },
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
    throw new Error("API_URL is not configured");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }
};

// Send chat message
const sendChatMessage = async (query: string): Promise<string> => {
  if (!API_URL) {
    throw new Error("API_URL is not configured");
  }

  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat failed: ${errorText}`);
  }

  const data = await response.json();
  return data.answer || "";
};

export default function AITutorPage() {
  const { user } = useAuthStore();
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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVoicedMessageId = useRef<string | null>(null);
  const lastVoiceUrl = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

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

    if (!API_URL) {
      setUploadError("API_URL is not configured. Please set VITE_API_URL in your .env file and restart the dev server.");
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
      let response: string;
      
      // Use real API if API_URL is configured, otherwise use mock response
      if (API_URL) {
        response = await sendChatMessage(content);
      } else {
        // Fallback to mock response if API_URL is not configured
        response = `That's a great question! Let me explain this concept step by step.\n\nBased on your question about "${content.slice(0, 50)}...", here's a detailed explanation:\n\nThis topic involves several key concepts that work together. First, let's understand the fundamental principles. Then we can explore how these principles apply in different scenarios.\n\nKey points to remember:\n• Understanding the basics is crucial\n• Practice helps reinforce learning\n• Real-world applications make concepts clearer\n\nWould you like me to elaborate on any specific aspect of this topic?`;
      }
      
      // Simulate streaming effect
      let fullContent = "";
      const words = response.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20)); // Small delay for visual effect
        fullContent += words[i] + (i < words.length - 1 ? " " : "");
        setActiveConversation((prev) => {
          if (!prev) return prev;
          const messages = [...prev.messages];
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content: fullContent,
          };
          return { ...prev, messages };
        });
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation!.id) {
            const messages = [...conversationWithAssistant.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content: fullContent,
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

  // Fetch audio for a message and cache URL (optionally play)
  const fetchVoiceForMessage = async (message: Message, opts?: { play?: boolean }) => {
    if (!message.content.trim()) return;
    if (!VOICE_URL) {
      setVoiceError("VOICE_URL (or VITE_API_URL) is not configured. Please update your .env and restart the dev server.");
      return;
    }

    try {
      setIsVoiceLoading(true);
      setVoiceError(null);

      const response = await fetch(`${VOICE_URL}/chat-voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Voice request failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Revoke previous URL if any
      if (lastVoiceUrl.current) {
        URL.revokeObjectURL(lastVoiceUrl.current);
      }
      lastVoiceUrl.current = url;
      lastVoicedMessageId.current = message.id;

      if (opts?.play) {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsVoiceLoading(false);
        };
        await audio.play();
      } else {
        setIsVoiceLoading(false);
      }
    } catch (error) {
      console.error("Voice error:", error);
      setVoiceError(
        error instanceof Error
          ? `Unable to fetch audio: ${error.message}`
          : "Unable to fetch audio. Please try again."
      );
      setIsVoiceLoading(false);
    }
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

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audio = new Audio(lastVoiceUrl.current);
        audioRef.current = audio;
        audio.onended = () => {
          setIsVoiceLoading(false);
        };
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

        {!activeConversation || activeConversation.messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-xl w-full text-center space-y-4 sm:space-y-6">
              <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">AI Virtual Tutor</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Hello{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! I'm your AI
                  tutor. Ask me anything about your studies.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Powered by advanced AI</span>
              </div>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                {suggestedTopics.map((topic, i) => (
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
                      "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-[hsl(var(--ai-purple-light))] text-foreground"
                    )}
                    data-testid={`message-${message.id}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                      {isStreaming &&
                        message.role === "assistant" &&
                        message.id ===
                          activeConversation.messages[activeConversation.messages.length - 1]
                            .id && (
                          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                        )}
                    </p>
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
                        onClick={handlePlayLastAssistantMessage}
                        disabled={isVoiceLoading}
                        title="Play last answer as audio"
                        data-testid="button-play-voice"
                      >
                        {isVoiceLoading ? (
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
                title={API_URL ? "Upload PDF" : "API_URL not configured - upload will fail"}
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
