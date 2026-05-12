export type SupportedSocial = 'telegram' | 'instagram' | 'vk' | 'twitter' | 'linkedin' | 'github' | 'youtube' | 'dribbble' | 'behance' | 'max' | 'dprofile' | 'figma' | 'pinterest' | 'tiktok' | 'spotify';

export interface SocialInfo {
  platform: SupportedSocial | 'other';
  name: string;
  icon: string;
  gradient: string;
  urlPrefix: string;
  username?: string;
}

const SOCIAL_DATA: Record<SupportedSocial, Omit<SocialInfo, 'platform' | 'username'>> = {
  telegram: { name: 'Telegram', icon: 'telegram', gradient: 'linear-gradient(135deg, #0088cc 0%, #229ED9 100%)', urlPrefix: 'https://t.me/' },
  instagram: { name: 'Instagram', icon: 'instagram', gradient: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', urlPrefix: 'https://instagram.com/' },
  vk: { name: 'VK', icon: 'vk', gradient: 'linear-gradient(135deg, #0077FF 0%, #4680C2 100%)', urlPrefix: 'https://vk.com/' },
  twitter: { name: 'Twitter', icon: 'twitter', gradient: 'linear-gradient(135deg, #1DA1F2 0%, #0d8de4 100%)', urlPrefix: 'https://twitter.com/' },
  linkedin: { name: 'LinkedIn', icon: 'linkedin', gradient: 'linear-gradient(135deg, #0A66C2 0%, #0a5aa5 100%)', urlPrefix: 'https://linkedin.com/in/' },
  github: { name: 'GitHub', icon: 'github', gradient: 'linear-gradient(135deg, #333 0%, #24292e 100%)', urlPrefix: 'https://github.com/' },
  youtube: { name: 'YouTube', icon: 'youtube', gradient: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)', urlPrefix: 'https://youtube.com/' },
  dribbble: { name: 'Dribbble', icon: 'dribbble', gradient: 'linear-gradient(135deg, #EA4C89 0%, #d33a72 100%)', urlPrefix: 'https://dribbble.com/' },
  behance: { name: 'Behance', icon: 'behance', gradient: 'linear-gradient(135deg, #1769FF 0%, #0f5be5 100%)', urlPrefix: 'https://behance.net/' },
  // НОВЫЕ ПЛАТФОРМЫ
  max: { name: 'Max', icon: 'max', gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)', urlPrefix: 'https://max.ru/' },
  dprofile: { name: 'Dprofile', icon: 'dprofile', gradient: 'linear-gradient(135deg, #1E2A3A 0%, #2c3e50 100%)', urlPrefix: 'https://dprofile.ru/' },
  figma: { name: 'Figma', icon: 'figma', gradient: 'linear-gradient(135deg, #0ACF83 0%, #00a86b 100%)', urlPrefix: 'https://figma.com/@' },
  pinterest: { name: 'Pinterest', icon: 'pinterest', gradient: 'linear-gradient(135deg, #E60023 0%, #bd081c 100%)', urlPrefix: 'https://pinterest.com/' },
  tiktok: { name: 'TikTok', icon: 'tiktok', gradient: 'linear-gradient(135deg, #000000 0%, #2b2b2b 100%)', urlPrefix: 'https://tiktok.com/@' },
  spotify: { name: 'Spotify', icon: 'spotify', gradient: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)', urlPrefix: 'https://spotify.com/' },
};

export function detectSocialPlatform(url: string): SupportedSocial | 'other' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('t.me') || hostname.includes('telegram.me')) return 'telegram';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('vk.com') || hostname.includes('vkontakte.ru')) return 'vk';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('dribbble.com')) return 'dribbble';
    if (hostname.includes('behance.net')) return 'behance';
    // НОВЫЕ ДОМЕНЫ
    if (hostname.includes('max.ru')) return 'max';
    if (hostname.includes('dprofile.ru')) return 'dprofile';
    if (hostname.includes('figma.com')) return 'figma';
    if (hostname.includes('pinterest.com')) return 'pinterest';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('spotify.com')) return 'spotify';
    return 'other';
  } catch {
    return 'other';
  }
}

export function getSocialInfo(url: string): SocialInfo {
  const platform = detectSocialPlatform(url);
  if (platform === 'other') {
    return { platform: 'other', name: 'Ссылка', icon: 'link', gradient: 'linear-gradient(135deg, #6c757d 0%, #565e64 100%)', urlPrefix: '' };
  }
  const base = SOCIAL_DATA[platform];
  let username = '';
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname.replace(/^\/+/, '');
    switch (platform) {
      case 'telegram':
        username = path;
        break;
      case 'instagram':
      case 'vk':
      case 'twitter':
      case 'github':
      case 'max':
      case 'dprofile':
      case 'figma':
      case 'pinterest':
      case 'tiktok':
      case 'spotify':
        username = path.split('/')[0];
        break;
      case 'linkedin':
        if (path.includes('/in/')) username = path.split('/in/')[1];
        break;
      case 'youtube':
        if (path.includes('/@')) username = path.split('/@')[1];
        else if (path.includes('/c/')) username = path.split('/c/')[1];
        else username = path;
        break;
      case 'dribbble':
      case 'behance':
        username = path.split('/')[0];
        break;
      default:
        username = path;
    }
    if (username && username !== '') username = '@' + username;
  } catch {}
  return { platform, username, ...base };
}