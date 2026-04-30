// frontend/src/components/InlineEditCard.tsx
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface InlineEditCardProps {
  anchorRect: DOMRect;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  onCancel: () => void;
  label: string;
  hint?: string;
  placeholder?: string;
  inputType?: "text" | "email" | "tel";
  validation?: (value: string) => boolean;
  format?: (value: string) => string;
  prefix?: string; // необязательный префикс, например "bento.me/"
}

export default function InlineEditCard({
  anchorRect,
  value,
  onSave,
  onCancel,
  label,
  hint,
  placeholder = "",
  inputType = "text",
  validation,
  format,
  prefix,
}: InlineEditCardProps) {
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    let left = anchorRect.right + 8;
    let top = anchorRect.top;

    if (left + cardRect.width > window.innerWidth - 8) {
      left = window.innerWidth - cardRect.width - 8;
    }
    if (left < 8) left = 8;

    if (top + cardRect.height > window.innerHeight - 8) {
      top = window.innerHeight - cardRect.height - 8;
    }
    if (top < 8) top = 8;

    setPosition({ top, left });
    setIsReady(true);
  }, [anchorRect]);

  useEffect(() => {
    if (isReady) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isReady]);

  const handleSave = async () => {
    let finalValue = inputValue.trim();
    if (format) finalValue = format(finalValue);
    if (validation && !validation(finalValue)) {
      setError("Некорректное значение");
      return;
    }
    setLoading(true);
    try {
      await onSave(finalValue);
      onCancel();
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel]);

  return createPortal(
    <div
      ref={cardRef}
      className="card"
      data-inline-edit="true"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 10001,
        width: 280,
        padding: 16,
        visibility: isReady ? "visible" : "hidden",
        opacity: isReady ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
          {label}
        </label>
        {prefix ? (
          <div
            className="prefixed-input"
            style={{
              display: "flex",
              alignItems: "center",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              padding: "0 12px",
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: "var(--muted)",
                fontFamily: "monospace",
                userSelect: "none",
              }}
            >
              {prefix}
            </span>
            <input
              ref={inputRef}
              type={inputType}
              className="input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") onCancel();
              }}
              style={{
                flex: 1,
                border: "none",
                padding: "14px 8px",
                fontSize: 15,
                outline: "none",
                background: "transparent",
                marginBottom: 0,
              }}
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type={inputType}
            className="input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
            style={{ marginBottom: hint ? 8 : 0 }}
          />
        )}
        {hint && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {hint}
          </div>
        )}
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel} style={{ padding: "6px 12px" }}>
          Отмена
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "..." : `Обновить ${label}`}
        </button>
      </div>
    </div>,
    document.body
  );
}