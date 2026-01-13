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
    if (u.hostname.includes("vk.com") || u.hostname.includes("vkontakte.ru")) {
      // Формат: https://vk.com/video-123456789_123456789 или https://vk.com/video123456789_123456789
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
    return `https://vk.com/video_ext.php?oid=${vkVideo.ownerId}&id=${vkVideo.videoId}&hash=`;
  }
  return null;
}

export type MusicKind =
  | { kind: "audio"; src: string }
  | { kind: "spotify"; src: string }
  | { kind: "soundcloud"; src: string }
  | { kind: "youtube"; src: string }
  | { kind: "rawEmbed"; html: string };

export function classifyMusic(input: string): MusicKind {
  // Проверяем, является ли входная строка iframe от Yandex Music
  if (input.includes("music.yandex.ru/iframe") || input.includes("<iframe")) {
    // Если это уже готовый iframe HTML, очищаем sandbox атрибут и добавляем правильные allow атрибуты
    if (input.trim().startsWith("<iframe")) {
      let cleanedHtml = input;
      // Удаляем sandbox атрибут, если он есть (он может вызывать проблемы)
      cleanedHtml = cleanedHtml.replace(/\s*sandbox=["'][^"']*["']/gi, '');
      // Убеждаемся, что есть правильные allow атрибуты
      if (!cleanedHtml.includes('allow=')) {
        cleanedHtml = cleanedHtml.replace(/<iframe/i, '<iframe allow="clipboard-write; autoplay; encrypted-media"');
      } else {
        // Добавляем недостающие разрешения к существующему allow
        cleanedHtml = cleanedHtml.replace(/allow=["']([^"']*)["']/i, (match, existing) => {
          const permissions = existing.split(';').map((p: string) => p.trim());
          if (!permissions.includes('clipboard-write')) permissions.push('clipboard-write');
          if (!permissions.includes('autoplay')) permissions.push('autoplay');
          if (!permissions.includes('encrypted-media')) permissions.push('encrypted-media');
          return `allow="${permissions.join('; ')}"`;
        });
      }
      return { kind: "rawEmbed", html: cleanedHtml };
    }
    // Если это URL iframe, извлекаем src
    try {
      const iframeMatch = input.match(/src=["']([^"']+)["']/);
      if (iframeMatch && iframeMatch[1]) {
        const iframeSrc = iframeMatch[1];
        // Создаем полный iframe с правильными атрибутами для Yandex Music
        const iframeHtml = `<iframe frameborder="0" allow="clipboard-write; autoplay; encrypted-media" style="border:none;width:100%;height:244px;max-width:614px;" width="100%" height="244" src="${iframeSrc}"></iframe>`;
        return { kind: "rawEmbed", html: iframeHtml };
      }
    } catch {}
  }

  try {
    const u = new URL(input);
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
      // Обработка ссылок Yandex Music - извлекаем album ID и track ID
      const trackMatch = u.pathname.match(/\/track\/(\d+)/);
      const albumMatch = u.pathname.match(/\/album\/(\d+)/);
      
      // Также проверяем query параметры на случай, если ID переданы через них
      const trackIdFromQuery = u.searchParams.get("track") || u.searchParams.get("track_id");
      const albumIdFromQuery = u.searchParams.get("album") || u.searchParams.get("album_id");
      
      const trackId = trackMatch ? trackMatch[1] : trackIdFromQuery;
      const albumId = albumMatch ? albumMatch[1] : albumIdFromQuery;
      
      if (trackId) {
        let iframeSrc: string;
        
        if (albumId) {
          // Если есть album ID, используем предпочтительный формат
          iframeSrc = `https://music.yandex.ru/iframe/album/${albumId}/track/${trackId}`;
        } else {
          // Если нет album ID, используем альтернативный формат (может не работать для всех треков)
          // Пользователю рекомендуется использовать ссылку с album ID
          iframeSrc = `https://music.yandex.ru/iframe/#track/${trackId}`;
        }
        
        const iframeHtml = `<iframe frameborder="0" allow="clipboard-write; autoplay; encrypted-media" style="border:none;width:100%;height:244px;max-width:614px;" width="100%" height="244" src="${iframeSrc}"></iframe>`;
        return { kind: "rawEmbed", html: iframeHtml };
      }
      
      // Если это прямая ссылка на iframe
      if (u.pathname.includes("/iframe/") || u.pathname.includes("/iframe#") || u.pathname.includes("/iframe")) {
        const iframeSrc = u.href;
        const iframeHtml = `<iframe frameborder="0" allow="clipboard-write; autoplay; encrypted-media" style="border:none;width:100%;height:244px;max-width:614px;" width="100%" height="244" src="${iframeSrc}"></iframe>`;
        return { kind: "rawEmbed", html: iframeHtml };
      }
    }
    return { kind: "audio", src: u.href };
  } catch {
    // Если не удалось распарсить как URL, проверяем, не является ли это iframe HTML
    if (input.trim().startsWith("<iframe") || input.includes("music.yandex.ru")) {
      return { kind: "rawEmbed", html: input };
    }
    return { kind: "rawEmbed", html: input };
  }
}

export function osmEmbedUrl(lat: number, lng: number, z = 14) {
  const bboxPad = 0.02;
  const left = lng - bboxPad;
  const right = lng + bboxPad;
  const top = lat + bboxPad;
  const bottom = lat - bboxPad;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  return embed;
}

export function osmLink(lat: number, lng: number, z = 14) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${z}/${lat}/${lng}`;
}

