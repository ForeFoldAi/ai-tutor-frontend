/**
 * Plain-language messages for students. Use everywhere user-facing errors appear.
 */

export const MSG = {
  network:
    "We couldn't connect right now. Check your internet connection and try again.",
  server: "Something went wrong on our side. Please try again in a moment.",
  sessionExpired: "Your session ended. Please sign in again.",
  uploadPdfOnly: "Please choose a PDF file (textbook or notes).",
  uploadFailed: "We couldn't upload your file. Please try again.",
  chatFailed: "We couldn't send your message. Please try again.",
  streamFailed: "I couldn't finish my answer. Please ask your question again.",
  tutorError:
    "Sorry — something went wrong. Please try again or ask your question in a different way.",
  voiceUnavailable:
    "We couldn't reach your tutor. Tap Reconnect to try again.",
  voiceConnection:
    "We lost connection to your tutor. Close this page and open voice again, or tap Refresh.",
  voiceError: "Something went wrong during your voice session. Please try again.",
  speechUnsupported:
    "Voice input isn't supported in this browser. You can still type your questions.",
  micPermission:
    "We need microphone access to hear you. Allow the mic in your browser settings, then tap the microphone button.",
  micNotFound:
    "We couldn't find a microphone on this device. Plug one in, or type your questions instead.",
  micInUse:
    "Your microphone is being used by another app or tab. Close it and tap the microphone button again.",
  subjectsLoad: "We couldn't load your subjects.",
  subjectsRetry: "Check your internet connection, then tap Refresh.",
  configUnavailable:
    "This feature isn't available right now. Please try again later or ask your teacher.",
  figureLoad: "This picture couldn't be loaded.",
  loginFailed: "We couldn't sign you in. Check your username and password.",
  signupFailed: "We couldn't create your account. Please check your details and try again.",
  notFound: "This page doesn't exist. Use the menu to go back to your dashboard.",
  loading: "Loading…",
  tryAgain: "Try again",
  refresh: "Refresh",
} as const;

/** Map known API `detail` strings to student-friendly text. */
const API_DETAIL_MAP: Record<string, string> = {
  "Wrong username or password. Please try again.": "Wrong username or password. Please try again.",
  "Your account is paused. Please ask your teacher or school admin for help.":
    "Your account is paused. Please ask your teacher or school admin for help.",
  "Your session ended. Please sign in again.": MSG.sessionExpired,
  "This email is already in use. Try signing in or use a different email.":
    "This email is already in use. Try signing in or use a different email.",
  "That username is taken. Please pick another one.":
    "That username is taken. Please pick another one.",
  "I couldn't find this in your chapter textbook. Try asking about a topic from the chapter you're studying, or open Learning Studio and pick the right chapter.":
    "I couldn't find this in your chapter. Try a question about the chapter you're studying, or pick another chapter in Learning Studio.",
  "Sorry — I had trouble answering that. Please try again in a moment.": MSG.voiceError,
  "Something went wrong on our side. Please close and reopen the voice session, or try again later.":
    MSG.server,
  "Please say or type a question first.": "Please say or type a question first.",
  "This picture couldn't be loaded.": MSG.figureLoad,
  "Please upload a PDF file (textbook or notes).": MSG.uploadPdfOnly,
  "Please select your class.": "Please select your class.",
  "Please enter your section (for example A or B).":
    "Please enter your section (for example A or B).",
  "Please enter your full name (at least 2 letters).":
    "Please enter your full name (at least 2 letters).",
  "Username can only use letters, numbers, hyphens (-), and underscores (_).":
    "Username can only use letters, numbers, hyphens (-), and underscores (_).",
  "Enter your current password before choosing a new one.":
    "Enter your current password before choosing a new one.",
  // Legacy API strings (older backend / cache)
  "Invalid credentials.": "Wrong username or password. Please try again.",
  "Account is inactive.":
    "Your account is paused. Please ask your teacher or school admin for help.",
  "Not authenticated.": MSG.sessionExpired,
  "Invalid access token.": MSG.sessionExpired,
  "Inactive account.": "Your account is paused. Please ask your teacher for help.",
  "Insufficient permissions.":
    "You don't have access to this page. Go back to your dashboard.",
  "Email is already registered.":
    "This email is already in use. Try signing in or use a different email.",
  "This email is already registered.":
    "This email is already in use. Try signing in or use a different email.",
  "This username is already taken.":
    "That username is taken. Please pick another one.",
  "Current password is incorrect.":
    "Your current password is wrong. Please try again.",
  "Current password is required to set a new password.":
    "Enter your current password before choosing a new one.",
  "Invalid verification token.":
    "This verification link is invalid or expired. Request a new one.",
  "Invalid reset token.":
    "This password reset link is invalid or expired. Request a new one.",
  "This password reset code is invalid or expired. Request a new one.":
    "That reset code is invalid or expired. Request a new one.",
  "User not found.": MSG.sessionExpired,
  "The answer is not found in the document.":
    "I couldn't find this in your chapter. Try a question about the chapter you're studying, or pick another chapter in Learning Studio.",
  "Answer generation failed.": MSG.voiceError,
  "Server error.": MSG.server,
  "Empty message": "Please say or type a question first.",
  "Image not found.": MSG.figureLoad,
  "Image file missing.": MSG.figureLoad,
  "Image not displayable.": MSG.figureLoad,
  "Invalid file path.": MSG.figureLoad,
  "Only PDF files are supported.": MSG.uploadPdfOnly,
  "full_name must be at least 2 characters.":
    "Please enter your full name (at least 2 letters).",
  "username may only contain letters, numbers, hyphens, and underscores.":
    "Username can only use letters, numbers, hyphens (-), and underscores (_).",
  "grade is required": "Please select your class.",
  "grade cannot be empty": "Please select your class.",
  "At least one section (e.g. A, B) is required per class.":
    "Please enter your section (for example A or B).",
  "More than one account shares that email or phone. Sign in with your username instead.":
    "More than one account shares that email or phone. Sign in with your username instead.",
  "We couldn't send the reset email. Please try again in a moment.":
    "We couldn't send the reset email. Please try again in a moment.",
};

function extractDetailFromBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        detail?: string | Array<{ msg?: string; loc?: unknown[] }>;
        message?: string;
      };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) {
        return parsed.detail[0].msg;
      }
      if (typeof parsed.message === "string") return parsed.message;
    } catch {
      /* not JSON */
    }
  }
  if (trimmed.length < 200 && !trimmed.includes("<!DOCTYPE")) {
    return trimmed;
  }
  return null;
}

export function mapHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return "Something in your request wasn't right. Please check and try again.";
    case 401:
      return MSG.sessionExpired;
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you asked for.";
    case 409:
      return "This conflicts with something that already exists. Try different details.";
    case 422:
      return "Please check the form and fill in all required fields correctly.";
    case 429:
      return "You're doing that too often. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return MSG.server;
    default:
      return status >= 500 ? MSG.server : MSG.chatFailed;
  }
}

export function studentFriendlyApiError(
  body: string,
  status?: number,
  fallback: string = MSG.server,
): string {
  const detail = extractDetailFromBody(body);
  if (detail) {
    const mapped = API_DETAIL_MAP[detail];
    if (mapped) return mapped;
    if (
      detail.includes("MISTRAL") ||
      detail.includes("env var") ||
      detail.includes("VITE_") ||
      detail.includes("traceback") ||
      detail.includes("Exception")
    ) {
      return fallback;
    }
    if (detail.length <= 160 && !detail.startsWith("Request failed")) {
      return detail;
    }
  }
  if (status) return mapHttpStatus(status);
  return fallback;
}

export function studentFriendlyError(
  error: unknown,
  fallback: string = MSG.server,
): string {
  if (!error) return fallback;
  if (typeof error === "string") {
    if (error === "Failed to fetch") return MSG.network;
    return studentFriendlyApiError(error, undefined, fallback);
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return MSG.network;
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (!msg) return fallback;
    if (msg === "Failed to fetch") return MSG.network;
    if (/^Request failed \(\d+\)$/.test(msg)) {
      const status = Number(msg.match(/\d+/)?.[0]);
      return mapHttpStatus(status);
    }
    if (/^HTTP \d+$/.test(msg)) {
      const status = Number(msg.replace("HTTP ", ""));
      return mapHttpStatus(status);
    }
    if (msg.startsWith("{") || msg.includes("VITE_") || msg.includes(".env")) {
      return studentFriendlyApiError(msg, undefined, fallback);
    }
    const mapped = API_DETAIL_MAP[msg];
    if (mapped) return mapped;
    if (
      msg.includes("Stream response has no body") ||
      msg.includes("Voice response has no stream body")
    ) {
      return MSG.streamFailed;
    }
    if (msg.includes("API_URL is not configured") || msg.includes("VOICE_URL")) {
      return MSG.configUnavailable;
    }
    if (msg.includes("Missing auth tokens")) {
      return MSG.loginFailed;
    }
    if (msg.length <= 160) return studentFriendlyApiError(msg, undefined, fallback);
    return fallback;
  }
  return fallback;
}

/** @deprecated Use studentFriendlyError — kept for settings forms. */
export function parseStudentApiError(error: unknown, fallback: string): string {
  return studentFriendlyError(error, fallback);
}
