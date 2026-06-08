import React from "react";
import { createPortal } from "react-dom";
import { useReveal } from "../hooks/useReveal";
import {
  extractYouTubeId,
  toYouTubeEmbed,
  extractVKVideoId,
  toVKVideoEmbed,
  classifyMusic,
  YANDEX_MUSIC_IFRAME_HEIGHT_PX,
  YANDEX_MUSIC_IFRAME_MAX_WIDTH_PX,
} from "../lib/embed";
import { getSocialInfo } from '../lib/social-preview';
import {
  TwitterIcon,
  InstagramIcon,
  LinkedInIcon,
  GitHubIcon,
  YouTubeIcon,
  DribbbleIcon,
  BehanceIcon,
  TelegramIcon,
  VKIcon,
  MaxIcon,
  DprofileIcon,
  FigmaIcon,
  PinterestIcon,
  TikTokIcon,
  SpotifyIcon,
} from './SocialIconsWithBg';
import { getLinkMetadata, getImageUrl, Block } from "../api";
import { getMetadataCache, setMetadataCache } from "../lib/metadataCache";
import { noteStyleToTextCss } from "../lib/noteStyle";
import { sanitizeNoteHtml, looksLikeHtml } from "../lib/sanitizeNoteHtml";
import NoteFloatingToolbar from "./NoteFloatingToolbar";
import { CardContentScaleToFit } from "./CardContentScaleToFit";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Превращает OG-заголовок соцпрофиля в человекочитаемое имя или null, если это
 * generic-«chrome» платформы (например «Pinterest (pinterest) - Profile | Pinterest»),
 * — тогда карточка покажет реальный username из ссылки.
 */
function cleanSocialTitle(raw: string | undefined, platform: string): string | null {
  if (!raw) return null;
  let t = raw.replace(new RegExp(`\\s*[|\\-–—·]\\s*${escapeRe(platform)}\\s*$`, "i"), "").trim();
  if (!t) return null;
  if (t.toLowerCase() === platform.toLowerCase()) return null;
  if (new RegExp(`^${escapeRe(platform)}\\b`, "i").test(t) && /\bprofile\b|профил/i.test(t)) return null;
  return t;
}

/** Отсекает generic-слоганы платформы из OG-описания («Pinterest | Find your reason…»). */
function cleanSocialBio(raw: string | undefined | null, platform: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (new RegExp(`^${escapeRe(platform)}\\s*[|\\-–—·]`, "i").test(t)) return null;
  if (t.toLowerCase() === platform.toLowerCase()) return null;
  return t;
}

/** Полоски по краю iframe в редакторе: dnd ловит край, центр (плеер/карта) остаётся интерактивным */
const EDITOR_IFRAME_DRAG_EDGE_PX = 14;
/** Полоски DnD у блока «ссылка» шире — на длинных превью проще схватить блок */
const LINK_EDITOR_DRAG_RAIL_PX = 28;

/**
 * Подпись у блока «ссылка»: гистерезис show/hide, чтобы при ресайзе соседей
 * ResizeObserver не дёргал режим и не «сжимал» контент (раньше ещё и иконка 56→48).
 */
const LINK_CARD_TEXT_SHOW_MIN_H = 115;
const LINK_CARD_TEXT_SHOW_MIN_W = 190;
const LINK_CARD_TEXT_HIDE_MAX_H = 98;
const LINK_CARD_TEXT_HIDE_MAX_W = 175;

const LINK_TILE_ICON_PX = 56;

function brandLabelFromHost(host: string): string {
  const h = host.replace(/^www\./i, "").trim();
  if (!h) return "";
  const first = h.split(".")[0] ?? h;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function shortUrlPath(url: string, opts?: { maxLen?: number | null }): string | null {
  const maxLen = opts?.maxLen === undefined ? 52 : opts.maxLen;
  try {
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname + u.search);
    if (!p || p === "/") return null;
    if (maxLen === null || p.length <= maxLen) return p;
    return `${p.slice(0, Math.max(1, maxLen - 1))}…`;
  } catch {
    return null;
  }
}

