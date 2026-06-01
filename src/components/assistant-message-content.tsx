import { type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { API_BASE } from "@/api";
import { isSafeImageInjectionPoint } from "@/lib/stream-safe-images";

const BOLD_RE = /\*\*(.+?)\*\*/g;

/** Turn `**bold**` markers from the tutor into real bold text. */
function renderFormattedText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  BOLD_RE.lastIndex = 0;
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>,
    );
    lastIndex = BOLD_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? text : parts.length === 1 ? parts[0] : parts;
}

export interface RelatedTextbookImage {
  url: string;
  caption?: string | null;
  page?: number | null;
  textbook_upload_id?: string;
  relevance?: number;
}

type MessageSegment =
  | { type: "text"; content: string }
  | { type: "images"; images: RelatedTextbookImage[]; showLabel: boolean };

/** How many complete sentences appear before the first figure block. */
const SENTENCES_BEFORE_FIGURES = 2;
/** Max figures in the middle of the answer (rest go after the continuation, if any). */
const MAX_MID_FIGURES = 2;

const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
const TUTOR_OFFER_RE =
  /^(want me to|would you like|shall i|need me to|can i explain)/i;

export function textbookImageSrc(relativeUrl: string, accessToken?: string | null): string {
  if (!relativeUrl) return "";
  let u =
    relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")
      ? relativeUrl
      : `${API_BASE}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  if (accessToken) {
    u += `${u.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  }
  return u;
}

function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.match(SENTENCE_RE)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];
}

/** Separate the optional tutor follow-up line from the main explanation. */
function peelTutorOffer(sentences: string[]): { main: string[]; offer: string } {
  const idx = sentences.findIndex((s) => TUTOR_OFFER_RE.test(s.trim()));
  if (idx < 0) return { main: sentences, offer: "" };
  return {
    main: sentences.slice(0, idx),
    offer: sentences.slice(idx).join(" ").trim(),
  };
}

/**
 * Split so figures sit after the opening sentences, e.g.
 * "Great question! … moved north." → [FIGURES] → "When it collided…"
 */
function splitAroundFirstFigures(content: string): {
  before: string;
  after: string;
  offer: string;
} {
  const { main, offer } = peelTutorOffer(splitSentences(content));
  if (main.length === 0) {
    return { before: content.trim(), after: "", offer };
  }

  let splitIdx = SENTENCES_BEFORE_FIGURES;

  // Prefer figures right after the setup sentence (Gondwana / moved north), like a textbook.
  const setupIdx = main.findIndex((s) =>
    /\b(moved north|gondwana|slowly moved|drifted north)\b/i.test(s),
  );
  if (setupIdx >= 0 && setupIdx < 5) {
    splitIdx = setupIdx + 1;
  }

  splitIdx = Math.min(splitIdx, main.length);

  if (splitIdx <= 0 || splitIdx >= main.length) {
    const joined = main.join(" ");
    const mid = Math.max(1, Math.floor(joined.length / 2));
    const splitAt = joined.lastIndexOf(" ", mid);
    if (splitAt > 30) {
      return {
        before: joined.slice(0, splitAt).trim(),
        after: joined.slice(splitAt).trim(),
        offer,
      };
    }
    return { before: joined, after: "", offer };
  }

  const before = main.slice(0, splitIdx).join(" ").trim();
  const after = main.slice(splitIdx).join(" ").trim();
  return { before, after, offer };
}

export function countSentences(text: string): number {
  return splitSentences(text).length;
}

/**
 * Build: opening text → figures → continuation → (optional extra figures) → offer line
 */
export function buildInterleavedSegments(
  content: string,
  images: RelatedTextbookImage[],
): MessageSegment[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (images.length === 0) {
    return [{ type: "text", content: trimmed }];
  }

  const { before, after, offer } = splitAroundFirstFigures(trimmed);
  const midImages = images.slice(0, MAX_MID_FIGURES);
  const tailImages = images.slice(MAX_MID_FIGURES);

  const segments: MessageSegment[] = [];

  if (before) {
    segments.push({ type: "text", content: before });
  }

  if (midImages.length > 0) {
    segments.push({ type: "images", images: midImages, showLabel: true });
  }

  if (after) {
    segments.push({ type: "text", content: after });
  }

  if (tailImages.length > 0) {
    segments.push({ type: "images", images: tailImages, showLabel: segments.every((s) => s.type !== "images") });
  }

  if (offer) {
    segments.push({ type: "text", content: offer });
  }

  if (segments.length === 0) {
    return [{ type: "text", content: trimmed }];
  }

  return segments;
}

function TextbookImageGrid({
  images,
  token,
  showLabel,
}: {
  images: RelatedTextbookImage[];
  token?: string | null;
  showLabel: boolean;
}) {
  const gridClass =
    images.length === 1
      ? "w-full sm:max-w-md"
      : "grid grid-cols-1 sm:grid-cols-2 gap-2 w-full items-start";

  return (
    <div className="my-3 space-y-2 w-full min-w-0" data-testid="textbook-image-block">
      {showLabel && (
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          From your textbook
        </p>
      )}
      <div className={gridClass}>
        {images.map((img, idx) => (
          <figure
            key={`${img.url}-${idx}`}
            className="rounded-lg border bg-background/80 overflow-hidden flex flex-col w-full min-w-0"
          >
            <img
              src={textbookImageSrc(img.url, token)}
              alt={img.caption || `Textbook figure ${idx + 1}`}
              className="block w-full h-auto max-h-56 object-contain bg-muted/40"
              loading="lazy"
            />
            {(img.caption || img.page) && (
              <figcaption className="px-2 py-1.5 text-xs text-muted-foreground whitespace-normal break-words">
                {img.caption ?? ""}
                {img.page ? `${img.caption ? " · " : ""}Page ${img.page}` : ""}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

export function AssistantMessageContent({
  content,
  relatedImages,
  token,
  isStreaming,
}: {
  content: string;
  relatedImages?: RelatedTextbookImage[];
  token?: string | null;
  isStreaming?: boolean;
}) {
  const images = relatedImages ?? [];
  const canInjectFigures =
    images.length > 0 &&
    (!isStreaming || isSafeImageInjectionPoint(content, true));
  const segments = buildInterleavedSegments(content, canInjectFigures ? images : []);

  const lastTextIndex = segments.reduce(
    (acc, seg, i) => (seg.type === "text" ? i : acc),
    -1,
  );

  const cursor = isStreaming ? (
    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
  ) : null;

  if (segments.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {renderFormattedText(content)}
        {cursor}
      </p>
    );
  }

  return (
    <div data-layout="interleaved-v2">
      {segments.map((seg, idx) =>
        seg.type === "text" ? (
          <p
            key={`t-${idx}`}
            className="whitespace-pre-wrap text-sm leading-relaxed"
          >
            {renderFormattedText(seg.content)}
            {idx === lastTextIndex && cursor}
          </p>
        ) : (
          <TextbookImageGrid
            key={`i-${idx}-${seg.images[0]?.url ?? idx}`}
            images={seg.images}
            token={token}
            showLabel={seg.showLabel}
          />
        ),
      )}
    </div>
  );
}
