export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id || null;
      }
      const id = u.searchParams.get("v");
      if (id) return id;
    }
  } catch {}
  return null;
}

export function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return url;
}

export function extractVKVideoId(url: string): { ownerId: string; videoId: string } | null {
  try {
    const u = new URL(url);
    // Поддержка vk.com, vkontakte.ru и vkvideo.ru
    if (u.hostname.includes("vk.com") || u.hostname.includes("vkontakte.ru") || u.hostname.includes("vkvideo.ru")) {
      // Формат: https://vk.com/video-123456789_123456789 или https://vk.com/video123456789_123456789
      // Формат: https://vkvideo.ru/video-123456789_123456789
      const match = u.pathname.match(/\/video(-?\d+)_(\d+)/);
      if (match) {
        return { ownerId: match[1], videoId: match[2] };
      }
      // Формат: https://vk.com/video?z=video-123456789_123456789
      const zParam = u.searchParams.get("z");
      if (zParam && zParam.startsWith("video")) {
        const match = zParam.match(/video(-?\d+)_(\d+)/);
        if (match) {
          return { ownerId: match[1], videoId: match[2] };
        }
      }
    }
  } catch {}
  return null;
}

export function toVKVideoEmbed(url: string): string | null {
  const vkVideo = extractVKVideoId(url);
  if (vkVideo) {
    // VK видео встраивается через video_ext.php
    // Формат: https://vk.com/video_ext.php?oid={ownerId}&id={videoId}
    // Для публичных видео можно использовать без hash
    return `https://vk.com/video_ext.php?oid=${vkVideo.ownerId}&id=${vkVideo.videoId}`;
  }
  return null;
}

/** Параметры официального кода встраивания Яндекс.Музыки (трек) */
export const YANDEX_MUSIC_IFRAME_HEIGHT_PX = 244;
export const YANDEX_MUSIC_IFRAME_MAX_WIDTH_PX = 614;

export type MusicKind =
  | { kind: "audio"; src: string }
  | { kind: "spotify"; src: string }
  | { kind: "soundcloud"; src: string }
  | { kind: "youtube"; src: string }
  /** Ссылка на music.yandex.ru/iframe/… — в карточке фиксированные размеры под виджет */
  | { kind: "yandex"; src: string }
  | { kind: "rawEmbed"; html: string };

function tryYandexSrcFromRawHtml(html: string): string | null {
  const m = html.match(/<iframe[^>]+src=(["'])(https?:\/\/[^"']*music\.yandex\.[^"']*)\1/i);
  return m && m[2] ? m[2] : null;
}

