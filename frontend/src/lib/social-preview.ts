// Утилиты для работы с превью социальных сетей

export type SocialType = 'telegram' | 'instagram' | 'other';

export interface SocialPreview {
  type: SocialType;
  title?: string;
  description?: string;
  image?: string;
  url: string;
}

/**
 * Определяет тип социальной сети по URL
 */
export function detectSocialType(url: string): SocialType {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('t.me') || hostname.includes('telegram.me')) {
      return 'telegram';
    }
    
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }
    
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Извлекает username/channel из Telegram URL
 */
export function extractTelegramInfo(url: string): { type: 'channel' | 'user'; username: string } | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Форматы: t.me/username, t.me/c/channel_id, telegram.me/username
    const match = pathname.match(/\/(c\/)?([^\/]+)/);
    if (!match) return null;
    
    const isChannel = pathname.includes('/c/');
    const username = match[2];
    
    return {
      type: isChannel ? 'channel' : 'user',
      username: username
    };
  } catch {
    return null;
  }
}

/**
 * Извлекает username из Instagram URL
 */
export function extractInstagramUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/([^\/\?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Генерирует URL для получения превью Telegram
 */
export function getTelegramPreviewUrl(url: string): string | null {
  const info = extractTelegramInfo(url);
  if (!info) return null;
  
  // Telegram не предоставляет публичный API для получения метаданных
  // Используем t.me для получения информации
  return `https://t.me/${info.username}`;
}

/**
 * Генерирует URL для получения превью Instagram
 */
export function getInstagramPreviewUrl(url: string): string | null {
  const username = extractInstagramUsername(url);
  if (!username) return null;
  
  return `https://www.instagram.com/${username}/`;
}

