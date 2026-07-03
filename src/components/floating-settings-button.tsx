import { Link, useLocation } from "wouter";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingSettingsButton() {
  const [location] = useLocation();
  const onSettingsPage = location === "/settings";

  return (
    <Button
      asChild
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border-0 bg-gradient-brand text-white shadow-lg hover:brightness-110"
      data-testid="button-floating-settings"
    >
      {onSettingsPage ? (
        <Link href="/dashboard" aria-label="Close settings">
          <X className="h-5 w-5 text-white" />
        </Link>
      ) : (
        <Link href="/settings" aria-label="Open settings">
          <Settings className="h-5 w-5 text-white" />
        </Link>
      )}
    </Button>
  );
}
