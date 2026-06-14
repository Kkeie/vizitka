import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PRESET_TEXT_COLORS = [
  "#0a0a0a",
  "#ffffff",
  "#f5f5f5",
  "#737373",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const POPOVER_WIDTH = 196;

type Props = {
  label: string;
  value: string | null | undefined;
  fallback: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (color: string) => void;
};

export default function ProfileMenuColorRow({
  label,
  value,
  fallback,
  open,
  onOpenChange,
  onChange,
}: Props) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const [hexDraft, setHexDraft] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const current = (value || fallback).toLowerCase();

  useEffect(() => {
    if (!open || !rowRef.current) return;

    const updatePosition = () => {
      const rect = rowRef.current!.getBoundingClientRect();
      let left = rect.right + 8;
      if (left + POPOVER_WIDTH > window.innerWidth - 8) {
        left = rect.left - POPOVER_WIDTH - 8;
      }
      if (left < 8) left = 8;
      let top = rect.top;
      if (top + 220 > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - 228);
      }
      setPos({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const pickColor = (color: string) => {
    onChange(color);
    onOpenChange(false);
    setHexDraft("");
  };

  const applyHex = () => {
    const normalized = hexDraft.trim();
    if (!HEX_COLOR_RE.test(normalized)) return;
    pickColor(normalized.toLowerCase());
  };

  const rowButtonStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "8px 16px",
    background: open ? "var(--accent)" : "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        data-menu-item="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => onOpenChange(!open)}
        style={rowButtonStyle}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: current,
            border: "1px solid var(--border)",
            flexShrink: 0,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
      </button>

      {open &&
        createPortal(
          <div
            data-profile-color-popover="true"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              zIndex: 10001,
              padding: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  title={color}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickColor(color);
                  }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: color,
                    border: current === color ? "2px solid var(--text)" : "1px solid var(--border)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                placeholder="#000000"
                maxLength={7}
                spellCheck={false}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyHex();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  padding: "6px 8px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--surface)",
                }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "6px 10px" }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  applyHex();
                }}
              >
                OK
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
