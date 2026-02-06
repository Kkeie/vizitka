export const API_BASE = (window as any).__API_BASE__ ?? "/api";

export function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function youtubeEmbedUrl(input: string) {
  try {
    const u = new URL(input);
    if (/youtube\.com$/i.test(u.hostname) || /youtu\.be$/i.test(u.hostname)) {
      let id = u.searchParams.get("v") || "";
      if (!id && u.hostname === "youtu.be") id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (/vimeo\.com$/i.test(u.hostname)) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return input;
  } catch {}
  return null;
}

export function niceError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as any).message);
  return "Unexpected error";
}
