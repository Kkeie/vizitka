import type { Block } from "../api";
import { classifyMusic, extractVKVideoId, extractYouTubeId } from "./embed";
import { detectSocialPlatform } from "./social-preview";

type SocialPlatform = Exclude<Block["socialType"], null | undefined>;

type ValidationResult<T = string> = {
  ok: boolean;
  value?: T;
  message?: string;
};

const HANDLE_REGEX = /^[a-zA-Z0-9._-]{2,64}$/;

const SOCIAL_PREFIX: Record<SocialPlatform, string> = {
  telegram: "https://t.me/",
  vk: "https://vk.com/",
  instagram: "https://instagram.com/",
  twitter: "https://twitter.com/",
  linkedin: "https://linkedin.com/in/",
  github: "https://github.com/",
  youtube: "https://youtube.com/@",
  dribbble: "https://dribbble.com/",
  behance: "https://behance.net/",
  max: "https://max.ru/",
  dprofile: "https://dprofile.ru/",
  figma: "https://figma.com/@",
  pinterest: "https://pinterest.com/",
  tiktok: "https://tiktok.com/@",
  spotify: "https://open.spotify.com/user/",
};

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeHandleCandidate(value: string): string {
  return value.replace(/^@+/, "").trim();
}

function toUrlCandidate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isIpv4Host(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

function hasValidPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost") return true;
  if (isIpv4Host(host)) return true;
  if (host.includes(":")) return true; // IPv6 host
  if (!host.includes(".")) return false;
  const tld = host.split(".").pop() || "";
  return /^[a-z]{2,63}$/.test(tld);
}

function normalizeSocialHandle(platform: SocialPlatform, rawValue: string): string {
  const clean = normalizeHandleCandidate(trimSlashes(rawValue));
  if (!clean) return "";
  if (platform === "youtube" || platform === "tiktok" || platform === "figma") {
    return clean.replace(/^@+/, "");
  }
  return clean;
}

function handleFromUrl(platform: SocialPlatform, url: URL): string {
  const path = trimSlashes(url.pathname);
  if (!path) return "";

  if (platform === "linkedin") {
    const parts = path.split("/");
    if (parts[0] !== "in" || !parts[1]) return "";
    return parts[1];
  }

  if (platform === "youtube") {
    const parts = path.split("/");
    if (!parts[0]) return "";
    if (parts[0].startsWith("@")) return parts[0].replace(/^@+/, "");
    if (parts[0] === "channel" || parts[0] === "c" || parts[0] === "user") {
      return parts[1] ? parts[1].replace(/^@+/, "") : "";
    }
    return "";
  }

  if (platform === "tiktok") {
    const first = path.split("/")[0] || "";
    return first.replace(/^@+/, "");
  }

  if (platform === "figma") {
    const first = path.split("/")[0] || "";
    return first.replace(/^@+/, "");
  }

  return path.split("/")[0] || "";
}

function toSocialUrl(platform: SocialPlatform, handle: string): string {
  return `${SOCIAL_PREFIX[platform]}${handle}`;
}

export function sanitizeSocialHandleInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.replace(/\s+/g, "").replace(/^@+/, "").replace(/[^a-zA-Z0-9._-]/g, "");
}

export function validateSocialInput(platform: SocialPlatform, rawValue: string): ValidationResult<string> {
  const input = rawValue.trim();
  if (!input) {
    return { ok: false, message: "Введите ссылку или username выбранной соцсети." };
  }

  if (/^https?:\/\//i.test(input)) {
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return { ok: false, message: "Некорректный URL соцсети." };
    }
    const detected = detectSocialPlatform(parsed.toString());
    if (detected !== platform) {
      return { ok: false, message: "Ссылка не соответствует выбранной социальной сети." };
    }
    const handle = normalizeSocialHandle(platform, handleFromUrl(platform, parsed));
    if (!HANDLE_REGEX.test(handle)) {
      return { ok: false, message: "Username в ссылке не соответствует формату соцсети." };
    }
    return { ok: true, value: toSocialUrl(platform, handle) };
  }

  const handle = normalizeSocialHandle(platform, sanitizeSocialHandleInput(input));
  if (!HANDLE_REGEX.test(handle)) {
    return { ok: false, message: "Неверный формат username. Разрешены буквы, цифры, точка, дефис и underscore." };
  }
  return { ok: true, value: toSocialUrl(platform, handle) };
}

export function validateLinkInput(rawValue: string): ValidationResult<string> {
  const candidate = toUrlCandidate(rawValue);
  if (!candidate) return { ok: false, message: "Введите ссылку." };
  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return { ok: false, message: "Поддерживаются только http/https ссылки." };
    }
    if (!hasValidPublicHost(parsed.hostname)) {
      return { ok: false, message: "Укажите корректный домен ссылки (например, example.com)." };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, message: "Некорректный формат URL." };
  }
}

export function validatePhotoInput(rawValue: string): ValidationResult<string> {
  const value = rawValue.trim();
  if (!value) return { ok: false, message: "Добавьте ссылку на изображение или загрузите фото." };
  if (value.startsWith("/uploads/")) return { ok: true, value };
  const urlResult = validateLinkInput(value);
  if (!urlResult.ok || !urlResult.value) {
    return { ok: false, message: "Неверная ссылка на изображение." };
  }
  return { ok: true, value: urlResult.value };
}

export function validateVideoInput(rawValue: string): ValidationResult<string> {
  const urlResult = validateLinkInput(rawValue);
  if (!urlResult.ok || !urlResult.value) return { ok: false, message: "Введите валидную ссылку на видео." };
  const url = urlResult.value;
  if (extractYouTubeId(url) || extractVKVideoId(url)) {
    return { ok: true, value: url };
  }
  return { ok: false, message: "Поддерживаются YouTube (включая Shorts) и VK Video ссылки." };
}

export function validateMusicInput(rawValue: string): ValidationResult<string> {
  const value = rawValue.trim();
  if (!value) return { ok: false, message: "Введите ссылку на музыку или embed-код." };
  const kind = classifyMusic(value);
  if (kind.kind === "rawEmbed") {
    const looksLikeIframe = value.includes("<iframe");
    const looksLikeUrl = /^https?:\/\//i.test(value);
    if (!looksLikeIframe && !looksLikeUrl) {
      return { ok: false, message: "Формат не распознан как музыкальная ссылка или embed-код." };
    }
  }
  return { ok: true, value };
}

export function validateMapCoordinates(lat: number | undefined, lng: number | undefined): ValidationResult<{ lat: number; lng: number }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: "Введите корректные координаты." };
  }
  if ((lat as number) < -90 || (lat as number) > 90) {
    return { ok: false, message: "Широта должна быть в диапазоне от -90 до 90." };
  }
  if ((lng as number) < -180 || (lng as number) > 180) {
    return { ok: false, message: "Долгота должна быть в диапазоне от -180 до 180." };
  }
  return { ok: true, value: { lat: lat as number, lng: lng as number } };
}
