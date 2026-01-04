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
// В production нужно установить VITE_BACKEND_API_URL (с /api в конце!)
const API = import.meta.env.VITE_BACKEND_API_URL || "/api";

// Базовый URL бэкенда (без /api) для загрузки файлов
const BACKEND_BASE_URL = API.replace(/\/api$/, '') || '';

// Функция для преобразования относительных путей в полные URL
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Если это уже полный URL (http/https), возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Если это относительный путь (начинается с /), формируем полный URL
  if (url.startsWith('/')) {
    // В production используем BACKEND_BASE_URL, в dev - текущий домен
    if (BACKEND_BASE_URL && import.meta.env.PROD) {
      return `${BACKEND_BASE_URL}${url}`;
    }
    // В dev режиме относительные пути работают через прокси
    return url;
  }
  
  // Иначе возвращаем как есть (может быть data URL или другой формат)
  return url;
}

// Логирование для отладки
console.log('[API] Backend URL:', API);
console.log('[API] Mode:', import.meta.env.MODE);
console.log('[API] VITE_BACKEND_API_URL env:', import.meta.env.VITE_BACKEND_API_URL);

// Предупреждение только для production build
if (import.meta.env.PROD && API.startsWith('/') && !API.startsWith('http')) {
  console.error('[API] ERROR: Running in production mode without VITE_BACKEND_API_URL!');
  console.error('[API] Requests will go to:', window.location.origin + API);
  console.error('[API] This will NOT work on Render Static Site!');
  console.error('[API] Please set VITE_BACKEND_API_URL=https://your-backend.onrender.com/api in Render environment variables');
}

let token: string | null = localStorage.getItem("token");
export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("token", t); else localStorage.removeItem("token");
}
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Безопасный парсинг JSON из Response
async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    console.warn('[API] Empty response body');
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('[API] Failed to parse JSON:', text.substring(0, 200));
    throw new Error('invalid_json_response');
  }
}

// Тип для ошибок API
interface ApiError {
  error?: string;
  message?: string;
}

// Auth
export async function register(username: string, password: string): Promise<{ token: string; user: User }> {
  const url = `${API}/auth/register`;
  console.log('[API] Register request to:', url);
  
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    if (!r.ok) {
      const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
      const errorMessage = errorData.error || errorData.message || "register_failed";
      console.error('[API] Register failed:', r.status, errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await safeJsonParse<{ token: string; user: User }>(r);
    setToken(data.token);
    return data;
  } catch (error: any) {
    // Если это сетевая ошибка (CORS, недоступен сервер и т.д.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('[API] Network error:', error);
      throw new Error('network_error');
    }
    throw error;
  }
}
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "login_failed");
  }
  const data = await safeJsonParse<{ token: string; user: User }>(r);
  setToken(data.token);
  return data;
}
export async function me(): Promise<User> {
  const r = await fetch(`${API}/user/me`, { headers: authHeaders() });
  if (!r.ok) throw new Error("unauthorized");
  return safeJsonParse<User>(r);
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
  return safeJsonParse<Profile>(r);
}
export async function updateProfile(p: Partial<Pick<Profile, "username" | "name" | "bio" | "avatarUrl" | "backgroundUrl">>): Promise<Profile> {
  const r = await fetch(`${API}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "profile_update_failed");
  }
  return safeJsonParse<Profile>(r);
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
      const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
      if (r.status === 413) {
        throw new Error('file_too_large');
      }
      throw new Error(errorData.error || 'upload_failed');
    }
    
    return safeJsonParse<{ url: string }>(r);
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
  return safeJsonParse<Block[]>(r);
}
export async function createBlock(partial: Partial<Block> & { type: BlockType; sort?: number }): Promise<Block> {
  const r = await fetch(`${API}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(partial),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "create_block_failed");
  }
  return safeJsonParse<Block>(r);
}
export async function updateBlock(id: number, partial: Partial<Block>): Promise<Block> {
  const r = await fetch(`${API}/blocks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(partial),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "update_block_failed");
  }
  return safeJsonParse<Block>(r);
}
export async function deleteBlock(id: number): Promise<void> {
  const r = await fetch(`${API}/blocks/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "delete_block_failed");
  }
}
export async function reorderBlocks(items: { id: number; sort: number }[]) {
  const r = await fetch(`${API}/blocks/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ items }),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "reorder_failed");
  }
  return safeJsonParse(r);
}

// Metadata
export async function getLinkMetadata(url: string): Promise<{ title?: string; description?: string; image?: string; url: string }> {
  const r = await fetch(`${API}/metadata?url=${encodeURIComponent(url)}`);
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "metadata_fetch_failed");
  }
  return safeJsonParse<{ title?: string; description?: string; image?: string; url: string }>(r);
}

// Public
export async function getPublic(username: string): Promise<{ name: string; bio: string | null; avatarUrl: string | null; backgroundUrl: string | null; blocks: Block[] }> {
  const r = await fetch(`${API}/public/${encodeURIComponent(username)}`);
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "not_found");
  }
  return safeJsonParse<{ name: string; bio: string | null; avatarUrl: string | null; backgroundUrl: string | null; blocks: Block[] }>(r);
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
