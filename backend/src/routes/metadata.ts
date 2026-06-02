import { Router } from "express";
import https from "https";
import http from "http";
import { spawn } from "child_process";
import ogs from "open-graph-scraper";

const router = Router();
const MAX_REDIRECTS = 5;
// Some platforms (notably YouTube) inline huge JSON blobs in <head> before the
// OG meta tags — YouTube's og:image sits ~630KB into the document. A small cap
// silently drops those tags, so we read up to ~1.2MB before giving up.
const MAX_HTML_BYTES = 1_200_000;

type OGResult = { title?: string; description?: string; image?: string; url: string };

// ─── In-memory cache (1 hour TTL) ────────────────────────────────────────────

interface CacheEntry { data: OGResult; expiresAt: number; }
const metaCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3_600_000;

function getCached(url: string): OGResult | null {
  const entry = metaCache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { metaCache.delete(url); return null; }
  return entry.data;
}

function setCached(url: string, data: OGResult): void {
  metaCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
  // Evict oldest entries when cache grows too large
  if (metaCache.size > 500) {
    const firstKey = metaCache.keys().next().value;
    if (firstKey) metaCache.delete(firstKey);
  }
}

/**
 * GET /api/metadata?url=...
 * Возвращает Open Graph / oEmbed / API данные для ссылки.
 * Стратегия: cache → platform API/oEmbed → ogs parser → curl fallback.
 */
router.get("/", async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url_required" });

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: "invalid_url" });
    }

    const cached = getCached(url);
    if (cached) return res.json(cached);

    const metadata = normalizeResult(await resolveMetadata(urlObj));
    setCached(url, metadata);
    res.json(metadata);
  } catch (error: any) {
    console.error("[METADATA] Error:", error);
    res.status(500).json({ error: "failed_to_fetch_metadata", message: error.message });
  }
});

// ─── Result normalization ─────────────────────────────────────────────────────

// Generic share placeholders served by sites that don't expose a real avatar/preview.
// These would otherwise render as a misleading "avatar" on social cards.
const JUNK_IMAGE_RE =
  /default_open_graph|og[-_]?default|default[-_]?(og|share|image|preview)|share[-_]?default|placeholder|\/user\/default|default_\d+\.(png|jpe?g)/i;

// Generic page titles that carry no useful identity (the real username from the
// URL is more informative, so drop these and let the client fall back to it).
const JUNK_TITLE_RE = /^(tiktok - make your day|pinterest|instagram|вконтакте|vk)$/i;

function normalizeResult(r: OGResult): OGResult {
  if (r.image && JUNK_IMAGE_RE.test(r.image)) delete r.image;
  if (r.title && JUNK_TITLE_RE.test(r.title.trim())) delete r.title;
  return r;
}

// ─── Platform dispatching ─────────────────────────────────────────────────────

// Platforms that actively block unauthenticated scraping — skip immediately.
const NO_SCRAPE_HOSTS = new Set([
  "instagram.com", "vk.com", "twitter.com", "x.com",
  "facebook.com", "fb.com",
]);

async function resolveMetadata(url: URL): Promise<OGResult> {
  const h = url.hostname.replace(/^www\./, "").toLowerCase();

  // Fast-fail for platforms that always block or redirect to login
  if (NO_SCRAPE_HOSTS.has(h)) return { url: url.href };

  try {
    if (h === "github.com") return await handleGitHub(url);
    if (h === "youtube.com" || h === "youtu.be") return await handleYouTubeOEmbed(url);
    if (h === "tiktok.com") return await handleTikTokOEmbed(url);
    if (h === "open.spotify.com") return await handleSpotifyOEmbed(url);
    if (h === "pinterest.com" || h.endsWith(".pinterest.com")) return await handlePinterest(url);
  } catch {
    // Fall through to HTML scraping
  }

  const html = await fetchHtmlWithFallback(url);

  // Use open-graph-scraper as primary HTML parser, regex as fallback
  return await parseWithOgs(html, url.href);
}

