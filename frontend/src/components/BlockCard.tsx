import React from "react";
import { useReveal } from "../hooks/useReveal";
import { extractYouTubeId, toYouTubeEmbed, classifyMusic, osmEmbedUrl, osmLink } from "../lib/embed";

// Твой тип блока: поля названы как мы ранее использовали в API
export type Block = {
  id: number;
  type: "note" | "link" | "photo" | "video" | "music" | "map";
  note?: string | null;
  linkUrl?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  musicEmbed?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
};

export default function BlockCard({ b, onDelete }: { b: Block; onDelete?: () => void; }) {
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const rootRef = useReveal<HTMLDivElement>();

  const typeLabels: Record<string, string> = {
    note: "Заметка",
    link: "Ссылка",
    photo: "Фото",
    video: "Видео",
    music: "Музыка",
    map: "Карта",
  };

  const typeColors: Record<string, string> = {
    note: "#6366f1",
    link: "#8b5cf6",
    photo: "#ec4899",
    video: "#ef4444",
    music: "#10b981",
    map: "#06b6d4",
  };

  return (
    <div
      ref={rootRef}
      className="card"
      style={{
        padding: 24,
        position: "relative",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        minHeight: "fit-content",
        height: "fit-content",
        userSelect: "none",
      }}
    >
      {/* Header with type badge and delete button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          marginLeft: b.type === "note" ? 0 : 0,
          position: "relative",
          zIndex: 1,
        }}
      >
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
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#dc2626",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.borderColor = "#fecaca";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            Удалить
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: "relative", zIndex: 0, minHeight: "auto" }}>
        {b.type === "note" && (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--text)", fontSize: 15, wordBreak: "break-word", overflowWrap: "break-word" }}>
            {b.note}
          </div>
        )}

        {b.type === "link" && b.linkUrl && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 16, color: "var(--text)", lineHeight: 1.4 }}>
              {safeDomain(b.linkUrl)}
            </div>
            <a
              href={b.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ fontSize: 14, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Открыть
              <span>↗</span>
            </a>
          </div>
        )}

        {b.type === "photo" && b.photoUrl && (
          <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", marginTop: -8 }}>
            <img src={b.photoUrl} alt="" className="photo" loading="lazy" decoding="async" />
          </div>
        )}

        {b.type === "video" && b.videoUrl && (() => {
          const vid = extractYouTubeId(b.videoUrl);
          const embedSrc = toYouTubeEmbed(b.videoUrl) + (isVideoPlaying ? "?autoplay=1&rel=0&modestbranding=1" : "");
          if (!isVideoPlaying) {
            return (
              <div
                onClick={() => setIsVideoPlaying(true)}
                title="Смотреть"
                style={{
                  cursor: "pointer",
                  position: "relative",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  marginTop: -8,
                }}
              >
                {vid ? (
                  <>
                    <img
                      src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`}
                      alt="Превью видео"
                      className="photo"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "rgba(0, 0, 0, 0.75)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        color: "#fff",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
                        e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.75)";
                        e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                      }}
                    >
                      ▶
                    </div>
                  </>
                ) : (
                  <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                    Видео
                  </div>
                )}
              </div>
            );
          }
          return (
            <iframe
              className="embed"
              src={embedSrc}
              title="Видео"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: "var(--radius-sm)", marginTop: -8 }}
            />
          );
        })()}

        {b.type === "music" && b.musicEmbed && (() => {
          const kind = classifyMusic(b.musicEmbed);
          if (kind.kind === "audio") {
            return (
              <div style={{ padding: 16, borderRadius: "var(--radius-sm)", background: "var(--bg)", marginTop: -8 }}>
                <audio className="audio" controls style={{ width: "100%" }}>
                  <source src={kind.src} />
                  Ваш браузер не поддерживает аудио.
                </audio>
                <div className="muted" style={{ fontSize: 12, marginTop: 10, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {kind.src}
                </div>
              </div>
            );
          }
          if (kind.kind === "spotify" || kind.kind === "soundcloud" || kind.kind === "youtube") {
            return (
              <iframe
                className="embed"
                src={kind.src}
                title="Музыка"
                loading="lazy"
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ borderRadius: "var(--radius-sm)", marginTop: -8 }}
              />
            );
          }
          return (
            <div 
              style={{ 
                borderRadius: "var(--radius-sm)", 
                overflow: "hidden", 
                marginTop: -8,
                position: "relative",
                width: "100%",
              }} 
              dangerouslySetInnerHTML={{ __html: kind.html }}
            />
          );
        })()}

        {b.type === "map" && b.mapLat != null && b.mapLng != null && (
          <div>
            <iframe
              className="embed"
              src={osmEmbedUrl(b.mapLat!, b.mapLng!, 14)}
              loading="lazy"
              title="Карта"
              style={{ borderRadius: "var(--radius-sm)", marginTop: -8 }}
            />
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <a
                href={osmLink(b.mapLat!, b.mapLng!, 14)}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--primary)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Открыть на карте
                <span>→</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function safeDomain(href?: string | null) {
  if (!href) return "";
  try { return new URL(href).host.replace("www.", ""); } catch { return href; }
}
