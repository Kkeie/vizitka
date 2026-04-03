export type SupportedSocial = 'telegram' | 'instagram' | 'vk' | 'twitter' | 'linkedin' | 'github' | 'youtube' | 'dribbble' | 'behance';

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
    else username = '';
  } catch {}
  return { platform, username, ...base };
}