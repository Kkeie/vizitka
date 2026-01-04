export type Profile = {
  id: number;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  userId: number;
};
export type User = {
  id: number;
  username: string;
  createdAt: string;
  profile: Profile | null;
};

export type BlockType = "note" | "link" | "photo" | "video" | "music" | "map";
export type Block = {
  id: number;
  type: BlockType;
  sort: number;
  note?: string | null;
  linkUrl?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  musicEmbed?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
};

// API base URL: использует переменную окружения для production или относительный путь для dev
// В dev режиме Vite проксирует /api на бэкенд (см. vite.config.ts)
// В production нужно установить VITE_BACKEND_API_URL
const API = import.meta.env.VITE_BACKEND_API_URL || "/api";

// Логирование для отладки
console.log('[API] Backend URL:', API);
console.log('[API] Mode:', import.meta.env.MODE);
console.log('[API] VITE_BACKEND_API_URL env:', import.meta.env.VITE_BACKEND_API_URL);

// Предупреждение только для production build
if (import.meta.env.PROD && API.startsWith('/') && !API.startsWith('http')) {
  console.warn('[API] WARNING: Running in production mode without VITE_BACKEND_API_URL!');
  console.warn('[API] Requests will go to:', window.location.origin + API);
  console.warn('[API] Make sure backend is accessible at this URL or set VITE_BACKEND_API_URL');
}

let token: string | null = localStorage.getItem("token");
export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("token", t); else localStorage.removeItem("token");
}
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Auth
export async function register(username: string, password: string): Promise<{ token: string; user: User }> {
  const url = `${API}/auth/register`;
  console.log('[API] Register request to:', url);
  
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    const errorMessage = errorData.error || "register_failed";
    throw new Error(errorMessage);
  }
  const data = await r.json();
  setToken(data.token);
  return data;
}
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("login_failed");
  const data = await r.json();
  setToken(data.token);
  return data;
}
export async function me(): Promise<User> {
  const r = await fetch(`${API}/user/me`, { headers: authHeaders() });
  if (!r.ok) throw new Error("unauthorized");
  return r.json();
}

// Profile
export async function getProfile(): Promise<Profile> {
  const url = `${API}/profile`;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
  console.log('[API] getProfile request:', { url, headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'none' } });
  
  const r = await fetch(url, { headers });
  console.log('[API] getProfile response:', { status: r.status, statusText: r.statusText, ok: r.ok });
  
  if (!r.ok) {
    const errorText = await r.text().catch(() => '');
    console.error('[API] getProfile error:', errorText);
    throw new Error(r.status === 401 ? "unauthorized" : "profile_load_failed");
  }
  return r.json();
}
export async function updateProfile(p: Partial<Pick<Profile, "username" | "name" | "bio" | "avatarUrl" | "backgroundUrl">>): Promise<Profile> {
  const r = await fetch(`${API}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error("profile_update_failed");
  return r.json();
}

// Uploads
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  
  try {
    const r = await fetch(`${API}/storage/image`, { 
      method: 'POST', 
      headers: { ...authHeaders() }, 
      body: form 
    });
    
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      if (r.status === 413) {
        throw new Error('file_too_large');
      }
      throw new Error(errorData.error || 'upload_failed');
    }
    
    return r.json();
  } catch (error: any) {
    if (error.message === 'file_too_large') {
      throw new Error('Файл слишком большой. Максимальный размер: 50MB');
    }
    throw error;
  }
}

// Blocks
export async function listBlocks(): Promise<Block[]> {
  const url = `${API}/blocks`;
  const headers: Record<string, string> = authHeaders();
  console.log('[API] listBlocks request:', { url, headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'none' } });
  
  const r = await fetch(url, { headers });
  console.log('[API] listBlocks response:', { status: r.status, statusText: r.statusText, ok: r.ok });
  
  if (!r.ok) {
    const errorText = await r.text().catch(() => '');
    console.error('[API] listBlocks error:', errorText);
    throw new Error(r.status === 401 ? "unauthorized" : "load_blocks_failed");
  }
  return r.json();
}
export async function createBlock(partial: Partial<Block> & { type: BlockType; sort?: number }): Promise<Block> {
  const r = await fetch(`${API}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(partial),
  });
  if (!r.ok) throw new Error("create_block_failed");
  return r.json();
}
export async function updateBlock(id: number, partial: Partial<Block>): Promise<Block> {
  const r = await fetch(`${API}/blocks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(partial),
  });
  if (!r.ok) throw new Error("update_block_failed");
  return r.json();
}
export async function deleteBlock(id: number): Promise<void> {
  const r = await fetch(`${API}/blocks/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!r.ok) throw new Error("delete_block_failed");
}
export async function reorderBlocks(items: { id: number; sort: number }[]) {
  const r = await fetch(`${API}/blocks/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ items }),
  });
  if (!r.ok) throw new Error("reorder_failed");
  return r.json();
}

// Metadata
export async function getLinkMetadata(url: string): Promise<{ title?: string; description?: string; image?: string; url: string }> {
  const r = await fetch(`${API}/metadata?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error("metadata_fetch_failed");
  return r.json();
}

// Public
export async function getPublic(username: string): Promise<{ name: string; bio: string | null; avatarUrl: string | null; backgroundUrl: string | null; blocks: Block[] }> {
  const r = await fetch(`${API}/public/${encodeURIComponent(username)}`);
  if (!r.ok) throw new Error("not_found");
  return r.json();
}
export function publicUrl(username: string) {
  return `${window.location.origin}/${encodeURIComponent(username)}`;
}

// New wrappers for layout pages
export type BentoData = { name: string; username: string; bio: string | null; avatarUrl: string | null; blocks: Block[] };
export async function getMyPublicBento(): Promise<BentoData> {
  const meUser = await me();
  const uname = meUser.profile?.username || meUser.username;
  const data = await getPublic(uname);
  return { username: uname, ...data } as BentoData;
}
export async function getPublicBento(username: string): Promise<BentoData> {
  const data = await getPublic(username);
  return { username, ...data } as BentoData;
}
