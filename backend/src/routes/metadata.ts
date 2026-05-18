import { Router } from "express";
import https from "https";
import http from "http";
import { spawn } from "child_process";

const router = Router();
const MAX_REDIRECTS = 5;

type OGResult = { title?: string; description?: string; image?: string; url: string };

/**
 * GET /api/metadata?url=...
 * Возвращает Open Graph / oEmbed / API данные для ссылки.
 * Стратегия: platform API/oEmbed → Node HTTP → curl fallback.
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

    const metadata = await resolveMetadata(urlObj);
    res.json(metadata);
  } catch (error: any) {
    console.error("[METADATA] Error:", error);
    res.status(500).json({ error: "failed_to_fetch_metadata", message: error.message });
  }
});

// ─── Platform dispatching ─────────────────────────────────────────────────────

async function resolveMetadata(url: URL): Promise<OGResult> {
  const h = url.hostname.replace(/^www\./, "").toLowerCase();

  try {
    if (h === "github.com") return await handleGitHub(url);
    if (h === "youtube.com" || h === "youtu.be") return await handleYouTubeOEmbed(url);
    if (h === "tiktok.com") return await handleTikTokOEmbed(url);
    if (h === "open.spotify.com") return await handleSpotifyOEmbed(url);
  } catch {
    // Fall through to HTML scraping
  }

  // HTML scraping: Node.js HTTP first, curl fallback for bot-protected sites
  const html = await fetchHtmlWithFallback(url);
  return parseOpenGraph(html, url.href);
}

// ─── Platform-specific handlers ───────────────────────────────────────────────

async function handleGitHub(url: URL): Promise<OGResult> {
  const segs = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

  if (segs.length === 1) {
    // User / org profile page
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

  // Repo or subpage: GitHub has great OG tags, use HTML scraping
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
    const MAX = 150_000;
    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > MAX) proc.kill();
    });
    proc.on("error", reject);
    proc.on("close", () => {
      if (output) resolve(output);
      else reject(new Error("curl: empty output"));
    });
  });
}

// ─── Node.js HTTP fetcher ─────────────────────────────────────────────────────

function buildHeaders(url: URL): Record<string, string> {
  const h = url.hostname.toLowerCase();

  if (h.includes("instagram.com")) {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    };
  }

  // Twitter/X: Twitterbot UA requests server-rendered OG
  if (h.includes("twitter.com") || h.includes("x.com")) {
    return {
      "User-Agent": "Twitterbot/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    };
  }

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
    const isInstagram = url.hostname.includes("instagram.com");
    const headers = buildHeaders(url);
    const requestPath = encodeURI(url.pathname) + url.search;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: requestPath,
      method: "GET",
      headers,
      timeout: isInstagram ? 15_000 : 10_000,
    };

    const req = client.get(options, (res) => {
      // Follow all common redirect codes
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
        const max = isInstagram ? 200_000 : 100_000;
        if (data.length > max) { res.destroy(); resolve(data); }
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
 * Extract content="" from a <meta> tag regardless of attribute order.
 * Handles any attributes between the target attribute and content=.
 */
function extractMetaContent(
  html: string,
  attrName: "property" | "name",
  attrValue: string
): string | null {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // attr then content
  let m = html.match(
    new RegExp(`<meta\\s[^>]*?${attrName}=["']${escaped}["'][^>]*?content=["']([^"']+)["'][^>]*?>`, "i")
  );
  if (m) return m[1].trim();

  // content then attr
  m = html.match(
    new RegExp(`<meta\\s[^>]*?content=["']([^"']+)["'][^>]*?${attrName}=["']${escaped}["'][^>]*?>`, "i")
  );
  if (m) return m[1].trim();

  return null;
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

function parseOpenGraph(html: string, url: string): OGResult {
  const result: OGResult = { url };
  if (!html) return result;

  const isInstagram = url.includes("instagram.com");

  // Instagram: try JSON-LD first (contains richer structured data)
  if (isInstagram) {
    try {
      const jsonLdMatch = html.match(
        /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i
      );
      if (jsonLdMatch) {
        const d = JSON.parse(jsonLdMatch[1]);
        if (d.name || d.headline) result.title = (d.name || d.headline).trim();
        if (d.description) result.description = d.description.trim();

        // Extract follower count from interactionStatistic
        const entity = d.mainEntity || d;
        const stats = entity.interactionStatistic;
        if (stats) {
          const arr = Array.isArray(stats) ? stats : [stats];
          const follow = arr.find(
            (s: any) =>
              s.interactionType === "http://schema.org/FollowAction" ||
              s.interactionType?.["@id"] === "http://schema.org/FollowAction"
          );
          if (follow && follow.userInteractionCount) {
            const count = parseInt(String(follow.userInteractionCount), 10);
            if (!isNaN(count)) result.description = `${formatCount(count)} followers`;
          }
        }

        if (d.image) {
          const imgUrl =
            typeof d.image === "string" ? d.image : d.image.url || d.image[0]?.url;
          if (imgUrl) {
            try { result.image = new URL(imgUrl, url).href; } catch { result.image = imgUrl; }
          }
        }
      }
    } catch {}
  }

  // Open Graph tags
  if (!result.title) result.title = extractMetaContent(html, "property", "og:title") ?? undefined;
  if (!result.description) result.description = extractMetaContent(html, "property", "og:description") ?? undefined;
  if (!result.image) {
    const img =
      extractMetaContent(html, "property", "og:image:secure_url") ??
      extractMetaContent(html, "property", "og:image");
    if (img) {
      try { result.image = new URL(img, url).href; } catch { result.image = img; }
    }
  }

  // Twitter Card fallback
  if (!result.title) result.title = extractMetaContent(html, "name", "twitter:title") ?? undefined;
  if (!result.description) result.description = extractMetaContent(html, "name", "twitter:description") ?? undefined;
  if (!result.image) {
    const img =
      extractMetaContent(html, "name", "twitter:image:src") ??
      extractMetaContent(html, "name", "twitter:image");
    if (img) {
      try { result.image = new URL(img, url).href; } catch { result.image = img; }
    }
  }

  // Standard HTML title / description fallback
  if (!result.title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) result.title = m[1].trim();
  }
  if (!result.description) {
    result.description = extractMetaContent(html, "name", "description") ?? undefined;
  }

  // Decode HTML entities universally
  if (result.title) result.title = decodeHtmlEntities(result.title);
  if (result.description) result.description = decodeHtmlEntities(result.description);

  return result;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default router;
