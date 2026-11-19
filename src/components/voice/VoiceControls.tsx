import { Button } from "@/components/ui/button";

export function VoiceControls({
  muted,
  onMute,
  onInterrupt,
  onEnd,
  canInterrupt,
}: {
  muted: boolean;
  onMute: () => void;
  onInterrupt: () => void;
  onEnd: () => void;
  canInterrupt: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" onClick={onMute}>
        {muted ? "Unmute" : "Mute"}
      </Button>
      <Button type="button" variant="secondary" onClick={onInterrupt} disabled={!canInterrupt}>
        Interrupt
      </Button>
      <Button type="button" variant="destructive" onClick={onEnd}>
        End Session
      </Button>
    </div>
  );
}
