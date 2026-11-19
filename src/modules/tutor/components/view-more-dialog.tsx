import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ViewMoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ViewMoreDialog({
  open,
  onOpenChange,
  title,
  description,
  contentClassName,
  children,
}: ViewMoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg",
          contentClassName,
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-blue-900 dark:text-blue-100">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-w-0 space-y-3 overflow-x-hidden">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function CardViewMoreButton({
  onClick,
  label = "View more",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 text-sm font-medium text-primary hover:underline"
    >
      {label}
    </button>
  );
}
