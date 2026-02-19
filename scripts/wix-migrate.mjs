#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "https://pghwarriorhockey.org";
const MAX_PAGES = 200;
const PAGE_FETCH_DELAY_MS = 150;
const BLOCKED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".zip",
  ".mp4",
  ".mp3"
];
const COMMON_WARRIORS_PATHS = [
  "/about",
  "/leadership",
  "/wall-of-champions",
  "/roster",
  "/galleries",
  "/dvhl",
  "/dvhl-champions",
  "/registration",
  "/events",
  "/news",
  "/partners",
  "/donor-list",
  "/store",
  "/donate",
  "/contact"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function allMatches(text, regex) {
  const out = [];
  let match;
  const re = new RegExp(regex.source, regex.flags);
  while ((match = re.exec(text)) !== null) {
    out.push(match[1].trim());
  }
  return out;
}

function normalizeUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function parseSitemapLocs(xml) {
  const locs = allMatches(xml, /<loc>(.*?)<\/loc>/gims);
  return Array.from(new Set(locs));
}

function isLikelyHtmlPage(url) {
  const lower = url.toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("javascript:")) {
    return false;
  }
  if (BLOCKED_FILE_EXTENSIONS.some((ext) => lower.includes(ext))) {
    return false;
  }
  return true;
}

function extractInternalLinks(baseUrl, html) {
  const origin = new URL(baseUrl).origin;
  const hrefs = allMatches(html, /<a[^>]*href=["'](.*?)["'][^>]*>/gims);
  const urls = new Set();
  for (const href of hrefs) {
    const resolved = normalizeUrl(baseUrl, href);
    if (!resolved) {
      continue;
    }
    if (!resolved.startsWith(origin)) {
      continue;
    }
    const clean = resolved.split("#")[0];
    if (!isLikelyHtmlPage(clean)) {
      continue;
    }
    urls.add(clean);
  }
  return Array.from(urls);
}

function extractPotentialWixPaths(baseUrl, html) {
  const patterns = [
    /"uriSEO":"([^"]+)"/gims,
    /"href":"(\/[^"]+)"/gims,
    /"relativeUrl":"(\/[^"]+)"/gims,
    /"link":"(\/[^"]+)"/gims
  ];

  const collected = new Set();
  for (const pattern of patterns) {
    for (const raw of allMatches(html, pattern)) {
      if (!raw.startsWith("/")) {
        continue;
      }
      if (!isLikelyHtmlPage(raw)) {
        continue;
      }
      collected.add(raw);
    }
  }

  for (const pathName of COMMON_WARRIORS_PATHS) {
    collected.add(pathName);
  }

  return Array.from(collected)
    .map((entry) => normalizeUrl(baseUrl, entry))
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; WarriorsMigrationBot/1.0; +https://pghwarriorhockey.us)"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }
  return response.text();
}

function buildBaseUrlCandidates(baseUrl) {
  const parsed = new URL(baseUrl);
  const host = parsed.hostname.replace(/^www\./i, "");
  return Array.from(
    new Set([
      `https://${host}`,
      `https://www.${host}`,
      `http://${host}`,
      `http://www.${host}`
    ])
  );
}

