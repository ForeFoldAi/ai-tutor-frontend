import { useEffect } from "react";
import { Redirect } from "wouter";
import { useAskAiTutorStore } from "@/lib/ask-ai-tutor-store";

/** Deep-link / bookmark: open the Ask AI Tutor popup, then land on dashboard. */
export default function AskAiTutorPage() {
  const openAskAiTutor = useAskAiTutorStore((s) => s.openAskAiTutor);

  useEffect(() => {
    openAskAiTutor();
  }, [openAskAiTutor]);

  return <Redirect to="/dashboard" />;
}
