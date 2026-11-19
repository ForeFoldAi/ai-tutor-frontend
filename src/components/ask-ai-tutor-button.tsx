import { Button } from "@/components/ui/button";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import { useAskAiTutorStore } from "@/lib/ask-ai-tutor-store";
import { cn } from "@/lib/utils";

interface AskAiTutorButtonProps {
  className?: string;
  labelClassName?: string;
  children?: React.ReactNode;
}

/** Opens Ask AI Tutor as a popup (does not navigate away). */
export function AskAiTutorButton({
  className,
  labelClassName,
  children,
}: AskAiTutorButtonProps) {
  const openAskAiTutor = useAskAiTutorStore((s) => s.openAskAiTutor);

  return (
    <Button
      type="button"
      className={cn("h-9 gap-2 bg-gradient-brand px-3 sm:px-4", className)}
      onClick={() => openAskAiTutor()}
    >
      <AiTutorButtonIcon />
      {children ?? <span className={cn("whitespace-nowrap", labelClassName)}>Ask Learn Mastro</span>}
    </Button>
  );
}
