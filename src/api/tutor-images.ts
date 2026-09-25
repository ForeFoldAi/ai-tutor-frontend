import { authFetch } from "@/api";

export type TutorImageUploadResult = {
  image_id: string;
  content_hash: string;
  expires_at: number;
  mime_type: string;
  width: number;
  height: number;
};

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export function validateTutorImageFile(file: File): string | null {
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED.has(mime) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return "Please upload a JPG, PNG, or WEBP image.";
  }
  if (file.size > MAX_BYTES) {
    return "That image is too large. Please upload a smaller image (under 8 MB).";
  }
  if (file.size === 0) {
    return "Please upload a valid JPG, PNG, or WEBP image.";
  }
  return null;
}

export async function uploadTutorImage(file: File): Promise<TutorImageUploadResult> {
  const err = validateTutorImageFile(file);
  if (err) throw new Error(err);
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch("/auth/tutor/images", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = "Please upload a valid JPG, PNG, or WEBP image.";
    try {
      const body = (await res.json()) as { detail?: string };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as TutorImageUploadResult;
}
