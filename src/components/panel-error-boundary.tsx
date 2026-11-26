import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Shown instead of the crashed panel. Defaults to a short student-friendly note. */
  fallback?: ReactNode;
  /** Logged with the error so a report says which panel failed. */
  label?: string;
};

type State = { failed: boolean };

/**
 * Contains a render crash to one panel. Without it, one malformed interactive
 * lesson from the model unmounts the whole page and the student loses the chat.
 */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[panel] ${this.props.label || "panel"} crashed`, error, info.componentStack);
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    if (!dsn) return;
    void import(/* @vite-ignore */ "@sentry/react")
      .then((mod) => {
        const sentry = mod as unknown as {
          captureException?: (e: unknown, ctx?: Record<string, unknown>) => void;
        };
        sentry.captureException?.(error, { tags: { panel: this.props.label || "panel" } });
      })
      .catch(() => undefined);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div className="mt-3 rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
            This interactive part couldn't load. The explanation above is still complete.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
