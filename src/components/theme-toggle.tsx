import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  buttonClassName?: string;
}

export function ThemeToggle({ className, buttonClassName }: ThemeToggleProps = {}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "relative h-9 w-9 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50 sm:h-10 sm:w-10",
        buttonClassName,
        className
      )}
      onClick={toggleTheme}
      aria-label="Toggle light or dark mode"
      data-testid="button-theme-toggle"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Sun className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

