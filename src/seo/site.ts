/**
 * Single source of truth for public-page SEO: titles, descriptions, indexing policy,
 * JSON-LD, robots.txt, sitemap.xml and llms.txt. Used by the client (route meta on
 * navigation) and by scripts/prerender.mjs at build time.
 */

export const SITE_NAME = "Learn Mastro";
export const SITE_TAGLINE = "Smart Learning";
export const SITE_HEADLINE = "Smarter Learning With Learn Mastro";
export const SITE_SUMMARY = "Personalized learning, real-time support and progress that matters.";
export const SITE_LOGO = { path: "/favicon.png", width: 262, height: 246 };
export const SITE_FEATURES = [
  { label: "AI-Powered Tutoring", description: "Get instant help and explanations tailored to your needs." },
  { label: "Track Your Progress", description: "Monitor performance and improve with smart insights." },
  { label: "Safe & Secure", description: "Your data is protected with enterprise grade security." },
];
export const SITE_DESCRIPTION =
  "Learn Mastro (Smart Learning) is an AI tutor for school students, built by Forefold AI: personalized learning, real-time support and progress that matters.";
export const SITE_DETAILS =
  "Learn Mastro is an AI tutor for school students, built by Forefold AI. Students pick a subject and chapter, then ask questions by text, photo or voice and get step-by-step explanations based on the textbooks set up for their class. Teachers and schools use it to plan lessons, run classes and assignments, and follow student progress.";

export const ORG = {
  name: "Forefold AI",
  url: "https://forefoldai.com/",
  email: "contact@forefoldai.com",
  phone: "+91 83284 33976",
  tel: "+918328433976",
};

/** Canonical origin. VITE_SITE_URL overrides; set it to "" to drop canonical/og:url/sitemap/JSON-LD. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "https://learnmastro.com").trim().replace(/\/+$/, "");
const OG_IMAGE = { path: "/og-image.jpg", width: 1200, height: 800, alt: "Student studying with books — Learn Mastro" };

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  index: boolean;
  /** Link label in llms.txt. */
  label: string;
}

export const PAGES: PageMeta[] = [
  {
    // "/" only redirects into the app, and index.html is also the shell for every logged-in
    // route — so noindex here; it keeps title/OG tags for shared links.
    path: "/",
    label: "Home",
    title: "Smarter Learning With Learn Mastro | AI Tutor for Students",
    description:
      "Personalized learning, real-time support and progress that matters. Learn Mastro by Forefold AI gives students AI-powered tutoring with instant explanations and smart progress insights.",
    index: false,
  },
  {
    path: "/login",
    label: "Log in",
    title: "Learn Mastro – Smarter Learning With AI Tutoring | Log In",
    description:
      "Log in to Learn Mastro: personalized learning, real-time support and progress that matters. Get instant AI-powered help and track your progress with smart insights.",
    index: true,
  },
  {
    path: "/signup",
    label: "Sign up",
    title: "Sign Up | Learn Mastro – AI Tutor for Students",
    description:
      "Create a Learn Mastro account as a student, individual teacher or school and start learning with an AI tutor.",
    index: true,
  },
  {
    path: "/forgot-password",
    label: "Reset password",
    title: "Reset Password | Learn Mastro",
    description: "Reset the password for your Learn Mastro account.",
    index: false,
  },
];

export const findPage = (path: string) => PAGES.find((p) => p.path === path);
export const absUrl = (path: string) => `${SITE_URL}${path}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Keeps `</script>` inside values from closing the JSON-LD block. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export function jsonLd(page: PageMeta) {
  const orgId = `${ORG.url}#organization`;
  const siteId = `${SITE_URL}/#website`;
  const url = absUrl(page.path);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: ORG.name,
      url: ORG.url,
      email: ORG.email,
      telephone: ORG.phone,
      logo: { "@type": "ImageObject", url: absUrl(SITE_LOGO.path), width: SITE_LOGO.width, height: SITE_LOGO.height },
      contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: ORG.email, telephone: ORG.phone, areaServed: "IN" },
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      name: SITE_NAME,
      alternateName: ["LearnMastro", `${SITE_NAME} ${SITE_TAGLINE}`],
      headline: SITE_HEADLINE,
      description: SITE_SUMMARY,
      url: absUrl("/"),
      inLanguage: "en-IN",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: page.title,
      description: page.description,
      inLanguage: "en-IN",
      isPartOf: { "@id": siteId },
      about: { "@id": `${SITE_URL}/#app` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: absUrl("/"),
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      image: absUrl(SITE_LOGO.path),
      featureList: SITE_FEATURES.map((f) => `${f.label}: ${f.description}`),
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      publisher: { "@id": orgId },
    },
  ];
  return { "@context": "https://schema.org", "@graph": graph };
}

