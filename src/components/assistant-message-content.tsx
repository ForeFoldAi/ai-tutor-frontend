import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  /** When set, figure belongs under this subtopic heading in a main-section answer */
  subtopic?: string | null;
  title?: string | null;
  figure_number?: string | null;
}

const FIG_NUMBER_PREFIX_RE = /^\s*Fig\.?\s*(\d+(?:\.\d+)*)\s*[.:]?\s*/i;

/** e.g. "Fig. 1.21" — from figure_number or parsed from caption. */
export function figureNumberLabel(img: RelatedTextbookImage): string | null {
  const fig = img.figure_number?.trim();
  if (fig) {
    return `Fig. ${fig}`;
  }
  const cap = img.caption?.trim() || "";
  const match = cap.match(/^\s*Fig\.?\s*(\d+(?:\.\d+)*)/i);
  if (match) {
    return `Fig. ${match[1]}`;
  }
  return null;
}

const PROSE_CAPTION_RE =
  /\b(you wake up|what is|chapter \d|grade \d|exploring society|india and beyond|keep you cool|keep yourself warm)\b|^in th[e]?\s+[a-z]/i;

/** One short caption line (no figure prefix, no long prose). */
export function figureCaptionText(img: RelatedTextbookImage, idx = 0): string {
  let cap = img.caption?.trim() || "";
  if (cap) {
    cap = cap.replace(FIG_NUMBER_PREFIX_RE, "").trim();
    const sentence = cap.split(/(?<=[.!?])\s+/)[0]?.trim() || cap;
    if (
      sentence.length >= 3 &&
      !/^\d{1,3}$/.test(sentence) &&
      sentence.length <= 140 &&
      !PROSE_CAPTION_RE.test(sentence)
    ) {
      return sentence;
    }
  }

  const subtopic = img.subtopic?.trim();
  const title = img.title?.trim();

  if (subtopic) {
    return subtopic;
  }
  if (title && title.length >= 3 && title.length <= 140) {
    return title;
  }
  if (img.page != null) {
    return `Textbook illustration`;
  }
  return `Figure ${idx + 1}`;
}

/** Full alt / fallback label (figure number + caption). */
export function displayFigureCaption(img: RelatedTextbookImage, idx = 0): string {
  const figLabel = figureNumberLabel(img);
  const body = figureCaptionText(img, idx);
  if (figLabel && body) {
    return `${figLabel}. ${body}`;
  }
  return figLabel || body;
}

export function shouldShowImagesDuringStream(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return true;
  const trimmed = content.trim();
  if (!trimmed) return true;
  return isSafeImageInjectionPoint(content, true);
}

function normalizeSubtopicKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const FIG_CAPTION_LINE_RE = /^\s*Fig\.?\s*\d[\d.]*\s*[.:—–-]?\s*.+/i;
const PAGE_LINE_RE = /^\s*Page\s+\d+\s*$/i;
const FIG_CAPTION_ANYWHERE_RE =
  /(?:^|\n)\s*Fig\.?\s*\d+(?:\.\d+)*\s*[.:—–-]\s*[A-Z][^\n]{8,160}/gi;

/** Remove textbook figure captions the model pasted into prose (figures render as cards). */
function stripEmbeddedFigureLines(text: string): string {
  let out = text.replace(FIG_CAPTION_ANYWHERE_RE, "\n");
  const lines = out.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (kept.length > 0 && kept[kept.length - 1].trim() !== "") {
        kept.push("");
      }
      continue;
    }
    if (FIG_CAPTION_LINE_RE.test(t) || PAGE_LINE_RE.test(t)) {
      continue;
    }
    if (kept.length > 0 && kept[kept.length - 1].trim() === t) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Drop figure caption lines duplicated between answer text and image cards. */
function stripKnownFigureCaptions(text: string, images: RelatedTextbookImage[]): string {
  let out = stripEmbeddedFigureLines(text);
  for (const img of images) {
    const fig = figureNumberLabel(img);
    const body = figureCaptionText(img, 0);
    if (fig && body) {
      const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(
        new RegExp(`^\\s*${fig.replace(".", "\\.")}\\s*[.:—–-]?\\s*${escaped}\\s*$`, "gim"),
        "",
      );
    }
    const cap = img.caption?.trim();
    if (cap) {
      const escapedCap = cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`^\\s*${escapedCap}\\s*$`, "gim"), "");
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function splitClosingQuestion(body: string): { body: string; closing: string } {
  const lines = body.split("\n");
  let splitAt = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("•")) {
      continue;
    }
    if (/^(can you|could you|name one|tell me|what instrument|how does)/i.test(t)) {
      splitAt = i;
      break;
    }
  }
  if (splitAt < 0) {
    return { body: stripEmbeddedFigureLines(body), closing: "" };
  }
  return {
    body: stripEmbeddedFigureLines(lines.slice(0, splitAt).join("\n")),
    closing: stripEmbeddedFigureLines(lines.slice(splitAt).join("\n")),
  };
}

