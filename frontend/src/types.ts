export type BlockType = 'section' | 'note' | 'link' | 'photo' | 'video' | 'music' | 'map' | 'social';

export interface Block {
  id: number;
  type: BlockType;
  sort: number;
  note?: string;
  linkUrl?: string;
  photoUrl?: string;
  videoUrl?: string;
  musicEmbed?: string;
  mapLat?: number;
  mapLng?: number;
  socialType?: "telegram" | "vk" | "instagram" | "twitter" | "linkedin" | "github" | "youtube" | "dribbble" | "behance" | null;
  socialUrl?: string;
}

export interface UserDto {
  id: number;
  email: string;
  profile?: {
    username?: string | null;
    name?: string | null;
    bio?: string | null;
  } | null;
}
