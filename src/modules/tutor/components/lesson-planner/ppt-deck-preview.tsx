import { cn } from "@/lib/utils";
import type { PptSlide } from "@/modules/tutor/types/lesson-planner";

const THEME_PRESETS: Record<
  string,
  { bg: string; surface: string; primary: string; accent: string; text: string; muted: string; onPrimary: string }
> = {
  clean_academic: {
    bg: "#f8fafc",
    surface: "#ffffff",
    primary: "#1e40af",
    accent: "#0ea5e9",
    text: "#0f172a",
    muted: "#475569",
    onPrimary: "#ffffff",
  },
  bright_classroom: {
    bg: "#fffbeb",
    surface: "#ffffff",
    primary: "#d97706",
    accent: "#ea580c",
    text: "#431407",
    muted: "#78350f",
    onPrimary: "#ffffff",
  },
  stem_focus: {
    bg: "#0f172a",
    surface: "#1e293b",
    primary: "#2dd4bf",
    accent: "#38bdf8",
    text: "#f1f5f9",
    muted: "#94a3b8",
    onPrimary: "#0f172a",
  },
  soft_story: {
    bg: "#faf5f0",
    surface: "#ffffff",
    primary: "#78350f",
    accent: "#b45309",
    text: "#292524",
    muted: "#57534e",
    onPrimary: "#ffffff",
  },
};

function themeOf(id?: string) {
  return THEME_PRESETS[id || ""] || THEME_PRESETS.clean_academic;
}

export function PptDeckPreview({
  slides,
  templateId,
}: {
  slides: PptSlide[];
  templateId?: string;
}) {
  const theme = themeOf(templateId);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Live preview (theme: {templateId || "clean_academic"}) — download PPTX for the final deck.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {slides.map((slide) => (
          <article
            key={slide.number}
            className="overflow-hidden rounded-lg border border-border/60 shadow-sm"
            style={{ background: theme.bg, color: theme.text }}
          >
            <div className="flex h-1.5 w-full" style={{ background: theme.primary }} />
            <div className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: theme.primary, color: theme.onPrimary }}
                >
                  {slide.layout || "slide"} {slide.number}
                </span>
                {slide.icon ? (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: theme.accent, color: theme.onPrimary }}
                  >
                    {slide.icon}
                  </span>
                ) : null}
                {slide.sideHeading ? (
                  <span className="text-[10px] font-semibold uppercase" style={{ color: theme.accent }}>
                    {slide.sideHeading}
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold leading-snug">{slide.title}</h3>
              {slide.layout === "two_column" ? (
                <div className="grid grid-cols-2 gap-2">
                  <ul
                    className="space-y-1 rounded-md p-2 text-[11px] leading-snug"
                    style={{ background: theme.surface, color: theme.muted }}
                  >
                    {(slide.bullets || []).slice(0, 4).map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                  <ul
                    className="space-y-1 rounded-md p-2 text-[11px] leading-snug"
                    style={{ background: theme.surface, color: theme.muted }}
                  >
                    {(slide.rightBullets?.length
                      ? slide.rightBullets
                      : slide.bullets.slice(Math.ceil(slide.bullets.length / 2))
                    )
                      .slice(0, 4)
                      .map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                  </ul>
                </div>
              ) : (
                <ul
                  className={cn("space-y-1 rounded-md p-2 text-[11px] leading-snug")}
                  style={{ background: theme.surface, color: theme.muted }}
                >
                  {(slide.bullets || []).slice(0, 5).map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              )}
              {slide.callout ? (
                <p
                  className="rounded-md border-l-2 px-2 py-1 text-[11px] font-medium"
                  style={{ borderColor: theme.accent, background: theme.surface }}
                >
                  Remember: {slide.callout}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
