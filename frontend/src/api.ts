export type Layout = {
  mobile: number[][];
  tablet: number[][];
  desktop: number[][];
};

export type BlockDimensions = {
  widthPercent: number;
  aspectRatio: number;
};

/** Линии CSS Grid (1-based), микро-строки для row — как в редакторе */
export type BlockGridAnchor = {
  gridColumnStart: number;
  gridRowStart: number;
};

export type BlockGridSize = {
  colSpan: number;
  rowSpan: number;
  /** Якоря позиции по брейкпоинтам; без якоря слот считается sparse */
  anchorsByBreakpoint?: Partial<
    Record<"mobile" | "tablet" | "desktop", BlockGridAnchor>
  >;
};

export type BlockSizes = Record<number, BlockGridSize>;

export type Profile = {
  id: number;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  userId: number;
  layout: Layout | null;
  blockSizes: BlockSizes | null;
};
export type User = {
  id: number;
  username: string;
  createdAt: string;
  profile: Profile | null;
};

export type BlockType = "section" | "note" | "link" | "photo" | "video" | "music" | "map" | "social";

/** Оформление текстовой заметки (type === "note") */
export type NoteTextStyle = {
  align?: "left" | "center" | "right";
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: "default" | "serif" | "mono" | "system";
  bold?: boolean;
  italic?: boolean;
};

export type Block = {
  id: number;
  type: BlockType;
  sort: number;
  note?: string | null;
  noteStyle?: NoteTextStyle | null;
  linkUrl?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  musicEmbed?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  socialType?: "telegram" | "vk" | "instagram" | "twitter" | "linkedin" | "github" | "youtube" | "dribbble" | "behance" | null;
  socialUrl?: string | null;
};

const runtimeHost =
  typeof window !== "undefined" ? window.location.hostname : "";
const runtimeOrigin =
  typeof window !== "undefined" ? window.location.origin : "";
const isLocalRuntime =
  runtimeHost === "localhost" ||
  runtimeHost === "127.0.0.1" ||
  runtimeHost === "0.0.0.0";

// API base URL: использует переменную окружения для production или относительный путь для dev
// В dev режиме Vite проксирует /api на бэкенд (см. vite.config.ts)
// В production нужно установить VITE_BACKEND_API_URL (с /api в конце!)
const API =
  import.meta.env.VITE_BACKEND_API_URL ||
  (import.meta.env.DEV
    ? "/api"
    : isLocalRuntime
      ? "http://localhost:3000/api"
      : "/api");

// Базовый URL бэкенда (без /api) для загрузки файлов
// Используем переменную окружения VITE_BACKEND_BASE_URL если она установлена, иначе извлекаем из API
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || API.replace(/\/api$/, '') || '';
const missingProductionApiConfig =
  import.meta.env.PROD &&
  !import.meta.env.VITE_BACKEND_API_URL &&
  !isLocalRuntime;

// Логирование для отладки
if (import.meta.env.PROD) {
  console.log('[API] getImageUrl config:', {
    API,
    BACKEND_BASE_URL,
    VITE_BACKEND_BASE_URL: import.meta.env.VITE_BACKEND_BASE_URL,
    PROD: import.meta.env.PROD
  });
}

// Функция для преобразования относительных путей в полные URL
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Если это уже полный URL (http/https) – возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Если относительный путь /uploads/... – в production добавляем BACKEND_BASE_URL
  if (url.startsWith('/uploads/')) {
    if (import.meta.env.PROD && BACKEND_BASE_URL) {
      return `${BACKEND_BASE_URL}${url}`;
    }
    return url; // для dev (прокси работает)
  }
  
  // Прочие случаи (data: URL и т.д.)
  return url;
}

// Логирование для отладки
console.log('[API] Backend URL:', API);
console.log('[API] Mode:', import.meta.env.MODE);
console.log('[API] VITE_BACKEND_API_URL env:', import.meta.env.VITE_BACKEND_API_URL);

// Предупреждение только для production build
if (missingProductionApiConfig && API.startsWith('/') && !API.startsWith('http')) {
  console.error('[API] ERROR: Running in production mode without VITE_BACKEND_API_URL!');
  console.error('[API] Requests will go to:', runtimeOrigin + API);
  console.error('[API] This will NOT work on Render Static Site!');
  console.error('[API] Please set VITE_BACKEND_API_URL=https://your-backend.onrender.com/api in Render environment variables');
} else if (import.meta.env.PROD && isLocalRuntime && !import.meta.env.VITE_BACKEND_API_URL) {
  console.warn('[API] VITE_BACKEND_API_URL is not set. Using local fallback:', API);
}

