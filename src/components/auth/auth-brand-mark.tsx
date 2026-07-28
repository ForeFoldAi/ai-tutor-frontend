import { cn } from "@/lib/utils";

interface AuthBrandMarkProps {
  variant?: "auth" | "sidebar";
  size?: "default" | "signup" | "compact";
  className?: string;
  logoBackground?: boolean;
}

export function AuthBrandMark({
  variant = "auth",
  size = "default",
  className,
  logoBackground = false,
}: AuthBrandMarkProps) {
  const isSidebar = variant === "sidebar";
  const isSignup = size === "signup";
  const isCompact = size === "compact";

  const logo = (
    <img
      src="/logo.png"
      alt="AI Tutor"
      className={cn(
        "object-contain",
        isCompact
          ? "h-7 w-7"
          : isSignup
            ? "h-11 w-11 xl:h-12 xl:w-12"
            : logoBackground
              ? "h-8 w-8"
              : isSidebar
                ? "h-12 w-12"
                : "h-14 w-14 xl:h-16 xl:w-16",
      )}
    />
  );

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        (isSidebar || isSignup) && "gap-3",
        isCompact && "gap-2",
        className,
      )}
    >
      {logoBackground || isSignup ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm",
            isSignup ? "h-16 w-16 xl:h-[4.5rem] xl:w-[4.5rem]" : "h-12 w-12"
          )}
        >
          {logo}
        </span>
      ) : (
        logo
      )}
      <div className={cn("flex min-w-0 flex-col", isCompact && "hidden min-[400px]:flex")}>
        <p
          className={cn(
            "font-bold leading-tight",
            isCompact
              ? "truncate text-sm text-foreground"
              : isSignup
                ? "text-2xl text-[#2d2060] dark:text-foreground xl:text-[1.75rem]"
                : isSidebar
                  ? "truncate text-xl text-foreground"
                  : "text-2xl text-[#2d2060] dark:text-foreground xl:text-3xl"
          )}
        >
          AI Tutor
        </p>
        {!isCompact ? (
          <p
            className={cn(
              "font-medium leading-tight",
              isSignup
                ? "text-base text-[#5c4d8a] dark:text-muted-foreground xl:text-lg"
                : isSidebar
                  ? "truncate text-sm text-muted-foreground"
                  : "text-base text-[#5c4d8a] dark:text-muted-foreground xl:text-lg"
            )}
          >
            Smart Learning
          </p>
        ) : null}
      </div>
    </div>
  );
}
