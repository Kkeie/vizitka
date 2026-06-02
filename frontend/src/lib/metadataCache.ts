type OGData = { title?: string; description?: string; image?: string; url: string };
type CacheEntry = { data: OGData; expiresAt: number };

const STORAGE_KEY = "vizitka_og_cache";
const TTL = 3_600_000; // 1 hour
const MAX_ENTRIES = 150;

function load(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getMetadataCache(url: string): OGData | null {
  const store = load();
  const entry = store[url];
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

export function setMetadataCache(url: string, data: OGData): void {
  try {
    const store = load();
    store[url] = { data, expiresAt: Date.now() + TTL };
    // Evict oldest entries when over limit
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      keys
        .sort((a, b) => store[a].expiresAt - store[b].expiresAt)
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((k) => delete store[k]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be full or unavailable
  }
}
