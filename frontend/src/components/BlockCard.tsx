import React from "react";
import { createPortal } from "react-dom";
import { useReveal } from "../hooks/useReveal";
import { extractYouTubeId, toYouTubeEmbed, extractVKVideoId, toVKVideoEmbed, classifyMusic } from "../lib/embed";
import { getSocialInfo } from '../lib/social-preview';
import { 
  TwitterIcon, InstagramIcon, LinkedInIcon, GitHubIcon, 
  YouTubeIcon, DribbbleIcon, BehanceIcon, TelegramIcon, VKIcon 
} from './SocialIcons';
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
  socialType?: "telegram" | "vk" | "instagram" | "twitter" | "linkedin" | "github" | "youtube" | "dribbble" | "behance" | null;
  socialUrl?: string | null;
};

export default function BlockCard({
  b,
  onDelete,
  onUpdate,
  isDragPreview,
  sortableProps,
  colSpan,   
}: {
  b: Block;
  onDelete?: () => void;
  onUpdate?: (partial: Partial<Block>) => void;
  isDragPreview?: boolean;
  /** Слушатели dnd-kit только на карточке, не на родителе с ручками ресайза */
  sortableProps?: React.HTMLAttributes<HTMLDivElement>;
  colSpan?: number;  
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
  const [isHovered, setIsHovered] = React.useState(false);
  const [isSectionFocused, setIsSectionFocused] = React.useState(false);
  const isPublic = !onUpdate && !onDelete;

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
      const socialInfo = getSocialInfo(b.linkUrl);
      // Для поддерживаемых соцсетей метаданные не нужны
      if (socialInfo.platform !== 'other') {
        setLinkMetadata(null);
        setLoadingMetadata(false);
        return;
      }
      setLoadingMetadata(true);
      setLinkMetadata(null);
      getLinkMetadata(b.linkUrl)
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

  const socialIconSize = 56;  // единый размер для всех соцсетей
  const previewTileSize = 64; // для обычных ссылок (не соцсетей)
  const playButtonSize = 72;

  const cardStyle: React.CSSProperties = {
    padding: b.type === "photo" ? "0" : "16px",
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
    overflow: isSection ? "visible" : "hidden",
    height: "100%",
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
  };

  const scrollableContentStyle: React.CSSProperties = { height: "100%", overflowY: "auto", paddingRight: 4, minHeight: 0 };

  return (
    <div
      ref={revealRef}
      className="card"
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

      <div style={{ flex: 1, position: "relative", zIndex: 0, minHeight: 0, overflow: "hidden" }}>
      {isSection && (
        <div
          className="card__content"
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
          }}
        >
          {isSectionEditable ? (
            <input
              className="input"
              type="text"
              value={sectionValue}
              placeholder="Новый раздел"
              maxLength={80}
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
                if (saveNoteDebounceRef.current) clearTimeout(saveNoteDebounceRef.current);
                saveNoteDebounceRef.current = setTimeout(() => {
                  const normalized = nextValue.trim();
                  const prev = (b.note ?? "").trim();
                  if (normalized !== prev) {
                    onUpdate?.({ note: normalized || null });
                  }
                }, 500);
              }}
              onFocus={() => setIsSectionFocused(true)}
              onBlur={() => {
                setIsSectionFocused(false);
                const normalized = sectionValue.trim();
                const prev = (b.note ?? "").trim();
                if (normalized !== prev) {
                  onUpdate?.({ note: normalized || null });
                }
              }}
              style={{
                width: "100%",
                maxWidth: "100%",
                padding: "0",
                textAlign: "left",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "normal",
                textTransform: "none",
                borderRadius: 0,
                border: "none",
                background: "transparent",
                boxShadow: "none",
                outline: "none",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                padding: "0",
                borderRadius: 0,
                border: "none",
                background: "transparent",
                boxShadow: "none",
                color: "var(--text)",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "normal",
                textTransform: "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "left",
              }}
              title={b.note ?? ""}
            >
              {b.note ?? "Раздел"}
            </div>
          )}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
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

        {b.type === "link" && b.linkUrl && (() => {
          const socialInfo = getSocialInfo(b.linkUrl);
          const isSupported = socialInfo.platform !== 'other';

          if (isSupported) {
            let IconComponent = null;
            switch (socialInfo.platform) {
              case 'telegram': IconComponent = TelegramIcon; break;
              case 'instagram': IconComponent = InstagramIcon; break;
              case 'vk': IconComponent = VKIcon; break;
              case 'twitter': IconComponent = TwitterIcon; break;
              case 'linkedin': IconComponent = LinkedInIcon; break;
              case 'github': IconComponent = GitHubIcon; break;
              case 'youtube': IconComponent = YouTubeIcon; break;
              case 'dribbble': IconComponent = DribbbleIcon; break;
              case 'behance': IconComponent = BehanceIcon; break;
            }
            return (
              <a href={b.linkUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', ...scrollableContentStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: socialIconSize, height: socialIconSize, borderRadius: '12px', background: socialInfo.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {IconComponent && <IconComponent width={32} height={32} fill="white" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{socialInfo.name}</div>
                    {socialInfo.username && <div style={{ fontSize: 14, color: 'var(--muted)' }}>{socialInfo.username}</div>}
                  </div>
                </div>
              </a>
            );
          }

          // Обычная ссылка (не соцсеть) – существующий код с метаданными
          return (
            <div style={{ cursor: "pointer", ...scrollableContentStyle }}>
              {loadingMetadata ? (
                <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-sm)", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Загрузка...
                </div>
              ) : linkMetadata?.image ? (
                <img src={linkMetadata.image} alt="" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-sm)", objectFit: "cover", marginBottom: 12, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: "var(--muted)", fontSize: 13, padding: 12, textAlign: "center" }}>
                  {safeDomain(b.linkUrl)}
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8, color: "var(--text)", lineHeight: 1.4 }}>
                {linkMetadata?.title || safeDomain(b.linkUrl)}
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>
                {linkMetadata?.description || b.linkUrl}
              </div>
            </div>
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

        {b.type === "social" && b.socialType && b.socialUrl && (() => {
          let IconComponent = null;
          let gradient = '';
          let name = '';
          const platform = b.socialType;
          
          switch (platform) {
            case 'telegram':
              IconComponent = TelegramIcon;
              gradient = 'linear-gradient(135deg, #0088cc 0%, #229ED9 100%)';
              name = 'Telegram';
              break;
            case 'instagram':
              IconComponent = InstagramIcon;
              gradient = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
              name = 'Instagram';
              break;
            case 'vk':
              IconComponent = VKIcon;
              gradient = 'linear-gradient(135deg, #0077FF 0%, #4680C2 100%)';
              name = 'VK';
              break;
            case 'twitter':
              IconComponent = TwitterIcon;
              gradient = 'linear-gradient(135deg, #1DA1F2 0%, #0d8de4 100%)';
              name = 'Twitter';
              break;
            case 'linkedin':
              IconComponent = LinkedInIcon;
              gradient = 'linear-gradient(135deg, #0A66C2 0%, #0a5aa5 100%)';
              name = 'LinkedIn';
              break;
            case 'github':
              IconComponent = GitHubIcon;
              gradient = 'linear-gradient(135deg, #333 0%, #24292e 100%)';
              name = 'GitHub';
              break;
            case 'youtube':
              IconComponent = YouTubeIcon;
              gradient = 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)';
              name = 'YouTube';
              break;
            case 'dribbble':
              IconComponent = DribbbleIcon;
              gradient = 'linear-gradient(135deg, #EA4C89 0%, #d33a72 100%)';
              name = 'Dribbble';
              break;
            case 'behance':
              IconComponent = BehanceIcon;
              gradient = 'linear-gradient(135deg, #1769FF 0%, #0f5be5 100%)';
              name = 'Behance';
              break;
            default:
              return null;
          }
          
          const username = b.socialUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^t\.me\//, '').replace(/^vk\.com\//, '').replace(/^instagram\.com\//, '').replace(/^twitter\.com\//, '').replace(/^linkedin\.com\/in\//, '').replace(/^github\.com\//, '').replace(/^youtube\.com\/@/, '').replace(/^dribbble\.com\//, '').replace(/^behance\.net\//, '');
          
          const isVertical = colSpan === 1;
          
          return (
            <a href={b.socialUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', ...scrollableContentStyle }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: isVertical ? 'column' : 'row',
                alignItems: isVertical ? 'flex-start' : 'center',
                gap: 12
              }}>
                <div style={{ 
                  width: socialIconSize, 
                  height: socialIconSize, 
                  borderRadius: '12px', 
                  background: gradient, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0,
                  margin: isVertical ? 0 : undefined
                }}>
                  {IconComponent && <IconComponent width={32} height={32} fill="white" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)' }}>{username || 'Профиль'}</div>
                </div>
              </div>
            </a>
          );
        })()}
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
