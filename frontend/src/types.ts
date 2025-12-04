export type BlockType = 'note' | 'link' | 'photo' | 'video' | 'music' | 'map';

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
