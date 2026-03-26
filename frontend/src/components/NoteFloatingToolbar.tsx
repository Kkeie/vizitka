import React from "react";

const ALIGN_LEFT = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 5h16v2H4V5zm0 4h10v2H4V9zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
  </svg>
);
const ALIGN_CENTER = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 5h16v2H4V5zm4 4h8v2H8V9zm-4 4h16v2H4v-2zm4 4h8v2H8v-2z" />
  </svg>
);
const ALIGN_RIGHT = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 5h16v2H4V5zm10 4h10v2H14V9zm-10 4h16v2H4v-2zm10 4h10v2H14v-2z" />
  </svg>
);
const BOLD = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
  </svg>
);
const ITALIC = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
  </svg>
);
const LINK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);

const btnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  minWidth: 28,
  minHeight: 28,
  maxWidth: 28,
  maxHeight: 28,
  padding: 0,
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  color: "#fff",
  transition: "background 0.15s",
  boxSizing: "border-box",
};

export type InlineFormatType = "bold" | "italic" | "foreColor";

interface NoteFloatingToolbarProps {
  rect: DOMRect;
  noteStyle: { align?: "left" | "center" | "right" } | null | undefined;
  onInlineFormat: (type: InlineFormatType, value?: string) => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onLinkClick?: () => void;
}

export default function NoteFloatingToolbar({
  rect,
  noteStyle,
  onInlineFormat,
  onAlignChange,
  onLinkClick,
}: NoteFloatingToolbarProps) {
  const align = noteStyle?.align || "left";
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: rect.bottom + 8, left: rect.left });

  React.useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const toolbarRect = el.getBoundingClientRect();
    let left = rect.left + (rect.width - toolbarRect.width) / 2;
    const padding = 12;
    if (left < padding) left = padding;
    if (left + toolbarRect.width > window.innerWidth - padding) {
      left = window.innerWidth - toolbarRect.width - padding;
    }
    let top = rect.bottom + 8;
    if (top + toolbarRect.height > window.innerHeight - padding) {
      top = rect.top - toolbarRect.height - 8;
    }
    setPosition({ top, left });
  }, [rect]);

  return (
    <div
      ref={toolbarRef}
      className="note-floating-toolbar"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        background: "#1a1a1a",
        borderRadius: 6,
        padding: "4px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "4px",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 10000,
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).tagName === "BUTTON") {
          e.preventDefault();
        }
      }}
    >
      <button
        type="button"
        title="По левому краю"
        style={{ ...btnStyle, color: align === "left" ? "#fff" : "rgba(255,255,255,0.7)" }}
        onClick={() => onAlignChange("left")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {ALIGN_LEFT}
      </button>
      <button
        type="button"
        title="По центру"
        style={{ ...btnStyle, color: align === "center" ? "#fff" : "rgba(255,255,255,0.7)" }}
        onClick={() => onAlignChange("center")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {ALIGN_CENTER}
      </button>
      <button
        type="button"
        title="По правому краю"
        style={{ ...btnStyle, color: align === "right" ? "#fff" : "rgba(255,255,255,0.7)" }}
        onClick={() => onAlignChange("right")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {ALIGN_RIGHT}
      </button>

      <div style={{ width: 1, height: 20, background: "#444", margin: "0 4px" }} />

      <button
        type="button"
        title="Жирный"
        style={btnStyle}
        onClick={() => onInlineFormat("bold")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {BOLD}
      </button>
      <button
        type="button"
        title="Курсив"
        style={btnStyle}
        onClick={() => onInlineFormat("italic")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {ITALIC}
      </button>

      <div style={{ width: 1, height: 20, background: "#444", margin: "0 4px" }} />

      <label
        title="Цвет текста"
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="color"
          defaultValue="#0a0a0a"
          onChange={(e) => onInlineFormat("foreColor", e.target.value)}
          style={{
            width: 28,
            height: 28,
            padding: 0,
            border: "2px solid rgba(255,255,255,0.5)",
            borderRadius: 4,
            cursor: "pointer",
            background: "transparent",
          }}
        />
      </label>

      {onLinkClick && (
        <>
          <div style={{ width: 1, height: 20, background: "#444", margin: "0 4px" }} />
          <button
            type="button"
            title="Ссылка"
            style={btnStyle}
            onClick={onLinkClick}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {LINK}
          </button>
        </>
      )}
    </div>
  );
}