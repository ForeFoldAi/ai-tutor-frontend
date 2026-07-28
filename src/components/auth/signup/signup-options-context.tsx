import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { invalidateSignupOptionsCache, fetchSignupOptions } from "@/api/signup";
import type { SignupOptions } from "@/api/types";

type SignupOptionsState = {
  options: SignupOptions | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const SignupOptionsContext = createContext<SignupOptionsState | null>(null);

export function SignupOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    invalidateSignupOptionsCache();
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSignupOptions()
      .then((data) => {
        if (!cancelled) {
          setOptions(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOptions(null);
          setError(err instanceof Error ? err.message : "Could not load form options.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <SignupOptionsContext.Provider value={{ options, loading, error, retry }}>
      {children}
    </SignupOptionsContext.Provider>
  );
}

export function useSignupOptions() {
  const ctx = useContext(SignupOptionsContext);
  if (!ctx) {
    throw new Error("useSignupOptions must be used within SignupOptionsProvider");
  }
  return ctx;
}
