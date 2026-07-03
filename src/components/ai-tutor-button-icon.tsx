import { cn } from "@/lib/utils";

interface AiTutorButtonIconProps {
  className?: string;
}

export function AiTutorButtonIcon({ className }: AiTutorButtonIconProps) {
  return (
    <img
      src="/button.png"
      alt=""
      aria-hidden
      className={cn("h-7 w-7 shrink-0 object-contain", className)}
    />
  );
}