// Token storage policy:
// only sessionStorage to avoid cross-user leakage via persistent localStorage.
// If a legacy token is present in localStorage, remove it.
let token: string | null = sessionStorage.getItem("token");
if (localStorage.getItem("token")) {
  localStorage.removeItem("token");
}
export function setToken(t: string | null) {
  token = t;
  if (t) {
    sessionStorage.setItem("token", t);
  } else {
    sessionStorage.removeItem("token");
  }
  localStorage.removeItem("token");
}
export function authHeaders(): Record<string, string> {
  // Keep in-memory token synced with current tab sessionStorage state.
  token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function looksLikeHtmlDocument(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
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
    if (looksLikeHtmlDocument(text)) {
      console.error('[API] HTML returned instead of JSON:', {
        status: response.status,
        url: response.url,
        apiBase: API,
      });

      if (missingProductionApiConfig) {
        throw new Error('backend_api_not_configured');
      }

      throw new Error('api_returned_html');
    }

    throw new Error('invalid_json_response');
  }
}

// Тип для ошибок API
interface ApiError {
  error?: string;
  message?: string;
  suggestions?: string[];
}

// Auth
export async function register(username: string, password: string): Promise<{ token: string; user: User }> {
  const url = `${API}/auth/register`;
  console.log('[API] Register request to:', url);

  const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    .catch((error: any) => {
      console.error('[API] Network error:', error);
      throw new Error('network_error');
    });

  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    const errorMessage = errorData.error || errorData.message || "register_failed";
    if (errorData.error === "username_taken" && errorData.suggestions) {
      const customError: any = new Error(errorMessage);
      customError.suggestions = errorData.suggestions;
      throw customError;
    }
    console.error('[API] Register failed:', r.status, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await safeJsonParse<{ token: string; user: User }>(r);
  setToken(data.token);
  return data;
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
  const r = await fetch(`${API}/user/me`, { headers: authHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("unauthorized");
  return safeJsonParse<User>(r);
}

// Profile
export async function getProfile(): Promise<Profile> {
  const url = `${API}/profile`;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
  console.log('[API] getProfile request:', { url, headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'none' } });
  
  const r = await fetch(url, { headers, cache: "no-store" });
  console.log('[API] getProfile response:', { status: r.status, statusText: r.statusText, ok: r.ok });
  
  if (!r.ok) {
    const errorText = await r.text().catch(() => '');
    console.error('[API] getProfile error:', errorText);
    throw new Error(r.status === 401 ? "unauthorized" : "profile_load_failed");
  }
  return safeJsonParse<Profile>(r);
}
export async function updateProfile(p: Partial<Profile>): Promise<Profile> {
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

  const r = await fetch(`${API}/storage/image`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form
  });

  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    if (r.status === 413) {
      throw new Error('Файл слишком большой. Максимальный размер: 50MB');
    }
    throw new Error(errorData.error || 'upload_failed');
  }

  return safeJsonParse<{ url: string }>(r);
}

// Blocks
export async function listBlocks(): Promise<Block[]> {
  const url = `${API}/blocks`;
  const headers: Record<string, string> = authHeaders();
  console.log('[API] listBlocks request:', { url, headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'none' } });
  
  const r = await fetch(url, { headers, cache: "no-store" });
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
export async function reorderBlocks(items: { id: number; sort: number }[]): Promise<void> {
  const r = await fetch(`${API}/blocks/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ items }),
  });
  
  // Читаем ответ один раз
  const text = await r.text();
  
  if (!r.ok) {
    let errorData: ApiError;
    try {
      errorData = text ? JSON.parse(text) as ApiError : {};
    } catch {
      errorData = {};
    }
    throw new Error(errorData.error || errorData.message || "reorder_failed");
  }
  
  // Для успешного ответа проверяем, что это валидный JSON (если есть тело)
  if (text && text.trim().length > 0) {
    try {
      JSON.parse(text);
    } catch (e) {
      console.warn('[API] reorderBlocks: response body is not valid JSON, but request succeeded');
    }
  }
  
  // reorderBlocks не возвращает данные, только статус успеха
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
export async function getPublic(username: string): Promise<{ 
  name: string; 
  bio: string | null; 
  avatarUrl: string | null; 
  backgroundUrl: string | null; 
  phone: string | null; 
  email: string | null; 
  telegram: string | null; 
  blocks: Block[];
  layout: Layout | null;
  blockSizes: BlockSizes | null;
}> {
  const r = await fetch(`${API}/public/${encodeURIComponent(username)}`);
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || errorData.message || "not_found");
  }
  return safeJsonParse<{ name: string; bio: string | null; avatarUrl: string | null; backgroundUrl: string | null; phone: string | null; email: string | null; telegram: string | null; blocks: Block[]; layout: Layout | null; blockSizes: BlockSizes | null }>(r);
}
export function publicUrl(username: string) {
  return `${window.location.origin}/public/${encodeURIComponent(username)}`;
}

// QR
export function qrUrlForPublic(username: string) {
  const url = publicUrl(username);
  return `${API}/qr?url=${encodeURIComponent(url)}`;
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

export async function checkUsername(username: string): Promise<{ available: boolean; suggestions?: string[] }> {
  const r = await fetch(`${API}/auth/check-username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!r.ok) {
    const errorData = await safeJsonParse<ApiError>(r).catch(() => ({} as ApiError));
    throw new Error(errorData.error || "check_username_failed");
  }
  return safeJsonParse<{ available: boolean; suggestions?: string[] }>(r);
}
