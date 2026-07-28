import { useEffect } from "react";
import { Redirect, useRoute } from "wouter";
import { useAskAiTutorStore, type AskAiTutorMode } from "@/lib/ask-ai-tutor-store";

function modeFromPath(path: string | undefined): AskAiTutorMode {
  if (path === "practice") return "practice";
  if (path === "explain") return "explain";
  if (path === "ask") return "ask";
  return "ask";
}

/** Deep links /ai-tutor/ask|practice|explain open the Quick Start popup (no subject picker). */
export default function AiTutorAgentPage() {
  const [match, params] = useRoute<{ mode: string }>("/ai-tutor/:mode");
  const openAskAiTutor = useAskAiTutorStore((s) => s.openAskAiTutor);
  const mode = modeFromPath(match ? params?.mode : "ask");

  useEffect(() => {
    openAskAiTutor(mode);
  }, [mode, openAskAiTutor]);

  return <Redirect to="/ai-learning-studio" />;
}
