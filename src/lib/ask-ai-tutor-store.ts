import { create } from "zustand";

export type AskAiTutorMode = "free" | "ask" | "practice" | "explain";

interface AskAiTutorState {
  open: boolean;
  mode: AskAiTutorMode;
  openAskAiTutor: (mode?: AskAiTutorMode) => void;
  closeAskAiTutor: () => void;
  setAskAiTutorOpen: (open: boolean) => void;
}

export const useAskAiTutorStore = create<AskAiTutorState>((set) => ({
  open: false,
  mode: "free",
  openAskAiTutor: (mode = "free") => set({ open: true, mode }),
  closeAskAiTutor: () => set({ open: false }),
  setAskAiTutorOpen: (open) => set({ open, ...(open ? {} : { mode: "free" }) }),
}));