function faviconUrlForHost(host: string): string {
  const domain = host.replace(/^www\./i, "");
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

function EditorIframeEdgeDragHandles({ show }: { show: boolean }) {
  if (!show) return null;
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 2,
    cursor: "grab",
    touchAction: "none",
    boxSizing: "border-box",
  };
  const edge = EDITOR_IFRAME_DRAG_EDGE_PX;
  return (
    <>
      <div aria-hidden className="editor-iframe-edge-drag" style={{ ...base, top: 0, left: 0, right: 0, height: edge }} />
      <div aria-hidden className="editor-iframe-edge-drag" style={{ ...base, bottom: 0, left: 0, right: 0, height: edge }} />
      <div aria-hidden className="editor-iframe-edge-drag" style={{ ...base, top: edge, bottom: edge, left: 0, width: edge }} />
      <div aria-hidden className="editor-iframe-edge-drag" style={{ ...base, top: edge, bottom: edge, right: 0, width: edge }} />
    </>
  );
}

/** Редактор: узкая кромка — grab (DnD), центр плитки остаётся pointer (ссылка), как у iframe-превью */
function LinkEditorEdgeDragRails() {
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 5,
    cursor: "grab",
    touchAction: "none",
    boxSizing: "border-box",
  };
  const edge = LINK_EDITOR_DRAG_RAIL_PX;
  return (
    <>
      <div aria-hidden className="link-editor-drag-rail" style={{ ...base, top: 0, left: 0, right: 0, height: edge }} />
      <div aria-hidden className="link-editor-drag-rail" style={{ ...base, bottom: 0, left: 0, right: 0, height: edge }} />
      <div aria-hidden className="link-editor-drag-rail" style={{ ...base, top: edge, bottom: edge, left: 0, width: edge }} />
      <div aria-hidden className="link-editor-drag-rail" style={{ ...base, top: edge, bottom: edge, right: 0, width: edge }} />
    </>
  );
}