// ─── Platform-specific handlers ───────────────────────────────────────────────

async function handleGitHub(url: URL): Promise<OGResult> {
  const segs = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

  if (segs.length === 1) {
    const data = await fetchJson("https://api.github.com/users/" + segs[0], {
      "User-Agent": "Vizitka/1.0",
      Accept: "application/vnd.github.v3+json",
    });
    const parts: string[] = [];
    if (data.bio) parts.push(data.bio);
    if (data.followers > 0) parts.push(`${formatCount(data.followers)} followers`);
    return {
      title: data.name || data.login,
      description: parts.join(" · ") || undefined,
      image: data.avatar_url,
      url: url.href,
    };
  }

  throw new Error("github repo: use HTML");
}

async function handleYouTubeOEmbed(url: URL): Promise<OGResult> {
  const data = await fetchJson(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url.href)}&format=json`
  );
  return {
    title: data.title,
    description: data.author_name,
    image: data.thumbnail_url,
    url: url.href,
  };
}

async function handleTikTokOEmbed(url: URL): Promise<OGResult> {
  const data = await fetchJson(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.href)}`
  );
  if (data.embed_type === "profile") {
    return { title: data.author_name || data.title, url: url.href };
  }
  return {
    title: data.author_name,
    description: data.title,
    image: data.thumbnail_url,
    url: url.href,
  };
}

