/** Status-only STT placeholders must never enter the typed text field. */
const STATUS_INTERIM = /^listening[.…]*$/i;

export function liveSpeechInterim(interim: string): string {
  const t = interim.trim();
  return !t || STATUS_INTERIM.test(t) ? "" : t;
}

export function combineVoiceTextField(textInput: string, interim: string): string {
  const typed = textInput.trim();
  const live = liveSpeechInterim(interim);
  if (typed && live) return `${typed} ${live}`;
  return typed || live;
}
