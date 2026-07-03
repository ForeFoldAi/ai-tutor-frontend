import { useEffect, useState } from "react";

/** Brief initial loading state for pages that render static or cached content. */
export function useInitialLoading(durationMs = 650) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return loading;
}