function findEmbedString(value: unknown, depth = 0): string | null {
  if (depth > 3 || value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEmbedString(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const prioritizedKeys = ["html", "iframe", "embed", "musicEmbed", "url", "src", "content"];
    for (const key of prioritizedKeys) {
      if (key in obj) {
        const found = findEmbedString(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const key of Object.keys(obj)) {
      if (prioritizedKeys.includes(key)) continue;
      const found = findEmbedString(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function normalizeMusicInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const looksLikeJson =
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""));

  if (!looksLikeJson) return input;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const extracted = findEmbedString(parsed);
    if (!extracted) return input;

    // Поддержка двойной сериализации: "\"<iframe ...>\""
    const nestedLooksLikeJson =
      extracted.startsWith("{") ||
      extracted.startsWith("[") ||
      (extracted.startsWith("\"") && extracted.endsWith("\""));
    if (nestedLooksLikeJson) {
      try {
        const nested = JSON.parse(extracted) as unknown;
        const nestedExtracted = findEmbedString(nested);
        return nestedExtracted || extracted;
      } catch {
        return extracted;
      }
    }
    return extracted;
  } catch {
    return input;
  }
}

export function classifyMusic(input: string): MusicKind {
  const normalizedInput = normalizeMusicInput(input);

  // Проверяем, является ли входная строка iframe от Yandex Music
  if (normalizedInput.includes("music.yandex.ru/iframe") || normalizedInput.includes("<iframe")) {
    // Если это уже готовый iframe HTML, очищаем sandbox атрибут и добавляем правильные allow атрибуты
    if (normalizedInput.trim().startsWith("<iframe")) {
      let cleanedHtml = normalizedInput;
      // Удаляем sandbox атрибут, если он есть (он может вызывать проблемы)
      cleanedHtml = cleanedHtml.replace(/\s*sandbox=["'][^"']*["']/gi, '');
      // Убеждаемся, что есть правильные allow атрибуты
      if (!cleanedHtml.includes('allow=')) {
        cleanedHtml = cleanedHtml.replace(/<iframe/i, '<iframe allow="clipboard-write; autoplay; encrypted-media"');
      } else {
        // Добавляем недостающие разрешения к существующему allow
        cleanedHtml = cleanedHtml.replace(/allow=["']([^"']*)["']/i, (_match, existing) => {
          const permissions = existing.split(';').map((p: string) => p.trim());
          if (!permissions.includes('clipboard-write')) permissions.push('clipboard-write');
          if (!permissions.includes('autoplay')) permissions.push('autoplay');
          if (!permissions.includes('encrypted-media')) permissions.push('encrypted-media');
          return `allow="${permissions.join('; ')}"`;
        });
      }
      const yx = tryYandexSrcFromRawHtml(cleanedHtml);
      if (yx) return { kind: "yandex", src: yx };
      return { kind: "rawEmbed", html: cleanedHtml };
    }
    try {
      const iframeMatch = normalizedInput.match(/src=["']([^"']+)["']/);
      if (iframeMatch?.[1] && iframeMatch[1].includes("music.yandex.")) {
        return { kind: "yandex", src: iframeMatch[1] };
      }
    } catch {}
  }

  try {
    const u = new URL(normalizedInput);
    const href = u.href.toLowerCase();

    if (/\.(mp3|ogg|wav)(\?|#|$)/i.test(href)) {
      return { kind: "audio", src: u.href };
    }
    if (u.hostname.includes("spotify.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const type = parts[0];
        const id = parts[1];
        return { kind: "spotify", src: `https://open.spotify.com/embed/${type}/${id}` };
      }
    }
    if (u.hostname.includes("soundcloud.com")) {
      const embed = `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}&auto_play=false&visual=false&show_teaser=false&hide_related=true`;
      return { kind: "soundcloud", src: embed };
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      return { kind: "youtube", src: toYouTubeEmbed(u.href) };
    }
    if (u.hostname.includes("music.yandex.ru")) {
      const pl = u.pathname.match(/\/users\/([^/]+)\/playlists\/(\d+)\/?$/i);
      if (pl) {
        return { kind: "yandex", src: `https://music.yandex.ru/iframe/playlist/${pl[1]}/${pl[2]}/` };
      }
      const trackMatch = u.pathname.match(/\/track\/(\d+)/);
      const albumMatch = u.pathname.match(/\/album\/(\d+)/);
      const trackIdFromQuery = u.searchParams.get("track") || u.searchParams.get("track_id");
      const albumIdFromQuery = u.searchParams.get("album") || u.searchParams.get("album_id");
      const trackId = trackMatch ? trackMatch[1] : trackIdFromQuery;
      const albumId = albumMatch ? albumMatch[1] : albumIdFromQuery;

      if (trackId) {
        const iframeSrc = albumId
          ? `https://music.yandex.ru/iframe/album/${albumId}/track/${trackId}`
          : `https://music.yandex.ru/iframe/#track/${trackId}`;
        return { kind: "yandex", src: iframeSrc };
      }
      if (u.pathname.includes("/iframe/") || u.pathname.includes("/iframe#") || u.pathname.includes("iframe")) {
        return { kind: "yandex", src: u.href };
      }
    }
    return { kind: "audio", src: u.href };
  } catch {
    if (normalizedInput.trim().startsWith("<iframe") || normalizedInput.includes("music.yandex.ru")) {
      const yx = tryYandexSrcFromRawHtml(normalizedInput);
      if (yx) return { kind: "yandex", src: yx };
      return { kind: "rawEmbed", html: normalizedInput };
    }
    return { kind: "rawEmbed", html: normalizedInput };
  }
}

export function osmEmbedUrl(lat: number, lng: number, _z = 14) {
  const bboxPad = 0.02;
  const left = lng - bboxPad;
  const right = lng + bboxPad;
  const top = lat + bboxPad;
  const bottom = lat - bboxPad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function osmLink(lat: number, lng: number, z = 14) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${z}/${lat}/${lng}`;
}