export default function BlockCard({
  b,
  onDelete,
  onUpdate,
  isDragPreview,
  sortableProps,
  colSpan,
  rowSpan,
}: {
  b: Block;
  onDelete?: () => void;
  onUpdate?: (partial: Partial<Block>) => void;
  isDragPreview?: boolean;
  /** Слушатели dnd-kit только на карточке, не на родителе с ручками ресайза */
  sortableProps?: React.HTMLAttributes<HTMLDivElement>;
  colSpan?: number;
  rowSpan?: number;
}) {
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const [linkMetadata, setLinkMetadata] = React.useState<{ title?: string; description?: string; image?: string } | null>(null);
  const [loadingMetadata, setLoadingMetadata] = React.useState(false);
  const [socialAvatarError, setSocialAvatarError] = React.useState(false);
  const [bioMaxLines, setBioMaxLines] = React.useState(3);
  const bioRef = React.useRef<HTMLDivElement | null>(null);
  const showEditorHeader = Boolean(onDelete);
  // Fit as many bio lines as physically fit in the card's available height.
  // Non-circular: available height uses the width-bound scale (content-independent),
  // and bio's top offset is measured for the last text element (also content-independent).
  React.useLayoutEffect(() => {
    const bio = bioRef.current;
    if (!bio) return;
    const cellEl = bio.closest('.card-content-scale, .card-content-scale--passthrough') as HTMLElement | null;
    if (!cellEl) return;
    const innerEl = bio.closest('.card-content-scale__inner') as HTMLElement | null;
    const measure = () => {
      const lhRef = parseFloat(getComputedStyle(bio).lineHeight) || 18;
      let availRef: number;
      if (innerEl) {
        const refWidth = innerEl.offsetWidth || 280;
        const sApplied = innerEl.getBoundingClientRect().width / refWidth || 1;
        const sWidth = Math.min(1, cellEl.clientWidth / refWidth) || 1;
        const bioTopRef = (bio.getBoundingClientRect().top - innerEl.getBoundingClientRect().top) / sApplied;
        availRef = cellEl.clientHeight / sWidth - bioTopRef - 4;
      } else {
        const bioTopRef = bio.getBoundingClientRect().top - cellEl.getBoundingClientRect().top;
        availRef = cellEl.clientHeight - bioTopRef - 4;
      }
      const lines = Math.max(1, Math.min(20, Math.floor(availRef / lhRef)));
      setBioMaxLines((prev) => (prev === lines ? prev : lines));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(cellEl);
    return () => ro.disconnect();
  }, [linkMetadata, b.type, colSpan, rowSpan]);
  /** В редакторе без entrance: scale(0.97) ломает восприятие размера; оверлей dnd без .reveal — «как норма» */
  const revealRef = useReveal<HTMLDivElement>({
    disabled: Boolean(isDragPreview) || showEditorHeader,
  });
  const isNoteEditable = Boolean(onUpdate) && b.type === "note";
  const noteEditableRef = React.useRef<HTMLDivElement | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<DOMRect | null>(null);
  const saveNoteDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSection = b.type === "section";
  const isSectionEditable = Boolean(onUpdate) && isSection;
  const [sectionValue, setSectionValue] = React.useState(b.note ?? "");
  const [isHovered, setIsHovered] = React.useState(false);
  const [isSectionEditing, setIsSectionEditing] = React.useState(false);
  const sectionValueRef = React.useRef(sectionValue);
  const [isSectionFocused, setIsSectionFocused] = React.useState(false);
  const isPublic = !onUpdate && !onDelete;

  const sectionTextCss = React.useMemo(() => {
    const base = noteStyleToTextCss(b.noteStyle);
    return {
      ...base,
      fontWeight: b.noteStyle?.bold === undefined ? 700 : (b.noteStyle.bold ? 700 : 400),
      color: b.noteStyle?.textColor || '#000000',
    };
  }, [b.noteStyle]);

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
    if (!isSection || isSectionEditing) return;
    const newValue = b.note ?? "";
    if (sectionValueRef.current !== newValue) {
      setSectionValue(newValue);
      sectionValueRef.current = newValue;
    }
  }, [b.id, b.note, isSection, isSectionEditing]);

  const [linkCardShowText, setLinkCardShowText] = React.useState(true);
  const [linkCardHeightPx, setLinkCardHeightPx] = React.useState(0);

  React.useLayoutEffect(() => {
    if (b.type !== "link") return;
    const el = revealRef.current;
    if (!el) return;

    const update = () => {
      const { height: h, width: w } = el.getBoundingClientRect();
      setLinkCardHeightPx(h);
      const cs = colSpan ?? 1;
      setLinkCardShowText((prev) => {
        const showNow =
          h >= LINK_CARD_TEXT_SHOW_MIN_H || w >= LINK_CARD_TEXT_SHOW_MIN_W || cs >= 2;
        const hideNow =
          cs === 1 && h < LINK_CARD_TEXT_HIDE_MAX_H && w < LINK_CARD_TEXT_HIDE_MAX_W;
        if (showNow) return true;
        if (hideNow) return false;
        return prev;
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [b.type, b.id, colSpan]);

  React.useEffect(() => {
    const url = b.type === "link" ? b.linkUrl : b.type === "social" ? b.socialUrl : undefined;
    if (!url) { setLinkMetadata(null); return; }

    setSocialAvatarError(false);

    // Instant: serve from localStorage cache
    const cached = getMetadataCache(url);
    if (cached) {
      setLinkMetadata(cached);
      setLoadingMetadata(false);
      return;
    }

    setLoadingMetadata(true);
    setLinkMetadata(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    getLinkMetadata(url, controller.signal)
      .then((data) => {
        setLinkMetadata(data);
        setMetadataCache(url, data);
      })
      .catch(() => { /* silent — show fallback content */ })
      .finally(() => {
        clearTimeout(timeout);
        setLoadingMetadata(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [b.type, b.linkUrl, b.socialUrl]);

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

  const socialIconSize = 56;  // единый размер для всех соцсетей
  const playButtonSize = 72;

  const musicKind = React.useMemo(
    () => (b.type === "music" && b.musicEmbed ? classifyMusic(b.musicEmbed) : null),
    [b.id, b.type, b.musicEmbed]
  );
  const yandexTrackCard = musicKind?.kind === "yandex";
  /** Масштабирование под маленькую ячейку (без обрезки); фото — отдельно через contain; Я.Музыка — своя вёрстка */
  const useContentScale =
    !isSection &&
    b.type !== "photo" &&
    b.type !== "link" &&
    b.type !== "map" &&
    !(b.type === "music" && yandexTrackCard);

  const scaleDeps = React.useMemo(
    () =>
      [
        b.id,
        b.type,
        colSpan ?? 1,
        loadingMetadata,
        linkMetadata?.image,
        linkMetadata?.title,
        linkMetadata?.description,
        isVideoPlaying,
        b.note,
        b.linkUrl,
        b.socialUrl,
        b.socialType,
        b.videoUrl,
        b.musicEmbed,
        b.mapLat,
        b.mapLng,
        musicKind?.kind,
      ] as const,
    [
      b.id,
      b.type,
      colSpan,
      loadingMetadata,
      linkMetadata?.image,
      linkMetadata?.title,
      linkMetadata?.description,
      isVideoPlaying,
      b.note,
      b.linkUrl,
      b.socialUrl,
      b.socialType,
      b.videoUrl,
      b.musicEmbed,
      b.mapLat,
      b.mapLng,
      musicKind?.kind,
    ],
  );

  const cardStyle: React.CSSProperties = {
    padding: b.type === "photo" || yandexTrackCard || b.type === "link" ? "0" : "16px",
    position: "relative",
    transition: isDragPreview ? "none" : "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: isSection ? "center" : undefined,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    userSelect: "none",
    borderRadius: isSection ? "var(--radius-md)" : "var(--radius-md)",
    ...(b.type === "link" && {
      background: "transparent",
    }),
    ...((b.type === "note") && {
      overflowX: "hidden",
      overflowY: useContentScale ? "hidden" : "auto",
      ...(b.noteStyle?.backgroundColor && { backgroundColor: b.noteStyle.backgroundColor }),
      ...(b.noteStyle?.textColor && { color: b.noteStyle.textColor }),
    }),
    ...(b.type !== "note" && { overflow: "hidden" }),
    ...(yandexTrackCard
      ? { height: "auto", minHeight: 0, flexShrink: 0 }
      : { height: "100%" }),
    pointerEvents: isDragPreview ? "none" : undefined,
    ...(isSection && isSectionEditable && !isPublic && {
      background: (isHovered || isSectionFocused) ? "var(--surface)" : "transparent",
      border: (isHovered || isSectionFocused) ? "1px solid var(--border)" : "none",
      boxShadow: (isHovered || isSectionFocused) ? "var(--shadow-md)" : "none",
    }),
    ...(isSection && (!isSectionEditable || isPublic) && {
      background: "transparent",
      border: "none",
      boxShadow: "none",
    }),
    ...(isDragPreview && isSection && {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-md)",
  }),
  };

  const scrollableContentStyle: React.CSSProperties = { paddingRight: 4 };

  const cardBodyStyle: React.CSSProperties = {
    flex: yandexTrackCard ? "0 0 auto" : 1,
    position: "relative",
    zIndex: 0,
    minHeight: 0,
    overflow: yandexTrackCard ? "visible" : "hidden",
    ...(b.type === "link" && {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    }),
  };

  return (
    <div
      ref={revealRef}
      className={[
        "card",
        yandexTrackCard ? "yandex-music-card" : "",
        b.type === "link" ? "card--link" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={cardStyle}
      {...sortableProps}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (showEditorHeader) {
          const header = e.currentTarget.querySelector(".card-edit-header") as HTMLElement | null;
          if (header) {
            header.style.opacity = "1";
            header.style.visibility = "visible";
          }
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (showEditorHeader) {
          const header = e.currentTarget.querySelector(".card-edit-header") as HTMLElement | null;
          if (header) {
            header.style.opacity = "0";
            header.style.visibility = "hidden";
          }
        }
      }}
    >

      <div style={cardBodyStyle}>
      {isSection && (
        <div
          className="card__content section-card__content"
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
          }}
        >
          {isSectionEditable ? (
            <div className="section-card__input-wrap">
              <span className="section-card__input-sizer" aria-hidden="true">
                {sectionValue || "Новый раздел"}
              </span>
              <input
                className="section-card__input"
                type="text"
                value={sectionValue}
                placeholder="Новый раздел"
                maxLength={80}
                style={sectionTextCss}
                data-testid="section-title-input"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSectionValue(nextValue);
                  sectionValueRef.current = nextValue;
                  if (saveNoteDebounceRef.current) clearTimeout(saveNoteDebounceRef.current);
                  saveNoteDebounceRef.current = setTimeout(() => {
                    const normalized = nextValue.trim();
                    const prev = (b.note ?? "").trim();
                    if (normalized !== prev) {
                      onUpdate?.({ note: normalized || null });
                    }
                  }, 500);
                }}
                onFocus={() => {
                  setIsSectionFocused(true);
                  setIsSectionEditing(true);
                }}
                onBlur={() => {
                  setIsSectionFocused(false);
                  setIsSectionEditing(false);
                  const normalized = sectionValue.trim();
                  const prev = (b.note ?? "").trim();
                  if (normalized !== prev) {
                    onUpdate?.({ note: normalized || null });
                  }
                }}
              />
            </div>
          ) : (
            <div
              className="section-card__label"
              title={b.note ?? ""}
              style={sectionTextCss}
            >
              {b.note ?? "Раздел"}
            </div>
          )}
        </div>
      )}

      {b.type === "photo" && b.photoUrl && (
        <div
          style={{
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
          }}
        >
          <img
            src={getImageUrl(b.photoUrl)}
            alt=""
            className="photo"
            loading="lazy"
            decoding="async"
            draggable={showEditorHeader ? false : undefined}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {b.type === "link" && b.linkUrl && (() => {
        const isVertical = (colSpan ?? 1) === 1;
        /** Не уменьшаем иконку в «компактном» режиме — только скрываем текст */
        const iconBox = LINK_TILE_ICON_PX;

        const linkTilePanel: React.CSSProperties = {
          flex: 1,
          minHeight: 0,
          alignSelf: "stretch",
          width: "100%",
          boxSizing: "border-box",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        };

        const linkFill: React.CSSProperties = {
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          height: "100%",
          width: "100%",
          boxSizing: "border-box",
        };

        const rowStyle = (textMode: boolean): React.CSSProperties => ({
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: textMode ? (isVertical ? "flex-start" : "center") : "center",
          justifyContent: textMode ? "flex-start" : "center",
          gap: 12,
          flex: 1,
          minHeight: 0,
          width: "100%",
        });

        const socialInfo = getSocialInfo(b.linkUrl);
        const isSupported = socialInfo.platform !== "other";

        if (isSupported) {
          let IconComponent = null;
          switch (socialInfo.platform) {
            case "telegram": IconComponent = TelegramIcon; break;
            case "instagram": IconComponent = InstagramIcon; break;
            case "vk": IconComponent = VKIcon; break;
            case "twitter": IconComponent = TwitterIcon; break;
            case "linkedin": IconComponent = LinkedInIcon; break;
            case "github": IconComponent = GitHubIcon; break;
            case "youtube": IconComponent = YouTubeIcon; break;
            case "dribbble": IconComponent = DribbbleIcon; break;
            case "behance": IconComponent = BehanceIcon; break;
            case "max": IconComponent = MaxIcon; break;
            case "dprofile": IconComponent = DprofileIcon; break;
            case "figma": IconComponent = FigmaIcon; break;
            case "pinterest": IconComponent = PinterestIcon; break;
            case "tiktok": IconComponent = TikTokIcon; break;
            case "spotify": IconComponent = SpotifyIcon; break;
            default: break;
          }

          if (!IconComponent) return null;

          return (
            <>
              <a
                href={b.linkUrl}
                target="_blank"
                rel="noreferrer"
                style={{ ...linkFill, cursor: "pointer" }}
                data-draggable-tile-link=""
              >
                <div style={linkTilePanel}>
                  <div style={rowStyle(linkCardShowText)}>
                    <span style={{ flexShrink: 0, lineHeight: 0 }}>
                      {linkMetadata?.image ? (
                        <img
                          src={linkMetadata.image}
                          alt=""
                          draggable={false}
                          style={{
                            width: iconBox,
                            height: iconBox,
                            borderRadius: 12,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <IconComponent width={iconBox} height={iconBox} fill="white" />
                      )}
                    </span>
                    {linkCardShowText ? (
                      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 2 }}>{socialInfo.name}</div>
                        {(linkMetadata?.title || socialInfo.username) ? (
                          <div
                            style={{
                              fontSize: 14,
                              color: "var(--muted)",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {linkMetadata?.title || socialInfo.username}
                          </div>
                        ) : null}
                        {linkMetadata?.description ? (
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--muted)",
                              lineHeight: 1.4,
                              marginTop: 3,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {linkMetadata.description}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </a>
              {showEditorHeader ? <LinkEditorEdgeDragRails /> : null}
            </>
          );
        }

        const host = safeDomain(b.linkUrl);
        const hostKey = host.replace(/^www\./i, "").toLowerCase().replace(/\/$/, "");
        const titleRaw = linkMetadata?.title?.trim() ?? "";
        const descRaw = linkMetadata?.description?.trim() ?? "";

        const redundantTitle = (t: string) => {
          if (!t) return true;
          const k = t.replace(/^www\./i, "").toLowerCase().replace(/\/$/, "");
          return k === hostKey || t === b.linkUrl;
        };
        const redundantDesc = (d: string) => {
          if (!d) return true;
          if (d === b.linkUrl) return true;
          if (/^https?:\/\//i.test(d)) return true;
          const k = d.replace(/^www\./i, "").toLowerCase().replace(/\/$/, "");
          return k === hostKey;
        };

        const headline = !redundantTitle(titleRaw) ? titleRaw : brandLabelFromHost(host);

        const subCandidate = (() => {
          if (!linkCardShowText) return null;
          if (!redundantDesc(descRaw)) return descRaw;
          return shortUrlPath(b.linkUrl, { maxLen: linkCardHeightPx >= 260 ? null : 52 });
        })();

        const subline = subCandidate && subCandidate !== headline ? subCandidate : null;

        /** Высокая карточка — подпись скроллится; иначе до 4 строк при достаточной высоте ячейки */
        const sublineExpand = linkCardShowText && linkCardHeightPx >= 260;
        const sublineClampLines = linkCardHeightPx >= 220 ? 4 : 2;

        const thumbStyle: React.CSSProperties = {
          width: iconBox,
          height: iconBox,
          borderRadius: 12,
          flexShrink: 0,
          display: "block",
        };

        return (
          <>
            <a
              href={b.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...linkFill, cursor: "pointer" }}
              data-draggable-tile-link=""
            >
              <div style={linkTilePanel}>
                {loadingMetadata ? (
                  <div
                    style={{
                      ...rowStyle(true),
                      flex: 1,
                      color: "var(--muted)",
                      fontSize: 14,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {linkCardShowText ? "Загрузка…" : "…"}
                  </div>
                ) : (
                  <div style={rowStyle(linkCardShowText)}>
                    {linkMetadata?.image ? (
                      <img
                        src={linkMetadata.image}
                        alt=""
                        draggable={showEditorHeader ? false : undefined}
                        style={{ ...thumbStyle, objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src={faviconUrlForHost(host)}
                        alt=""
                        draggable={false}
                        style={{ ...thumbStyle, objectFit: "contain", background: "var(--bg)" }}
                      />
                    )}
                    {linkCardShowText ? (
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignSelf: "stretch",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "var(--text)",
                            marginBottom: subline ? 4 : 0,
                            lineHeight: 1.35,
                            wordBreak: "break-word",
                            flexShrink: 0,
                          }}
                        >
                          {headline}
                        </div>
                        {subline ? (
                          <div
                            style={{
                              fontSize: 14,
                              color: "var(--muted)",
                              lineHeight: 1.45,
                              wordBreak: "break-word",
                              ...(sublineExpand
                                ? {
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    WebkitOverflowScrolling: "touch",
                                  }
                                : {
                                    display: "-webkit-box",
                                    WebkitLineClamp: sublineClampLines,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }),
                            }}
                          >
                            {subline}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </a>
            {showEditorHeader ? <LinkEditorEdgeDragRails /> : null}
          </>
        );
      })()}

      {b.type === "music" && b.musicEmbed && musicKind?.kind === "yandex" && (
        <div style={{ position: "relative", width: "100%", maxWidth: YANDEX_MUSIC_IFRAME_MAX_WIDTH_PX, margin: "0 auto" }}>
          <iframe
            className="yandex-music-embed"
            title="Яндекс Музыка"
            src={musicKind.src}
            loading="lazy"
            allow="clipboard-write; autoplay; encrypted-media"
            width={YANDEX_MUSIC_IFRAME_MAX_WIDTH_PX}
            height={YANDEX_MUSIC_IFRAME_HEIGHT_PX}
          />
          <EditorIframeEdgeDragHandles show={showEditorHeader && !isDragPreview} />
        </div>
      )}

      {b.type === "map" && b.mapLat != null && b.mapLng != null && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, flex: 1 }}>
          <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
            <iframe
              className="embed"
              src={`https://yandex.ru/map-widget/v1/?ll=${b.mapLng}%2C${b.mapLat}&pt=${b.mapLng}%2C${b.mapLat}&z=14`}
              loading="lazy"
              title="Карта"
              style={{
                borderRadius: "var(--radius-sm)",
                width: "100%",
                height: "100%",
                pointerEvents: showEditorHeader ? "none" : "auto",
              }}
            />
            <EditorIframeEdgeDragHandles show={showEditorHeader && !isDragPreview} />
          </div>
          {!showEditorHeader && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8, position: "relative", zIndex: 3, flexShrink: 0 }}>
              <a href={`https://yandex.ru/maps/?pt=${b.mapLng},${b.mapLat}&z=14`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>Яндекс.Карты <span>→</span></a>
              <a href={`https://2gis.ru/search/${b.mapLat},${b.mapLng}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>2ГИС <span>→</span></a>
            </div>
          )}
        </div>
      )}

      {!isSection && useContentScale && (
        <CardContentScaleToFit
          deps={[...scaleDeps]}
          layoutReferenceWidthPx={280}
          passthrough={showEditorHeader}
        >
        {b.type === "note" && (() => {
          const ns = b.noteStyle;
          const textCss = noteStyleToTextCss(ns);
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
            else if (type === "foreColor" && value) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (el.contains(range.commonAncestorContainer)) {
                  const fragment = range.extractContents();
                  const div = document.createElement('div');
                  div.appendChild(fragment);

                  const walk = (node: Node): Node[] => {
                    if (node.nodeType === Node.TEXT_NODE) return [node];
                    const e = node as HTMLElement;
                    const tag = e.tagName.toLowerCase();
                    const isColorTag = tag === 'font' ||
                      (tag === 'span' && e.style?.color && e.style.color !== '');
                    if (isColorTag) {
                      return Array.from(e.childNodes).flatMap(walk);
                    }
                    const c = e.cloneNode(false) as HTMLElement;
                    Array.from(e.childNodes).flatMap(walk).forEach(n => c.appendChild(n));
                    return [c];
                  };

                  const span = document.createElement('span');
                  span.style.color = value;
                  span.style.setProperty('-webkit-text-fill-color', value);
                  Array.from(div.childNodes).flatMap(walk).forEach(n => span.appendChild(n));
                  range.insertNode(span);

                  sel.removeAllRanges();
                  const r = document.createRange();
                  r.selectNodeContents(span);
                  sel.addRange(r);
                }
              }
            }
            saveNoteContent();
          };

          return (
            <div
              className="card__content"
              style={{
                ...scrollableContentStyle,
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                    if (e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 15,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    outline: "none",
                    minHeight: 24,
                    cursor: "text",
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
              {editable && selectionRect && createPortal(
                <NoteFloatingToolbar
                  rect={selectionRect}
                  noteStyle={ns}
                  onInlineFormat={applyInlineFormat}
                  onAlignChange={(align) => onUpdate?.({ noteStyle: { ...ns, align } })}
                />,
                document.body
              )}
            </div>
          );
        })()}

        {b.type === "video" && b.videoUrl && (() => {
          const vid = extractYouTubeId(b.videoUrl);
          const vkEmbedSrc = extractVKVideoId(b.videoUrl) ? toVKVideoEmbed(b.videoUrl) : null;

          if (!isVideoPlaying && vid) {
            return (
              <div onClick={() => setIsVideoPlaying(true)} title="Смотреть" style={{ cursor: "pointer", position: "relative", borderRadius: "var(--radius-sm)", overflow: "hidden", height: "100%" }}>
                <img src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="Превью видео" className="photo" loading="lazy" decoding="async" draggable={showEditorHeader ? false : undefined} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: playButtonSize, height: playButtonSize, borderRadius: "50%", background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>▶</div>
              </div>
            );
          }

          if (isVideoPlaying && vid) {
            return (
              <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, flex: 1, borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <iframe className="embed" src={toYouTubeEmbed(b.videoUrl) + "?autoplay=1&rel=0&modestbranding=1"} title="Видео" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />
                <EditorIframeEdgeDragHandles show={showEditorHeader && !isDragPreview} />
              </div>
            );
          }

          if (vkEmbedSrc) {
            return (
              <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, flex: 1, borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <iframe className="embed" src={vkEmbedSrc} title="VK Видео" loading="lazy" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />
                <EditorIframeEdgeDragHandles show={showEditorHeader && !isDragPreview} />
              </div>
            );
          }

          return <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Видео</div>;
        })()}

        {b.type === "music" && b.musicEmbed && musicKind && musicKind.kind !== "yandex" && (() => {
          const kind = musicKind;
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
            return (
              <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, flex: 1, borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <iframe className="embed" src={kind.src} title="Музыка" loading="lazy" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: "var(--radius-sm)", width: "100%", height: "100%" }} />
                <EditorIframeEdgeDragHandles show={showEditorHeader && !isDragPreview} />
              </div>
            );
          }
          return <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", position: "relative", width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: kind.html }} />;
        })()}

        {b.type === "social" && b.socialType && b.socialUrl && (() => {
          let IconComponent = null;
          let name = '';
          const platform = b.socialType;

          switch (platform) {
            case 'telegram': IconComponent = TelegramIcon; name = 'Telegram'; break;
            case 'instagram': IconComponent = InstagramIcon; name = 'Instagram'; break;
            case 'vk': IconComponent = VKIcon; name = 'VK'; break;
            case 'twitter': IconComponent = TwitterIcon; name = 'Twitter'; break;
            case 'linkedin': IconComponent = LinkedInIcon; name = 'LinkedIn'; break;
            case 'github': IconComponent = GitHubIcon; name = 'GitHub'; break;
            case 'youtube': IconComponent = YouTubeIcon; name = 'YouTube'; break;
            case 'dribbble': IconComponent = DribbbleIcon; name = 'Dribbble'; break;
            case 'behance': IconComponent = BehanceIcon; name = 'Behance'; break;
            case 'max': IconComponent = MaxIcon; name = 'Max'; break;
            case 'dprofile': IconComponent = DprofileIcon; name = 'Dprofile'; break;
            case 'figma': IconComponent = FigmaIcon; name = 'Figma'; break;
            case 'pinterest': IconComponent = PinterestIcon; name = 'Pinterest'; break;
            case 'tiktok': IconComponent = TikTokIcon; name = 'TikTok'; break;
            case 'spotify': IconComponent = SpotifyIcon; name = 'Spotify'; break;
            default: return null;
          }

          const username = b.socialUrl.replace(/^https?:\/\//, '')
              .replace(/^www\./, '')
              .replace(/^t\.me\//, '')
              .replace(/^vk\.com\//, '')
              .replace(/^instagram\.com\//, '')
              .replace(/^twitter\.com\//, '')
              .replace(/^linkedin\.com\/in\//, '')
              .replace(/^github\.com\//, '')
              .replace(/^youtube\.com\/@/, '')
              .replace(/^dribbble\.com\//, '')
              .replace(/^behance\.net\//, '')
              .replace(/^max\.ru\//, '')
              .replace(/^dprofile\.ru\//, '')
              .replace(/^figma\.com\/@/, '')
              .replace(/^pinterest\.com\//, '')
              .replace(/^tiktok\.com\/@/, '')
              .replace(/^spotify\.com\//, '');

          const isVertical = colSpan === 1;
          const hasAvatar = Boolean(linkMetadata?.image) && !socialAvatarError;
          const ogTitle = cleanSocialTitle(linkMetadata?.title, name);
          const ogBio = cleanSocialBio(linkMetadata?.description, name);

          return (
            <a href={b.socialUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', ...scrollableContentStyle }} data-draggable-tile-link="">
              {/*
                Key layout constraint: this content lives inside CardContentScaleToFit whose
                inner div is fixed at 280px. The scaler measures scrollWidth to compute the
                scale factor, so nothing here must overflow 280px.
                - Outer flex uses default alignItems:stretch so text block fills full width.
                - Icon uses alignSelf:center so it stays centered rather than stretching.
                - Text block is therefore always bounded at 280px → scrollWidth stays correct.
              */}
              <div style={{
                display: 'flex',
                flexDirection: isVertical ? 'column' : 'row',
                gap: 12,
                width: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}>
                {/* Avatar (OG image) or fallback platform icon */}
                <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignSelf: 'center' }}>
                  {hasAvatar ? (
                    <>
                      <img
                        src={linkMetadata!.image}
                        alt=""
                        draggable={false}
                        onError={() => setSocialAvatarError(true)}
                        style={{
                          width: socialIconSize,
                          height: socialIconSize,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <IconComponent
                        width={24}
                        height={24}
                        fill="white"
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          display: 'block',
                        }}
                      />
                    </>
                  ) : (
                    <IconComponent width={socialIconSize} height={socialIconSize} fill="white" />
                  )}
                </div>

                {/* Text: platform name, display name/username, bio.
                    flex:1 + minWidth:0 bounds width in row mode.
                    In column mode, alignItems:stretch (default) makes this fill full width. */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: 'var(--text)',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </div>
                  {(ogTitle || username) ? (
                    <div style={{
                      fontSize: 14,
                      color: 'var(--muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {ogTitle || username}
                    </div>
                  ) : null}
                  {ogBio ? (
                    <div ref={bioRef} style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      marginTop: 3,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: bioMaxLines,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}>
                      {ogBio}
                    </div>
                  ) : null}
                </div>
              </div>
            </a>
          );
        })()}
        </CardContentScaleToFit>
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