/** Split tutor text into blocks led by **Subtopic** or plain line titles (e.g. "Temperature"). */
function splitSubtopicBlocks(
  content: string,
  knownTitles: string[] = [],
): { title: string; body: string }[] {
  const trimmed = content.trim();

  const plainTitles = knownTitles
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (plainTitles.length >= 2) {
    const lines = trimmed.split("\n");
    const indices: { title: string; lineIdx: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineKey = normalizeSubtopicKey(line.replace(/\*\*/g, ""));
      const hit = plainTitles.find((t) => normalizeSubtopicKey(t) === lineKey);
      if (hit) {
        indices.push({ title: hit, lineIdx: i });
      }
    }
    if (indices.length >= 2) {
      const blocks: { title: string; body: string }[] = [];
      for (let j = 0; j < indices.length; j++) {
        const startLine = indices[j].lineIdx + 1;
        const endLine = j + 1 < indices.length ? indices[j + 1].lineIdx : lines.length;
        const body = lines.slice(startLine, endLine).join("\n").trim();
        blocks.push({ title: indices[j].title, body });
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }
  }

  if (!trimmed.includes("**")) {
    return [{ title: "", body: trimmed }];
  }
  const re = /\*\*([^*]+)\*\*/g;
  const matches = [...trimmed.matchAll(re)];
  if (matches.length < 2) {
    return [{ title: "", body: trimmed }];
  }
  const blocks: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? trimmed.length) : trimmed.length;
    const body = trimmed.slice(start, end).trim();
    if (title) {
      blocks.push({ title, body });
    }
  }
  return blocks.length > 0 ? blocks : [{ title: "", body: trimmed }];
}

/** True when we can render per-subtopic sections (tagged images + matching content blocks). */
export function shouldUseSubtopicSectionLayout(
  content: string,
  images: RelatedTextbookImage[],
): boolean {
  if (!images.some((i) => i.subtopic?.trim())) {
    return false;
  }
  const knownTitles = images.map((i) => i.subtopic?.trim() || "").filter(Boolean);
  const blocks = splitSubtopicBlocks(content.trim(), knownTitles);
  return blocks.length >= 2 && blocks.every((b) => b.title.length > 0);
}

function imageForSubtopic(
  images: RelatedTextbookImage[],
  title: string,
  usedUrls: Set<string>,
): RelatedTextbookImage | undefined {
  const key = normalizeSubtopicKey(title);
  if (!key) return undefined;
  return images.find((img) => {
    if (img.url && usedUrls.has(img.url)) {
      return false;
    }
    const st = img.subtopic ? normalizeSubtopicKey(img.subtopic) : "";
    if (!st) return false;
    return st === key || st.includes(key) || key.includes(st);
  });
}

function MainSectionWithImages({
  content,
  images,
  token,
  cursor,
}: {
  content: string;
  images: RelatedTextbookImage[];
  token?: string | null;
  cursor?: ReactNode;
}) {
  const knownTitles = images.map((i) => i.subtopic?.trim() || "").filter(Boolean);
  const blocks = splitSubtopicBlocks(content, knownTitles);
  const tagged = images.some((i) => i.subtopic?.trim());

  if (!tagged || blocks.length < 2) {
    return null;
  }

  const usedFigureUrls = new Set<string>();
  let closingQuestion = "";

  const sections = blocks.map((block, idx) => {
    const { body, closing } = splitClosingQuestion(block.body);
    if (closing) {
      closingQuestion = closing;
    }
    const img = imageForSubtopic(images, block.title, usedFigureUrls);
    if (img?.url) {
      usedFigureUrls.add(img.url);
    }
    const isLast = idx === blocks.length - 1;
    return (
      <section
        key={`${block.title}-${idx}`}
        className="rounded-lg border border-border/40 bg-muted/20 p-3 sm:p-4"
      >
        <h4 className="text-sm font-semibold text-foreground mb-2">{block.title}</h4>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {renderFormattedText(body)}
          {isLast && !closingQuestion ? cursor : null}
        </div>
        {img ? (
          <div className="mt-3">
            <TextbookFigureCard img={img} idx={idx} token={token} count={1} />
          </div>
        ) : null}
      </section>
    );
  });

  return (
    <div className="flex flex-col gap-5 w-full min-w-0" data-layout="subtopic-sections">
      {sections}
      {closingQuestion ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 pt-1">
          {renderFormattedText(closingQuestion)}
          {cursor}
        </p>
      ) : null}
    </div>
  );
}

