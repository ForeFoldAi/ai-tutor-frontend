import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionRowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function SessionRowActions({ onEdit, onDelete, disabled }: SessionRowActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={disabled}
        onClick={onEdit}
        aria-label="Edit session"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        disabled={disabled}
        onClick={onDelete}
        aria-label="Delete session"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
