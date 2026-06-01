import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataState({ loading, error, empty, emptyText, onRetry, children }: DataStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return <>{children}</>;
}