export function textbookImageSrc(relativeUrl: string, accessToken?: string | null): string {
  if (!relativeUrl) return "";
  let u = relativeUrl;
  if (accessToken) {
    u += `${u.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  }
  return u;
}

/** Horizontal layout classes based on how many figures to show. */
function imageGalleryLayoutClass(count: number): string {
  if (count <= 1) {
    return "grid grid-cols-1 w-full max-w-md";
  }
  if (count === 2) {
    return "grid grid-cols-1 sm:grid-cols-2 gap-3 w-full";
  }
  if (count === 3) {
    return "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full";
  }
  return "flex flex-row gap-3 w-full overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin";
}

function figureCardWidthClass(count: number): string {
  if (count <= 3) return "min-w-0 w-full";
  return "min-w-[72%] sm:min-w-[48%] md:min-w-[220px] max-w-[280px] shrink-0 snap-start";
}

function TextbookFigureCard({
  img,
  idx,
  token,
  count,
}: {
  img: RelatedTextbookImage;
  idx: number;
  token?: string | null;
  count: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const figLabel = figureNumberLabel(img);
  const captionBody = figureCaptionText(img, idx);
  const altText = displayFigureCaption(img, idx);

  return (
    <figure
      className={cn(
        "rounded-xl border border-primary/20 bg-background/60 overflow-hidden flex flex-col shadow-sm",
        figureCardWidthClass(count),
      )}
    >
      <div className="bg-muted/30 p-2 flex items-center justify-center min-h-[120px] relative">
        {!loaded && !failed ? (
          <div
            className="absolute inset-2 rounded-lg bg-muted/50 animate-pulse"
            aria-hidden
          />
        ) : null}
        {!failed ? (
          <img
            src={textbookImageSrc(img.url, token)}
            alt={altText}
            className={cn(
              "block w-full h-auto max-h-52 object-contain relative z-[1]",
              !loaded && "opacity-0",
            )}
            loading="eager"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setFailed(true);
              setLoaded(false);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs py-6 px-3 text-center">
            <span>Figure unavailable</span>
          </div>
        )}
      </div>
      <figcaption className="px-3 py-2.5 text-xs text-foreground/90 leading-relaxed border-t border-border/50 space-y-1">
        <p className="whitespace-normal break-words">
          {figLabel ? <span className="font-semibold text-foreground">{figLabel}</span> : null}
          {figLabel && captionBody ? (
            <span className="text-muted-foreground mx-1.5" aria-hidden>
              —
            </span>
          ) : null}
          {captionBody ? (
            <span className="text-foreground/85">{captionBody}</span>
          ) : null}
        </p>
        {!loaded && !failed ? (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
            Loading figure…
          </p>
        ) : null}
        {failed ? (
          <p className="text-[11px] text-destructive/90">Could not load this figure.</p>
        ) : null}
        {img.page != null ? (
          <p className="text-[11px] text-muted-foreground/80">Page {img.page}</p>
        ) : null}
      </figcaption>
    </figure>
  );
}

function TextbookImagesRetrieving({
  hint,
  className,
}: {
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 pt-3 border-t border-primary/15 w-full min-w-0",
        className,
      )}
      data-testid="textbook-images-retrieving"
    >
      <div className="rounded-xl border border-dashed border-primary/25 bg-muted/20 px-3 py-3 sm:px-4 sm:py-3.5">
        <p className="text-xs font-medium text-foreground/90 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" aria-hidden />
          Finding relevant textbook figures…
        </p>
        {hint ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function TextbookImageGallery({
  images,
  token,
  className,
}: {
  images: RelatedTextbookImage[];
  token?: string | null;
  className?: string;
}) {
  if (images.length === 0) return null;

  return (
    <div className={cn("mt-4 pt-3 border-t border-primary/15 w-full min-w-0", className)} data-testid="textbook-image-block">
      <div className={imageGalleryLayoutClass(images.length)}>
        {images.map((img, idx) => (
          <TextbookFigureCard key={`${img.url}-${idx}`} img={img} idx={idx} token={token} count={images.length} />
        ))}
      </div>
    </div>
  );
}

export { TextbookImageGallery, TextbookImagesRetrieving };

export function AssistantMessageContent({
  content,
  relatedImages,
  token,
  isStreaming,
  imagesRetrieving,
  imagesRetrievingHint,
}: {
  content: string;
  relatedImages?: RelatedTextbookImage[];
  token?: string | null;
  isStreaming?: boolean;
  /** True while the backend is still ranking textbook figures for this answer. */
  imagesRetrieving?: boolean;
  imagesRetrievingHint?: string;
}) {
  const images = relatedImages ?? [];
  const showImages = images.length > 0;

  const cursor = isStreaming ? (
    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
  ) : null;

  const useSubtopicSections = shouldUseSubtopicSectionLayout(content, images);

  if (useSubtopicSections) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <MainSectionWithImages
          content={content.trim()}
          images={images}
          token={token}
          cursor={cursor}
        />
        {!showImages && imagesRetrieving ? (
          <TextbookImagesRetrieving hint={imagesRetrievingHint} />
        ) : null}
      </div>
    );
  }

  const uniqueImages = images.filter((img, idx) => {
    if (!img.url) return true;
    return images.findIndex((o) => o.url === img.url) === idx;
  });

  const prose = stripKnownFigureCaptions(content.trim(), images);

  return (
    <div className="flex flex-col w-full min-w-0" data-layout="text-top-images-row">
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderFormattedText(prose)}
        {cursor}
      </div>
      {showImages ? <TextbookImageGallery images={uniqueImages} token={token} /> : null}
      {!showImages && imagesRetrieving ? (
        <TextbookImagesRetrieving hint={imagesRetrievingHint} />
      ) : null}
    </div>
  );
}
