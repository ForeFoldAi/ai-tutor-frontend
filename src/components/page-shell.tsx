import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellSize = "standard" | "wide" | "full";

interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  contentClassName?: string;
  size?: PageShellSize;
}

const maxWidthBySize: Record<PageShellSize, string> = {
  standard: "max-w-content-standard",
  wide: "max-w-content-wide",
  full: "max-w-none",
};

export function PageShell({
  children,
  className,
  contentClassName,
  size = "wide",
  ...props
}: PageShellProps) {
  return (
    <div className={cn("page-shell", className)} {...props}>
      <div className={cn("page-container", maxWidthBySize[size], contentClassName)}>
        {children}
      </div>
    </div>
  );
}