async function resolveReachableBaseUrl(inputBaseUrl) {
  const candidates = buildBaseUrlCandidates(inputBaseUrl);
  for (const candidate of candidates) {
    try {
      await fetchText(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return inputBaseUrl;
}

async function collectUrlsFromSitemaps(baseUrl) {
  const candidates = new Set([`${baseUrl}/sitemap.xml`]);

  try {
    const robots = await fetchText(`${baseUrl}/robots.txt`);
    for (const line of robots.split(/\r?\n/)) {
      if (line.toLowerCase().startsWith("sitemap:")) {
        const value = line.slice(line.indexOf(":") + 1).trim();
        if (value) {
          candidates.add(value);
        }
      }
    }
  } catch {
    // robots may not be available; continue with defaults.
  }

  const urls = new Set([baseUrl]);
  const sitemapQueue = Array.from(candidates);
  const seenSitemaps = new Set();
  const origin = new URL(baseUrl).origin;

  while (sitemapQueue.length > 0) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) {
      continue;
    }
    seenSitemaps.add(sitemapUrl);

    try {
      const xml = await fetchText(sitemapUrl);
      const locs = parseSitemapLocs(xml);
      for (const loc of locs) {
        const resolved = normalizeUrl(baseUrl, loc);
        if (!resolved) {
          continue;
        }
        if (!resolved.startsWith(origin)) {
          continue;
        }
        if (resolved.endsWith(".xml")) {
          sitemapQueue.push(resolved);
        } else {
          urls.add(resolved.split("#")[0]);
        }
      }
    } catch {
      // Skip invalid/unavailable sitemaps.
    }
  }

  return Array.from(urls).slice(0, MAX_PAGES);
}

function extractPageData(url, html) {
  const title = firstMatch(html, /<title[^>]*>(.*?)<\/title>/ims);
  const description = firstMatch(
    html,
    /<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["'][^>]*>/ims
  );
  const h1s = allMatches(html, /<h1[^>]*>(.*?)<\/h1>/gims).map(stripTags).filter(Boolean);
  const headings = allMatches(html, /<h2[^>]*>(.*?)<\/h2>/gims).map(stripTags).filter(Boolean);
  const paragraphs = allMatches(html, /<p[^>]*>(.*?)<\/p>/gims)
    .map(stripTags)
    .filter(Boolean)
    .slice(0, 25);
  const imageSrcs = allMatches(html, /<img[^>]*src=["'](.*?)["'][^>]*>/gims)
    .map((src) => normalizeUrl(url, src))
    .filter(Boolean);

  return {
    url,
    title,
    description,
    h1s,
    headings,
    paragraphs,
    imageSrcs: Array.from(new Set(imageSrcs))
  };
}

async function main() {
  const requestedBaseUrl = (process.argv[2] || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const baseUrl = (await resolveReachableBaseUrl(requestedBaseUrl)).replace(/\/+$/, "");
  const outputRoot = path.join(process.cwd(), "migration", "wix");
  const htmlDir = path.join(outputRoot, "html");

  await fs.mkdir(htmlDir, { recursive: true });

  console.log(`Collecting sitemap URLs from ${baseUrl} ...`);
  const sitemapUrls = await collectUrlsFromSitemaps(baseUrl);
  let seedUrls = [...sitemapUrls];
  try {
    const homeHtml = await fetchText(baseUrl);
    const discovered = extractPotentialWixPaths(baseUrl, homeHtml);
    seedUrls = Array.from(new Set([...seedUrls, ...discovered]));
  } catch {
    // Continue with sitemap seeds only.
  }
  console.log(`Found ${seedUrls.length} initial candidate pages.`);

  const pages = [];
  const failed = [];
  const seen = new Set();
  const queue = [...seedUrls];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    try {
      const html = await fetchText(url);
      const page = extractPageData(url, html);
      pages.push(page);

      const pathname = new URL(url).pathname || "/";
      const fileKey = sanitizeFileName(pathname === "/" ? "home" : pathname);
      await fs.writeFile(path.join(htmlDir, `${fileKey}.html`), html, "utf-8");

      const links = extractInternalLinks(baseUrl, html);
      for (const link of links) {
        if (!seen.has(link) && !queue.includes(link) && queue.length + pages.length < MAX_PAGES * 2) {
          queue.push(link);
        }
      }

      console.log(`[saved ${pages.length}] ${url}`);
    } catch (error) {
      failed.push({ url, error: error instanceof Error ? error.message : "unknown error" });
      console.log(`[failed ${failed.length}] ${url}`);
    }
    await sleep(PAGE_FETCH_DELAY_MS);
  }

  const uniqueImages = Array.from(new Set(pages.flatMap((page) => page.imageSrcs)));
  const out = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    failedCount: failed.length,
    imageCount: uniqueImages.length,
    pages,
    failed,
    images: uniqueImages
  };

  await fs.writeFile(path.join(outputRoot, "pages.json"), JSON.stringify(out, null, 2), "utf-8");
  await fs.writeFile(path.join(outputRoot, "images.txt"), uniqueImages.join("\n"), "utf-8");

  console.log("Migration crawl complete.");
  console.log(`Pages: ${pages.length}, Failed: ${failed.length}, Images: ${uniqueImages.length}`);
  console.log(`Output written to ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
