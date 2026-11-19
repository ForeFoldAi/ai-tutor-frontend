import { useEffect, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { resultIndex: number; results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** UI-only live caption — does not feed the voice pipeline. */
export function useSpeechCaption(enabled: boolean): string {
  const [interim, setInterim] = useState("");

  useEffect(() => {
    if (!enabled) {
      setInterim("");
      return;
    }
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0]?.transcript || "";
      }
      setInterim(text.trim());
    };
    rec.onend = () => {
      if (!enabled) return;
      try {
        rec.start();
      } catch {
        /* already running */
      }
    };
    rec.onerror = () => setInterim("");
    try {
      rec.start();
    } catch {
      /* mic busy or denied */
    }
    return () => {
      rec.onend = null;
      rec.onresult = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setInterim("");
    };
  }, [enabled]);

  return interim;
}