async function handleSpotifyOEmbed(url: URL): Promise<OGResult> {
  const data = await fetchJson(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url.href)}`
  );
  return {
    title: data.title,
    image: data.thumbnail_url,
    url: url.href,
  };
}

/**
 * Pinterest profiles serve a generic placeholder as og:image, but the real
 * avatar + display name live in the inline __PWS_DATA__ JSON. We pull those out
 * directly; the placeholder/default avatar is dropped later by normalizeResult.
 */
async function handlePinterest(url: URL): Promise<OGResult> {
  const html = await fetchHtmlWithFallback(url);
  const result: OGResult = { url: url.href };

  const handle = url.pathname.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase();
  const owner = handle ? findPinterestOwner(html, handle) : null;
  if (owner?.full_name) result.title = owner.full_name.trim();
  if (owner?.image) result.image = owner.image;

  const ogDesc = extractMetaContent(html, "property", "og:description");
  if (ogDesc) {
    let bio = decodeHtmlEntities(ogDesc).trim();
    // og:description is formatted "<name> | <bio>" — strip the redundant prefix
    if (result.title) {
      const re = new RegExp(`^${result.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|\\s*`, "i");
      bio = bio.replace(re, "").trim();
    }
    if (bio) result.description = bio;
  }

  // Extraction failed (markup changed?) — fall back to generic OG parsing.
  if (!result.title && !result.image && !result.description) {
    return parseWithOgs(html, url.href);
  }
  return result;
}

/**
 * Pulls the profile owner's name + avatar out of Pinterest's inline JSON.
 * Anchors on the owner's own `"username":"<handle>"` so we don't accidentally
 * grab an avatar from the "related profiles" blocks elsewhere on the page.
 */
function findPinterestOwner(html: string, handle: string): { full_name?: string; image?: string } | null {
  const esc = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const anchor = html.match(new RegExp(`"username":"${esc}"`, "i"));
  if (!anchor || anchor.index === undefined) return null;

  // Pinterest's inline JSON ships in non-deterministic fragment order: the
  // owner's name/avatar fields can sit just before OR just after the username
  // within the same object. Take a symmetric window and pick the field whose
  // position is closest to the username anchor so we grab the owner's own data
  // and not a neighbouring pin's.
  const anchorIdx = anchor.index;
  const winStart = Math.max(0, anchorIdx - 2500);
  const win = html.slice(winStart, anchorIdx + 2500);
  const rel = anchorIdx - winStart;

  const closest = (re: RegExp): string | undefined => {
    let best: { value: string; dist: number } | null = null;
    for (const m of win.matchAll(re)) {
      const dist = Math.abs((m.index ?? 0) - rel);
      if (!best || dist < best.dist) best = { value: m[1], dist };
    }
    return best ? decodeJsonStringLiteral(best.value) : undefined;
  };

  const out: { full_name?: string; image?: string } = {};
  const fullName = closest(/"full_name":"((?:[^"\\]|\\.)*)"/g);
  if (fullName) out.full_name = fullName;

  const image = closest(/"image_(?:xlarge|large|medium)_url":"((?:[^"\\]|\\.)*)"/g);
  if (image) {
    // Upscale the small responsive avatar to a crisper 280px variant.
    out.image = image.replace(/\/\d+x\d*(_RS)?\//, "/280x280_RS/");
  }
  return out;
}

/** Decodes a raw JSON string body (handles \\uXXXX and escaped chars). */
function decodeJsonStringLiteral(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

// ─── HTML fetching with curl fallback ─────────────────────────────────────────

async function fetchHtmlWithFallback(url: URL): Promise<string> {
  let html = "";

  try {
    html = await fetchHtml(url, 0);
  } catch {
    // Will try curl below
  }

  if (!html || isBotChallengePage(html)) {
    try {
      html = await fetchHtmlWithCurl(url.href);
    } catch {
      // Both methods failed; return empty
    }
  }

  return html;
}

/**
 * Detect known bot-challenge pages (Cloudflare, DDoS-Guard, JS-only shells).
 * When detected, curl (different TLS fingerprint) is used as fallback.
 */
function isBotChallengePage(html: string): boolean {
  if (html.length < 512) return true;
  const head = html.slice(0, 4_000).toLowerCase();
  return (
    head.includes("just a moment") ||
    head.includes("_cf_chl_") ||
    head.includes("ddos-guard") ||
    head.includes("enable javascript and cookies") ||
    head.includes("checking your browser")
  );
}

/**
 * Fetch page HTML using system curl.
 * curl has a different TLS fingerprint than Node.js, which bypasses
 * some bot-protection layers that fingerprint the TLS handshake.
 */
function fetchHtmlWithCurl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("curl", [
      "-sL",
      "--max-time", "10",
      "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "-H", "Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      "-H", "Accept-Encoding: identity",
      url,
    ]);

    let output = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > MAX_HTML_BYTES) proc.kill();
    });
    proc.on("error", reject);
    proc.on("close", () => {
      if (output) resolve(output);
      else reject(new Error("curl: empty output"));
    });
  });
}

// ─── Node.js HTTP fetcher ─────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    "Accept-Encoding": "identity",
  };
}

function fetchHtml(url: URL, redirectCount: number): Promise<string> {
  if (redirectCount > MAX_REDIRECTS) return Promise.reject(new Error("Too many redirects"));

  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const headers = buildHeaders();
    const requestPath = encodeURI(url.pathname) + url.search;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: requestPath,
      method: "GET",
      headers,
      timeout: 10_000,
    };

    const req = client.get(options, (res) => {
      if (
        res.statusCode === 301 ||
        res.statusCode === 302 ||
        res.statusCode === 303 ||
        res.statusCode === 307 ||
        res.statusCode === 308
      ) {
        const location = res.headers.location;
        if (location) {
          try {
            res.resume();
            return fetchHtml(new URL(location, url.href), redirectCount + 1)
              .then(resolve)
              .catch(reject);
          } catch {
            reject(new Error(`Invalid redirect: ${location}`));
            return;
          }
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
        if (data.length > MAX_HTML_BYTES) { res.destroy(); resolve(data); }
      });
      res.on("end", () => resolve(data));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ─── JSON API helper ──────────────────────────────────────────────────────────

function fetchJson(apiUrl: string, extraHeaders?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(apiUrl);
    const client = u.protocol === "https:" ? https : http;
    const req = client.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        headers: {
          "User-Agent": "Vizitka/1.0",
          Accept: "application/json",
          "Accept-Encoding": "identity",
          ...extraHeaders,
        },
        timeout: 8_000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error("Invalid JSON")); }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ─── OG parsing ──────────────────────────────────────────────────────────────

/**
 * Parse OG/Twitter Card metadata using open-graph-scraper (cheerio-based).
 * Falls back to regex parsing if ogs fails or returns no data.
 */
async function parseWithOgs(html: string, baseUrl: string): Promise<OGResult> {
  if (!html) return { url: baseUrl };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { result, error } = await ogs({ html } as any);
    if (!error && result) {
      const r: OGResult = { url: baseUrl };

      r.title = result.ogTitle || result.twitterTitle || undefined;
      r.description = result.ogDescription || result.twitterDescription || undefined;

      // ogImage can be string, single object, or array
      const imgs = result.ogImage;
      let imgUrl: string | undefined;
      if (typeof imgs === "string") {
        imgUrl = imgs;
      } else if (Array.isArray(imgs) && imgs.length > 0) {
        imgUrl = imgs[0].url;
      } else if (imgs && typeof imgs === "object" && "url" in imgs) {
        imgUrl = (imgs as { url: string }).url;
      }

      // Fallback to twitterImage
      if (!imgUrl) {
        const tw = result.twitterImage;
        if (typeof tw === "string") imgUrl = tw;
        else if (Array.isArray(tw) && tw.length > 0) imgUrl = (tw[0] as any).url;
        else if (tw && typeof tw === "object" && "url" in tw) imgUrl = (tw as any).url;
      }

      if (imgUrl) {
        try { r.image = new URL(imgUrl, baseUrl).href; } catch { r.image = imgUrl; }
      }

      // Decode entities and strip leftover HTML tags
      if (r.title) r.title = decodeHtmlEntities(r.title.replace(/<[^>]+>/g, "").trim());
      if (r.description) r.description = decodeHtmlEntities(r.description.replace(/<[^>]+>/g, "").trim());

      // Only fall back to regex if ogs found nothing at all
      if (r.title || r.description || r.image) return r;
    }
  } catch {
    // ogs threw — fall through to regex
  }

  return parseOpenGraph(html, baseUrl);
}

/**
 * Regex-based OG parser — used as fallback when ogs fails.
 * Handles attribute-order variations and Twitter Card tags.
 */
function extractMetaContent(
  html: string,
  attrName: "property" | "name",
  attrValue: string
): string | null {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let m = html.match(
    new RegExp(`<meta\\s[^>]*?${attrName}=["']${escaped}["'][^>]*?content=["']([^"']+)["'][^>]*?>`, "i")
  );
  if (m) return m[1].trim();

  m = html.match(
    new RegExp(`<meta\\s[^>]*?content=["']([^"']+)["'][^>]*?${attrName}=["']${escaped}["'][^>]*?>`, "i")
  );
  if (m) return m[1].trim();

  return null;
}

function parseOpenGraph(html: string, url: string): OGResult {
  const result: OGResult = { url };
  if (!html) return result;

  result.title = extractMetaContent(html, "property", "og:title") ?? undefined;
  result.description = extractMetaContent(html, "property", "og:description") ?? undefined;

  const img =
    extractMetaContent(html, "property", "og:image:secure_url") ??
    extractMetaContent(html, "property", "og:image");
  if (img) {
    try { result.image = new URL(img, url).href; } catch { result.image = img; }
  }

  if (!result.title) result.title = extractMetaContent(html, "name", "twitter:title") ?? undefined;
  if (!result.description) result.description = extractMetaContent(html, "name", "twitter:description") ?? undefined;
  if (!result.image) {
    const twImg =
      extractMetaContent(html, "name", "twitter:image:src") ??
      extractMetaContent(html, "name", "twitter:image");
    if (twImg) {
      try { result.image = new URL(twImg, url).href; } catch { result.image = twImg; }
    }
  }

  if (!result.title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) result.title = m[1].trim();
  }
  if (!result.description) {
    result.description = extractMetaContent(html, "name", "description") ?? undefined;
  }

  if (result.title) result.title = decodeHtmlEntities(result.title);
  if (result.description) result.description = decodeHtmlEntities(result.description);

  return result;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default router;
