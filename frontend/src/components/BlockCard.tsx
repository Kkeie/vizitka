import React from "react";
import { createPortal } from "react-dom";
import { useReveal } from "../hooks/useReveal";
import { extractYouTubeId, toYouTubeEmbed, extractVKVideoId, toVKVideoEmbed, classifyMusic } from "../lib/embed";
import { detectSocialType, extractTelegramInfo, extractInstagramUsername } from "../lib/social-preview";
import { getLinkMetadata, getImageUrl } from "../api";
import type { NoteTextStyle } from "../api";
import { noteStyleToTextCss } from "../lib/noteStyle";
import { sanitizeNoteHtml, looksLikeHtml } from "../lib/sanitizeNoteHtml";
import NoteFloatingToolbar from "./NoteFloatingToolbar";

export type Block = {
  id: number;
  type: "section" | "note" | "link" | "photo" | "video" | "music" | "map" | "social";
  note?: string | null;
  noteStyle?: NoteTextStyle | null;
  linkUrl?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  musicEmbed?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  socialType?: "telegram" | "vk" | "instagram" | null;
  socialUrl?: string | null;
};

export default function BlockCard({
  b,
  onDelete,
  onUpdate,
  isDragPreview,
}: {
  b: Block;
  onDelete?: () => void;
  onUpdate?: (partial: Partial<Block>) => void;
  isDragPreview?: boolean;
}) {
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const [linkMetadata, setLinkMetadata] = React.useState<{ title?: string; description?: string; image?: string } | null>(null);
  const [loadingMetadata, setLoadingMetadata] = React.useState(false);
  const revealRef = useReveal<HTMLDivElement>({ disabled: Boolean(isDragPreview) });
  const showEditorHeader = Boolean(onDelete);
  const isNoteEditable = Boolean(onUpdate) && b.type === "note";
  const noteEditableRef = React.useRef<HTMLDivElement | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<DOMRect | null>(null);
  const saveNoteDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSection = b.type === "section";
  const isSectionEditable = Boolean(onUpdate) && isSection;
  const [sectionValue, setSectionValue] = React.useState(b.note ?? "");

  const handleSelectionChange = React.useCallback(() => {
    if (!isNoteEditable) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setSelectionRect(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const editable = noteEditableRef.current;
    if (!editable || !editable.contains(range.commonAncestorContainer)) {
      setSelectionRect(null);
      return;
    }
    if (sel.isCollapsed) {
      setSelectionRect(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      setSelectionRect(rect);
    } else {
      setSelectionRect(null);
    }
  }, [isNoteEditable]);

  React.useEffect(() => {
    if (!isNoteEditable) return;
    document.addEventListener("selectionchange", handleSelectionChange);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        noteEditableRef.current?.contains(target) ||
        (target as Element).closest?.(".note-floating-toolbar")
      ) {
        return;
      }
      setSelectionRect(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNoteEditable, handleSelectionChange]);

  React.useEffect(() => {
    if (!isSection) return;
    setSectionValue(b.note ?? "");
  }, [b.id, b.note, isSection]);

  const stopControlEvent = (event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation();
  };

  React.useEffect(() => {
    if (b.type === "link" && b.linkUrl) {
      const socialType = detectSocialType(b.linkUrl);
      setLoadingMetadata(true);
      setLinkMetadata(null);

      let urlToFetch = b.linkUrl;
      if (socialType === "instagram" && !urlToFetch.includes("instagram.com")) {
        const username = extractInstagramUsername(b.linkUrl) || b.linkUrl.replace(/^@/, "").replace(/^https?:\/\//, "");
        urlToFetch = `https://www.instagram.com/${username}/`;
      }

      getLinkMetadata(urlToFetch)
        .then((data) => setLinkMetadata(data))
        .catch((err) => console.log("Failed to fetch metadata:", err))
        .finally(() => setLoadingMetadata(false));
    } else {
      setLinkMetadata(null);
    }
  }, [b.type, b.linkUrl]);

  // const typeLabels: Record<string, string> = {
  //   section: "Раздел",
  //   note: "Заметка",
  //   link: "Ссылка",
  //   photo: "Фото",
  //   video: "Видео",
  //   music: "Музыка",
  //   map: "Карта",
  //   social: "Соцсеть",
  // };

  // const typeColors: Record<string, string> = {
  //   section: "#0f172a",
  //   note: "#6366f1",
  //   link: "#8b5cf6",
  //   photo: "#ec4899",
  //   video: "#ef4444",
  //   music: "#10b981",
  //   map: "#06b6d4",
  //   social: "#f59e0b",
  // };

  const previewTileSize = 64;
  const socialIconSize = 48;
  const playButtonSize = 72;

  const cardStyle: React.CSSProperties = {
    padding: isSection ? "0 28px" : "16px",
    position: "relative",
    transition: isDragPreview ? "none" : "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: isSection ? "center" : undefined,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    userSelect: "none",
    borderRadius: isSection ? "var(--radius-sm)" : "var(--radius-md)",
    overflow: isSection ? "visible" : "hidden",
    height: "100%",
    pointerEvents: isDragPreview ? "none" : undefined,
    background: isSection
      ? "linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.96) 18%, rgba(255,255,255,0.96) 82%, rgba(255,255,255,0.45) 100%)"
      : undefined,
    border: isSection ? "1px solid rgba(15, 23, 42, 0.08)" : undefined,
    boxShadow: isSection ? "none" : undefined,
  }

  const scrollableContentStyle: React.CSSProperties = { height: "100%", overflowY: "auto", paddingRight: 4, minHeight: 0 };

  return (
    <div
      ref={revealRef}
      className="card"
      style={cardStyle}
      onMouseEnter={(e) => {
        if (showEditorHeader) {
          const header = e.currentTarget.querySelector(".card-edit-header") as HTMLElement | null;
          if (header) {
            header.style.opacity = "1";
            header.style.visibility = "visible";
          }
        }
      }}
      onMouseLeave={(e) => {
        if (showEditorHeader) {
          const header = e.currentTarget.querySelector(".card-edit-header") as HTMLElement | null;
          if (header) {
            header.style.opacity = "0";
            header.style.visibility = "hidden";
          }
        }
      }}
    >
      {showEditorHeader && (
        <div
          className="card-edit-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 12,
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 3,
            opacity: 0,
            visibility: "hidden",
            transition: "opacity 0.2s ease, visibility 0.2s ease",
            pointerEvents: "auto",
          }}
        >
          {/* <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: typeColors[b.type] || "var(--muted)",
                padding: "6px 12px",
                borderRadius: "8px",
                background: `${typeColors[b.type] || "var(--muted)"}10`,
                border: `1px solid ${typeColors[b.type] || "var(--muted)"}30`,
              }}
            >
              {typeLabels[b.type] || b.type}
            </span>
          </div> */}
          {onDelete && (
            <button
              onClick={onDelete}
              onPointerDown={stopControlEvent}
              aria-label="Удалить блок"
              style={{
                padding: 0,
                width: 28,
                height: 28,
                fontSize: 14,
                color: "#dc2626",
                background: "rgba(255,255,255,0.9)",
                border: "1px solid #e2e8f0",
                borderRadius: "50%",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              🗑️
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, position: "relative", zIndex: 0, minHeight: 0, overflow: "hidden" }}>
        {isSection && (
          <div
            className="card__content"
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(15,23,42,0.18), rgba(15,23,42,0.04))" }} />
            {isSectionEditable ? (
              <input
                className="input"
                type="text"
                value={sectionValue}
                placeholder="Новый раздел"
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSectionValue(nextValue);
                  if (saveNoteDebounceRef.current) clearTimeout(saveNoteDebounceRef.current);
                  saveNoteDebounceRef.current = setTimeout(() => {
                    const normalized = nextValue.trim();
                    const prev = (b.note ?? "").trim();
                    if (normalized !== prev) {
                      onUpdate?.({ note: normalized || null });
                    }
                  }, 500);
                }}
                onBlur={() => {
                  const normalized = sectionValue.trim();
                  const prev = (b.note ?? "").trim();
                  if (normalized !== prev) {
                    onUpdate?.({ note: normalized || null });
                  }
                }}
                style={{
                  width: "auto",
                  minWidth: 220,
                  maxWidth: "min(100%, 420px)",
                  padding: "10px 16px",
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  borderRadius: 999,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(255,255,255,0.88)",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                }}
              />
            ) : (
              <div
                style={{
                  maxWidth: "100%",
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(255,255,255,0.88)",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  color: "var(--text)",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={b.note ?? ""}
              >
                {b.note ?? "Раздел"}
              </div>
            )}
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(15,23,42,0.04), rgba(15,23,42,0.18))" }} />
          </div>
        )}

        {b.type === "note" && (() => {
          const ns = b.noteStyle;
          const textCss = noteStyleToTextCss(ns);
          const hasBg = Boolean(ns?.backgroundColor);
          const editable = isNoteEditable;

          const saveNoteContent = () => {
            const el = noteEditableRef.current;
            if (!el || !onUpdate) return;
            const raw = el.innerHTML?.trim() ?? "";
            const sanitized = raw ? sanitizeNoteHtml(`<div>${raw}</div>`) : "";
            const prev = b.note ?? "";
            if (sanitized !== prev) {
              onUpdate({ note: sanitized || null });
            }
          };

          const applyInlineFormat = (type: "bold" | "italic" | "foreColor", value?: string) => {
            const el = noteEditableRef.current;
            if (!el) return;
            el.focus();
            if (type === "bold") document.execCommand("bold", false);
            else if (type === "italic") document.execCommand("italic", false);
            else if (type === "foreColor" && value) document.execCommand("foreColor", false, value);
            saveNoteContent();
          };

          return (
            <div
              className="card__content"
              style={{
                ...scrollableContentStyle,
                margin: hasBg ? -16 : 0,
                padding: hasBg ? 16 : 0,
                borderRadius: hasBg ? "var(--radius-sm)" : undefined,
                backgroundColor: hasBg ? ns?.backgroundColor : undefined,
                boxSizing: "border-box",
                userSelect: editable ? "text" : undefined,
              }}
              onPointerDown={editable ? (e) => e.stopPropagation() : undefined}
            >
              {editable ? (
                <div
                  ref={(node) => {
                    noteEditableRef.current = node;
                    if (node && document.activeElement !== node) {
                      const target = b.note ?? "";
                      const current = looksLikeHtml(target) ? node.innerHTML : node.innerText;
                      if (current !== target) {
                        if (looksLikeHtml(target)) {
                          node.innerHTML = target;
                        } else {
                          node.innerText = target;
                        }
                      }
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Добавить заметку…"
                  onBlur={saveNoteContent}
                  onInput={() => {
                    if (saveNoteDebounceRef.current) clearTimeout(saveNoteDebounceRef.current);
                    saveNoteDebounceRef.current = setTimeout(saveNoteContent, 800);
                  }}
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 15,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    outline: "none",
                    minHeight: 24,
                    ...textCss,
                  }}
                />
              ) : looksLikeHtml(b.note ?? "") ? (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 15,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    ...textCss,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeNoteHtml(`<div>${b.note ?? ""}</div>`),
                  }}
                />
              ) : (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 15,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    ...textCss,
                  }}
                >
                  {b.note ?? ""}
                </div>
              )}
              {editable &&
                selectionRect &&
                createPortal(
                  <NoteFloatingToolbar
                    rect={selectionRect}
                    noteStyle={ns}
                    onInlineFormat={applyInlineFormat}
                    onAlignChange={(align) => {
                      onUpdate?.({ noteStyle: { ...ns, align } });
                    }}
                  />,
                  document.body
                )}
            </div>
          );
        })()}

        {b.type === "link" && b.linkUrl && (() => {
          const socialType = detectSocialType(b.linkUrl);
          const telegramInfo = extractTelegramInfo(b.linkUrl);
          const instagramUsername = extractInstagramUsername(b.linkUrl);

          return (
            <a
              href={b.linkUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", color: "inherit", display: "block", ...scrollableContentStyle }}
            >
              {socialType === "telegram" && telegramInfo ? (
                <div style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {linkMetadata?.image ? (
                      <img
                        src={linkMetadata.image}
                        alt=""
                        style={{ width: previewTileSize, height: previewTileSize, borderRadius: "12px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ width: previewTileSize, height: previewTileSize, borderRadius: "12px", background: "linear-gradient(135deg, #0088cc 0%, #229ED9 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" /></svg>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4, wordBreak: "break-word" }}>
                        {linkMetadata?.title || (telegramInfo.type === "channel" ? "Telegram Канал" : "Telegram Пользователь")}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4, wordBreak: "break-word" }}>{telegramInfo.username}</div>
                      {linkMetadata?.description && <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, wordBreak: "break-word" }}>{linkMetadata.description}</div>}
                    </div>
                  </div>
                </div>
              ) : socialType === "instagram" && instagramUsername ? (
                <div style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {linkMetadata?.image ? (
                      <img
                        src={linkMetadata.image}
                        alt=""
                        style={{ width: previewTileSize, height: previewTileSize, borderRadius: "12px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ width: previewTileSize, height: previewTileSize, borderRadius: "12px", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4, wordBreak: "break-word" }}>{linkMetadata?.title || "Instagram"}</div>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4, wordBreak: "break-word" }}>{instagramUsername}</div>
                      {linkMetadata?.description && <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, wordBreak: "break-word" }}>{linkMetadata.description}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ cursor: "pointer", ...scrollableContentStyle }}>
                  {linkMetadata?.image ? (
                    <img src={linkMetadata.image} alt="" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-sm)", objectFit: "cover", marginBottom: 12, border: "1px solid var(--border)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: "var(--muted)", fontSize: 13, padding: 12, textAlign: "center" }}>
                      {loadingMetadata ? "Загрузка превью..." : safeDomain(b.linkUrl)}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8, color: "var(--text)", lineHeight: 1.4 }}>{linkMetadata?.title || safeDomain(b.linkUrl)}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>{linkMetadata?.description || b.linkUrl}</div>
                </div>
              )}
            </a>
          );
        })()}

        {b.type === "photo" && b.photoUrl && (
          <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", height: "100%" }}>
            <img src={getImageUrl(b.photoUrl)} alt="" className="photo" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {b.type === "video" && b.videoUrl && (() => {
          const vid = extractYouTubeId(b.videoUrl);
          const vkEmbedSrc = extractVKVideoId(b.videoUrl) ? toVKVideoEmbed(b.videoUrl) : null;

          if (!isVideoPlaying && vid) {
            return (
              <div onClick={() => setIsVideoPlaying(true)} title="Смотреть" style={{ cursor: "pointer", position: "relative", borderRadius: "var(--radius-sm)", overflow: "hidden", height: "100%" }}>
                <img src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="Превью видео" className="photo" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: playButtonSize, height: playButtonSize, borderRadius: "50%", background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>▶</div>
              </div>
            );
          }

          if (isVideoPlaying && vid) {
            return <iframe className="embed" src={toYouTubeEmbed(b.videoUrl) + "?autoplay=1&rel=0&modestbranding=1"} title="Видео" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />;
          }

          if (vkEmbedSrc) {
            return <iframe className="embed" src={vkEmbedSrc} title="VK Видео" loading="lazy" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />;
          }

          return <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Видео</div>;
        })()}

        {b.type === "music" && b.musicEmbed && (() => {
          const kind = classifyMusic(b.musicEmbed);
          if (kind.kind === "audio") {
            return (
              <div style={{ padding: 16, borderRadius: "var(--radius-sm)", background: "var(--bg)", ...scrollableContentStyle }}>
                <audio className="audio" controls style={{ width: "100%" }}>
                  <source src={kind.src} />
                  Ваш браузер не поддерживает аудио.
                </audio>
                <div className="muted" style={{ fontSize: 12, marginTop: 10, overflow: "hidden", textOverflow: "ellipsis" }}>{kind.src}</div>
              </div>
            );
          }
          if (kind.kind === "spotify" || kind.kind === "soundcloud" || kind.kind === "youtube") {
            return <iframe className="embed" src={kind.src} title="Музыка" loading="lazy" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />;
          }
          return <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", position: "relative", width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: kind.html }} />;
        })()}

        {b.type === "map" && b.mapLat != null && b.mapLng != null && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <iframe className="embed" src={`https://yandex.ru/map-widget/v1/?ll=${b.mapLng}%2C${b.mapLat}&pt=${b.mapLng}%2C${b.mapLat}&z=14`} loading="lazy" title="Карта" style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%", flex: 1, minHeight: 0 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
              <a href={`https://yandex.ru/maps/?pt=${b.mapLng},${b.mapLat}&z=14`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>Яндекс.Карты <span>→</span></a>
              <a href={`https://2gis.ru/search/${b.mapLat},${b.mapLng}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>2ГИС <span>→</span></a>
            </div>
          </div>
        )}

        {b.type === "social" && b.socialType && b.socialUrl && (
          <a href={b.socialUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer", ...scrollableContentStyle }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {b.socialType === "telegram" && <div style={{ width: socialIconSize, height: socialIconSize, borderRadius: "12px", background: "linear-gradient(135deg, #0088cc 0%, #229ED9 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" /></svg></div>}
              {b.socialType === "vk" && <div style={{ width: socialIconSize, height: socialIconSize, borderRadius: "12px", background: "linear-gradient(135deg, #0077FF 0%, #4680C2 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21.546 7.135c.143-.466 0-.814-.68-.814h-2.244c-.57 0-.83.3-.972.63 0 0-1.14 2.784-2.752 4.592-.52.51-.757.68-1.045.68-.143 0-.35-.17-.35-.66V7.135c0-.57-.16-.815-.63-.815H9.35c-.35 0-.56.26-.56.5 0 .52.78.63.86 2.06v3.3c0 .72-.13.83-.42.83-.76 0-2.6-2.8-3.7-6-.22-.63-.44-.88-1.02-.88H2.26c-.64 0-.77.3-.77.63 0 .59.76 3.5 3.55 7.35 1.87 2.64 4.5 3.9 6.89 3.9 1.43 0 1.61-.32 1.61-.88v-2.03c0-.65.14-.78.6-.78.34 0 .93.17 2.3 1.5 1.58 1.58 1.84 2.28 2.73 2.28h2.24c.64 0 .97-.32.78-.95-.21-.64-1.0-1.57-2.03-2.67-.56-.66-1.4-1.37-1.66-1.77-.35-.45-.25-.65 0-1.05 0 0 2.94-4.14 3.25-5.54z" /></svg></div>}
              {b.socialType === "instagram" && <div style={{ width: socialIconSize, height: socialIconSize, borderRadius: "12px", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4, wordBreak: "break-word" }}>
                  {b.socialType === "telegram" && "Telegram"}
                  {b.socialType === "vk" && "ВКонтакте"}
                  {b.socialType === "instagram" && "Instagram"}
                </div>
                <div style={{ fontSize: 14, color: "var(--muted)", wordBreak: "break-word" }}>
                  {b.socialUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/^t\.me\//, "").replace(/^vk\.com\//, "").replace(/^instagram\.com\//, "")}
                </div>
              </div>
            </div>
          </a>
        )}
      </div>

    </div>
  );
}

function safeDomain(href?: string | null) {
  if (!href) return "";
  try {
    return new URL(href).host.replace("www.", "");
  } catch {
    return href;
  }
}
