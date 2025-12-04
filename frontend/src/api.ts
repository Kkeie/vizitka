export type Profile = {
  id: number;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl?: string | null;
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
const API = import.meta.env.VITE_BACKEND_API_URL || "/api";

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
  const r = await fetch(`${API}/auth/register`, {
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
  const r = await fetch(`${API}/profile`, { headers: { "Content-Type": "application/json", ...authHeaders() } });
  if (!r.ok) throw new Error("profile_load_failed");
  return r.json();
}
export async function updateProfile(p: Partial<Pick<Profile, "username" | "name" | "bio" | "avatarUrl">>): Promise<Profile> {
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
  const r = await fetch(`${API}/storage/image`, { method: 'POST', headers: { ...authHeaders() }, body: form });
  if (!r.ok) throw new Error('upload_failed');
  return r.json();
}

// Blocks
export async function listBlocks(): Promise<Block[]> {
  const r = await fetch(`${API}/blocks`, { headers: authHeaders() });
  if (!r.ok) throw new Error("load_blocks_failed");
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

// Public
export async function getPublic(username: string): Promise<{ name: string; bio: string | null; avatarUrl: string | null; blocks: Block[] }> {
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
