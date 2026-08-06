import { type ReactNode, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MSG } from "@/lib/student-messages";
import { API_BASE } from "@/api";
import { isSafeImageInjectionPoint } from "@/lib/stream-safe-images";
import { renderTutorText, TutorMessageProse } from "@/lib/render-tutor-text";
import { MathLessonPanel } from "@/components/math-lesson/math-lesson-panel";
import { ScienceExperimentPanel } from "@/components/science-experiment/science-experiment-panel";
import type { MathLesson } from "@/types/math-lesson";
import { cleanTutorDisplayContent, stripMathLessonBlock } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { stripScienceExperimentBlock } from "@/types/science-experiment";

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
  /** LaTeX or markdown for formula/table assets from the ML pipeline */
  structured_content?: string | null;
  content_kind?: string | null;
  file_name?: string | null;
}

const FIG_NUMBER_PREFIX_RE = /^\s*Fig\.?\s*(\d+(?:\.\d+)*)\s*[.:]?\s*/i;

/** Wrap plain formula text for KaTeX when needed. */
function formatStructuredMath(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (t.includes("$$")) return t;
  if (/\\frac|\\text|[\^_{}]/.test(t)) {
    return `$$${t}$$`;
  }
  return t
    .split("\n")
    .map((line) => {
      const s = line.trim();
      if (!s) return "";
      if (s.startsWith("=") || /^[0-9(]/.test(s)) {
        return `$$${s}$$`;
      }
      return s;
    })
    .filter(Boolean)
    .join("\n");
}

function isFormulaAsset(img: RelatedTextbookImage): boolean {
  if (img.content_kind === "formula") return true;
  return Boolean(img.file_name?.includes("formulas/"));
}

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

const FIG_CAPTION_LINE_RE =
  /^\s*Fig\.?\s*\d+(?:\.\d+)*\s*(?:[.:—–-]\s*)?.+$/i;
const PAGE_LINE_RE = /^\s*Page\s+\d+\s*$/i;
const FIG_CAPTION_ANYWHERE_RE =
  /(?:^|\n)\s*Fig\.?\s*\d+(?:\.\d+)*\s*[.:—–-]\s*[^\n]{3,160}/gi;

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

/** True when we can render per-subtopic sections (tagged images and/or **bold** blocks in text). */
export function shouldUseSubtopicSectionLayout(
  content: string,
  images: RelatedTextbookImage[],
): boolean {
  const trimmed = content.trim();
  // Chapter-awareness a/b/c menus use many **bold** spans — not subtopic sections.
  if (trimmed.includes("How would you like to continue?")) {
    return false;
  }
  const knownTitles = images.map((i) => i.subtopic?.trim() || "").filter(Boolean);
  const blocks = splitSubtopicBlocks(trimmed, knownTitles);
  return blocks.length >= 2 && blocks.every((b) => b.title.length > 0);
}

function MainSectionBlocks({
  content,
  images,
  cursor,
}: {
  content: string;
  images: RelatedTextbookImage[];
  cursor?: ReactNode;
}) {
  const knownTitles = images.map((i) => i.subtopic?.trim() || "").filter(Boolean);
  const stripped = stripKnownFigureCaptions(content, images);
  const blocks = splitSubtopicBlocks(stripped, knownTitles);

  if (blocks.length < 2 || !blocks.every((b) => b.title.length > 0)) {
    return null;
  }

  let closingQuestion = "";

  const sections = blocks.map((block, idx) => {
    const { body, closing } = splitClosingQuestion(block.body);
    if (closing) {
      closingQuestion = closing;
    }
    const isLast = idx === blocks.length - 1;
    return (
      <section
        key={`${block.title}-${idx}`}
        className="rounded-lg border border-border/40 bg-muted/20 p-2 sm:p-2.5"
      >
        <h4 className="text-sm font-semibold text-foreground mb-1">{block.title}</h4>
        <TutorMessageProse text={body} className="text-foreground/90">
          {isLast && !closingQuestion ? cursor : null}
        </TutorMessageProse>
      </section>
    );
  });

  return (
    <div className="flex flex-col gap-2 w-full min-w-0" data-layout="subtopic-sections">
      {sections}
      {closingQuestion ? (
        <TutorMessageProse text={closingQuestion} className="text-foreground/90 pt-1">
          {cursor}
        </TutorMessageProse>
      ) : null}
    </div>
  );
}

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

/** Horizontal layout: 3+ figures scroll inside the row; page stays fixed width. */
function imageGalleryLayoutClass(count: number): string {
  if (count <= 1) {
    return "grid grid-cols-1 w-full max-w-md";
  }
  if (count === 2) {
    return "grid grid-cols-2 gap-3 w-full max-w-full min-w-0";
  }
  return "flex flex-row flex-nowrap gap-3 w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-thin";
}

function figureCardWidthClass(count: number): string {
  if (count <= 2) return "min-w-0 w-full";
  return "w-[200px] min-w-[180px] max-w-[220px] shrink-0 snap-start";
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
        {img.structured_content?.trim() && isFormulaAsset(img) ? (
          <div className="text-[11px] text-foreground/90 whitespace-pre-wrap border-t border-border/40 pt-2 mt-1">
            {renderTutorText(formatStructuredMath(img.structured_content))}
          </div>
        ) : null}
        {!loaded && !failed ? (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
            Loading figure…
          </p>
        ) : null}
        {failed ? (
          <p className="text-[11px] text-destructive/90">{MSG.figureLoad}</p>
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
    <div
      className={cn("mt-4 pt-3 border-t border-primary/15 w-full min-w-0 max-w-full overflow-hidden", className)}
      data-testid="textbook-image-block"
    >
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
  mathLesson,
  scienceExperiment,
  token,
  isStreaming,
  imagesRetrieving,
  imagesRetrievingHint,
}: {
  content: string;
  relatedImages?: RelatedTextbookImage[];
  mathLesson?: MathLesson | null;
  scienceExperiment?: ScienceExperiment | null;
  token?: string | null;
  isStreaming?: boolean;
  /** True while the backend is still ranking textbook figures for this answer. */
  imagesRetrieving?: boolean;
  imagesRetrievingHint?: string;
}) {
  const images = relatedImages ?? [];
  const showImages = images.length > 0;

  const { cleanContent, lesson: embeddedLesson, experiment: embeddedExperiment } = useMemo(() => {
    const { cleanContent: afterMath, lesson } = stripMathLessonBlock(content);
    const { cleanContent: stripped, experiment } = stripScienceExperimentBlock(afterMath);
    return {
      cleanContent: cleanTutorDisplayContent(stripped),
      lesson,
      experiment,
    };
  }, [content]);
  const resolvedLesson = mathLesson ?? embeddedLesson;
  const resolvedExperiment = scienceExperiment ?? embeddedExperiment;

  const cursor = isStreaming ? (
    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
  ) : null;

  const useSubtopicSections = shouldUseSubtopicSectionLayout(cleanContent, images);
  const uniqueImages = images.filter((img, idx) => {
    if (!img.url) return true;
    return images.findIndex((o) => o.url === img.url) === idx;
  });

  if (useSubtopicSections) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <MainSectionBlocks
          content={cleanContent.trim()}
          images={images}
          cursor={cursor}
        />
        {resolvedLesson && !isStreaming ? <MathLessonPanel lesson={resolvedLesson} /> : null}
        {resolvedExperiment && !isStreaming ? (
          <ScienceExperimentPanel experiment={resolvedExperiment} />
        ) : null}
        {showImages ? <TextbookImageGallery images={uniqueImages} token={token} /> : null}
        {!showImages && imagesRetrieving ? (
          <TextbookImagesRetrieving hint={imagesRetrievingHint} />
        ) : null}
      </div>
    );
  }

  const prose = stripKnownFigureCaptions(cleanContent.trim(), images);

  return (
    <div className="flex flex-col w-full min-w-0" data-layout="text-top-images-row">
      <TutorMessageProse text={prose}>
        {cursor}
      </TutorMessageProse>
      {resolvedLesson && !isStreaming ? <MathLessonPanel lesson={resolvedLesson} /> : null}
      {resolvedExperiment && !isStreaming ? (
        <ScienceExperimentPanel experiment={resolvedExperiment} />
      ) : null}
      {showImages ? <TextbookImageGallery images={uniqueImages} token={token} /> : null}
      {!showImages && imagesRetrieving ? (
        <TextbookImagesRetrieving hint={imagesRetrievingHint} />
      ) : null}
    </div>
  );
}
