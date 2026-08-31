import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VoiceButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className="h-28 w-28 rounded-full text-base shadow-lg bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white border-0"
    >
      <span className="flex flex-col items-center gap-1">
        <Mic className="h-8 w-8" />
        {label}
      </span>
    </Button>
  );
}
