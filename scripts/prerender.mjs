// Runs after `vite build` + `vite build --ssr src/seo/site.ts --outDir dist-ssr`.
// Writes per-route HTML (same app shell, route-specific <head>) plus robots.txt,
// sitemap.xml and llms.txt, and fails the build if SEO invariants break.
import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { PAGES, SITE_URL, headTags, llmsTxt, robotsTxt, sitemapXml } from "../dist-ssr/site.js";

const dist = new URL("../dist/", import.meta.url);
const template = readFileSync(new URL("index.html", dist), "utf8");
assert(template.includes("<!--seo-head-->"), "index.html is missing <!--seo-head-->");

const seen = new Set();
for (const page of PAGES) {
  for (const key of [page.title, page.description]) {
    assert(!seen.has(key), `duplicate title/description: ${key}`);
    seen.add(key);
  }
  const head = headTags(page);
  for (const [, json] of head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(json);
  if (page.index) assert(!head.includes("noindex"), `${page.path} is indexable but has noindex`);

  const html = template.replace(/<title>.*?<\/title>/s, "").replace("<!--seo-head-->", head);
  // Flat login.html (not login/index.html): served at /login by the Caddyfile, Netlify and Vercel cleanUrls.
  writeFileSync(new URL(page.path === "/" ? "index.html" : `.${page.path}.html`, dist), html);
}

writeFileSync(new URL("robots.txt", dist), robotsTxt());
writeFileSync(new URL("llms.txt", dist), llmsTxt());
if (SITE_URL) {
  assert(/^https:\/\/[^/]+$/.test(SITE_URL), `VITE_SITE_URL must be an https origin, got ${SITE_URL}`);
  writeFileSync(new URL("sitemap.xml", dist), sitemapXml());
} else {
  console.warn("[prerender] VITE_SITE_URL is empty: skipped sitemap.xml, canonical URLs, og:url/og:image and JSON-LD.");
}
rmSync(new URL("../dist-ssr/", import.meta.url), { recursive: true, force: true });
console.log(`[prerender] wrote ${PAGES.length} pages, robots.txt, llms.txt${SITE_URL ? ", sitemap.xml" : ""}`);
