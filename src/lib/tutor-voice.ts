/** Edge TTS Indian English voices for the AI Voice tutor. */

export type TutorVoiceGender = "female" | "male";

export const TUTOR_VOICE_FEMALE = "en-IN-NeerjaNeural";
export const TUTOR_VOICE_MALE = "en-IN-PrabhatNeural";

const STORAGE_KEY = "ai-voice-tts-gender";

export function tutorVoiceId(gender: TutorVoiceGender): string {
  return gender === "male" ? TUTOR_VOICE_MALE : TUTOR_VOICE_FEMALE;
}

export function loadTutorVoiceGender(): TutorVoiceGender {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "male" || v === "female") return v;
  } catch {
    /* private mode */
  }
  return "female";
}

export function saveTutorVoiceGender(gender: TutorVoiceGender): void {
  try {
    localStorage.setItem(STORAGE_KEY, gender);
  } catch {
    /* private mode */
  }
}
