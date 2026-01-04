import { Router } from "express";
import https from "https";
import http from "http";

const router = Router();

/**
 * GET /api/metadata?url=...
 * Получает метаданные (Open Graph) для ссылки
 */
router.get("/", async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "url_required" });
    }

    // Проверяем, что это валидный URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: "invalid_url" });
    }

    // Получаем HTML страницы
    const html = await fetchHtml(urlObj);
    
    // Парсим Open Graph метатеги
    const metadata = parseOpenGraph(html, urlObj.href);
    
    res.json(metadata);
  } catch (error: any) {
    console.error("[METADATA] Error:", error);
    res.status(500).json({ error: "failed_to_fetch_metadata", message: error.message });
  }
});

function fetchHtml(url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    
    // Специальные заголовки только для Instagram
    const isInstagram = url.hostname.includes('instagram.com');
    const isTelegram = url.hostname.includes('t.me') || url.hostname.includes('telegram.me');
    
    // Для Telegram используем простые заголовки (как было раньше)
    // Для Instagram - более полные заголовки
    const headers: any = isInstagram ? {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    } : {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers,
      timeout: isInstagram ? 15000 : 10000,
    };

    const req = client.get(options, (res) => {
      // Обрабатываем редиректы только для Instagram
      if (isInstagram && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
        const location = res.headers.location;
        if (location) {
          try {
            const redirectUrl = new URL(location, url.href);
            return fetchHtml(redirectUrl).then(resolve).catch(reject);
          } catch {
            reject(new Error(`Invalid redirect location: ${location}`));
            return;
          }
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
        // Увеличиваем лимит только для Instagram
        const maxSize = isInstagram ? 200000 : 100000;
        if (data.length > maxSize) {
          res.destroy();
          resolve(data);
        }
      });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function parseOpenGraph(html: string, url: string): {
  title?: string;
  description?: string;
  image?: string;
  url: string;
} {
  const result: any = { url };
  const isInstagram = url.includes('instagram.com');

  // Парсим Open Graph метатеги
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                        (isInstagram && html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i));
  const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                             (isInstagram && html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i));
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    (isInstagram && html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i));

  // Проверяем JSON-LD только для Instagram
  let jsonLdData: any = null;
  if (isInstagram) {
    try {
      const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        jsonLdData = JSON.parse(jsonLdMatch[1]);
      }
    } catch (e) {
      // Игнорируем ошибки парсинга JSON-LD
    }
  }

  // Fallback на обычные метатеги
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || ogTitleMatch;
  const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || ogDescriptionMatch;

  // Используем данные из JSON-LD для Instagram если есть
  if (isInstagram && jsonLdData) {
    if (jsonLdData.name || jsonLdData.headline) {
      result.title = (jsonLdData.name || jsonLdData.headline).trim();
    }
    if (jsonLdData.description) {
      result.description = jsonLdData.description.trim();
    }
    if (jsonLdData.image) {
      const imageUrl = typeof jsonLdData.image === 'string' 
        ? jsonLdData.image 
        : (jsonLdData.image.url || jsonLdData.image[0]?.url);
      if (imageUrl) {
        try {
          result.image = new URL(imageUrl, url).href;
        } catch {
          result.image = imageUrl;
        }
      }
    }
  }

  // Используем Open Graph если JSON-LD не дал результатов или для Telegram
  if (!result.title && titleMatch) {
    result.title = titleMatch[1].trim();
  }

  if (!result.description && descriptionMatch) {
    result.description = descriptionMatch[1].trim();
  }

  if (!result.image && ogImageMatch) {
    const imageUrl = ogImageMatch[1].trim();
    // Преобразуем относительные URL в абсолютные
    try {
      result.image = new URL(imageUrl, url).href;
    } catch {
      result.image = imageUrl;
    }
  }

  // Декодируем HTML entities только для Instagram (Telegram обычно не требует)
  if (isInstagram) {
    if (result.title) {
      result.title = result.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
    if (result.description) {
      result.description = result.description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
  }

  return result;
}

export default router;

