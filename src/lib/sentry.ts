/** Optional Sentry bootstrap — no-op when VITE_SENTRY_DSN is unset. */

export async function initFrontendSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    // Dynamic import keeps the app bootable before `@sentry/react` is installed.
    const mod = (await import(/* @vite-ignore */ "@sentry/react")) as {
      init: (opts: Record<string, unknown>) => void;
    };
    mod.init({
      dsn,
      environment: (import.meta.env.VITE_ENVIRONMENT as string) || "production",
      release: (import.meta.env.VITE_RELEASE_SHA as string) || undefined,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.05),
      sendDefaultPii: false,
    });
  } catch {
    // Package may be absent until installed; never block app boot.
  }
}
