import { cn } from "@/lib/utils";

interface AuthBrandMarkProps {
  variant?: "auth" | "sidebar";
  className?: string;
}

export function AuthBrandMark({ variant = "auth", className }: AuthBrandMarkProps) {
  const isSidebar = variant === "sidebar";

  return (
    <div className={cn("flex items-center gap-4", isSidebar && "gap-3", className)}>
      <img
        src="/logo.png"
        alt="AI Tutor"
        className={cn(
          "object-contain",
          isSidebar ? "h-12 w-12" : "h-14 w-14 xl:h-16 xl:w-16"
        )}
      />
      <div className="flex min-w-0 flex-col">
        <p
          className={cn(
            "font-bold leading-tight",
            isSidebar
              ? "truncate text-xl text-foreground"
              : "text-2xl text-[#2d2060] dark:text-foreground xl:text-3xl"
          )}
        >
          AI Tutor
        </p>
        <p
          className={cn(
            "font-medium leading-tight",
            isSidebar
              ? "truncate text-sm text-muted-foreground"
              : "text-base text-[#5c4d8a] dark:text-muted-foreground xl:text-lg"
          )}
        >
          Smart Learning
        </p>
      </div>
    </div>
  );
}