/** <head> tags for one page. Absolute-URL tags are skipped until VITE_SITE_URL is set. */
export function headTags(page: PageMeta): string {
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${page.index ? "index, follow" : "noindex"}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
  ];
  const google = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;
  const bing = import.meta.env.VITE_BING_SITE_VERIFICATION;
  if (google) tags.push(`<meta name="google-site-verification" content="${esc(google)}" />`);
  if (bing) tags.push(`<meta name="msvalidate.01" content="${esc(bing)}" />`);
  if (SITE_URL) {
    const img = absUrl(OG_IMAGE.path);
    tags.push(
      `<meta property="og:url" content="${absUrl(page.path)}" />`,
      `<meta property="og:image" content="${img}" />`,
      `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
      `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
      `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
      `<meta name="twitter:image" content="${img}" />`,
    );
    if (page.index) {
      tags.push(
        `<link rel="canonical" href="${absUrl(page.path)}" />`,
        `<script type="application/ld+json">${jsonLdString(jsonLd(page))}</script>`,
      );
    }
  }
  return tags.join("\n    ");
}

/** Client-side: keep title/description/robots/canonical in sync on SPA navigation. Unknown and private routes are noindex. */
export function applyRouteMeta(path: string) {
  const page = findPage(path);
  document.title = page?.title ?? SITE_NAME;
  const setMeta = (name: string, content: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };
  setMeta("description", page?.description ?? SITE_DESCRIPTION);
  setMeta("robots", page?.index ? "index, follow" : "noindex");
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (page?.index && SITE_URL) {
    const link = canonical ?? document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    link.href = absUrl(path);
  } else {
    canonical?.remove();
  }
}

export function sitemapXml(): string {
  // ponytail: one sitemap, no <lastmod> — no real per-page modification dates exist yet.
  // Split into a sitemap index only if public URLs ever approach 50,000.
  const urls = PAGES.filter((p) => p.index)
    .map((p) => `  <url><loc>${esc(absUrl(p.path))}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `# Learn Mastro robots.txt (generated at build time from src/seo/site.ts)
# App pages behind login are protected by authentication and send "noindex";
# robots.txt is not access control.
#
# Search engines: Googlebot, Bingbot (Bing results also feed Microsoft Copilot).
# AI search: OAI-SearchBot (ChatGPT search), PerplexityBot, Claude-SearchBot.
# User-initiated fetchers: ChatGPT-User, Claude-User, Perplexity-User.
# Model-training crawlers: GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended.
# All are currently allowed. To opt out of model training only, add a group:
#   User-agent: GPTBot
#   User-agent: ClaudeBot
#   User-agent: CCBot
#   User-agent: Google-Extended
#   User-agent: Applebot-Extended
#   Disallow: /

User-agent: *
Allow: /
${SITE_URL ? `\nSitemap: ${absUrl("/sitemap.xml")}\n` : ""}`;
}

export function llmsTxt(): string {
  const links = PAGES.filter((p) => p.index)
    .map((p) => `- [${p.label}](${absUrl(p.path)}): ${p.description}`)
    .join("\n");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_HEADLINE}. ${SITE_DETAILS}

## Features

${SITE_FEATURES.map((f) => `- ${f.label}: ${f.description}`).join("\n")}

${SITE_NAME} is a web app. The learning tools require an account; the pages below are public.
Provider: ${ORG.name} (${ORG.url}). Contact: ${ORG.email}, ${ORG.phone}.

## Public pages

${links}
`;
}
