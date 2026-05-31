import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

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
  prefix?: string;
  maxLength?: number;
  closing?: boolean;
  exitToRef?: React.RefObject<DOMRect | null>;
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
  maxLength,
  closing = false,
  exitToRef,
}: InlineEditCardProps) {
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, offsetX: 0, offsetY: 0 });
  const [exitOffset, setExitOffset] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const prevClosingRef = useRef(closing);

  useLayoutEffect(() => {
    if (!cardRef.current || ready) return;
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

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const cardCenterX = left + cardRect.width / 2;
    const cardCenterY = top + cardRect.height / 2;
    const ox = anchorCenterX - cardCenterX;
    const oy = anchorCenterY - cardCenterY;

    setPos({ top, left, offsetX: ox, offsetY: oy });
    setExitOffset({ x: ox, y: oy });
    setReady(true);
  }, [anchorRect, ready]);

  useEffect(() => {
    if (ready) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [ready]);

  useEffect(() => {
    if (closing && !prevClosingRef.current) {
      prevClosingRef.current = true;

      if (exitToRef?.current && cardRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const sCX = exitToRef.current.left + exitToRef.current.width / 2;
        const sCY = exitToRef.current.top + exitToRef.current.height / 2;
        const cCX = pos.left + cardRect.width / 2;
        const cCY = pos.top + cardRect.height / 2;
        setExitOffset({ x: sCX - cCX, y: sCY - cCY });
      } else {
        setExitOffset({ x: pos.offsetX, y: pos.offsetY });
      }

      setExiting(true);
      setTimeout(() => onCancelRef.current(), 150);
    } else if (!closing) {
      prevClosingRef.current = false;
    }
  }, [closing]);

  useEffect(() => {
    if (exiting) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExiting(true);
        setTimeout(() => onCancelRef.current(), 150);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExiting(true);
        setTimeout(() => onCancelRef.current(), 150);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [exiting]);

  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => onCancelRef.current(), 150);
  };

  const handleSave = async () => {
    let finalValue = inputValue.trim();
    if (format) finalValue = format(finalValue);
    if (validation && !validation(finalValue)) {
      setError("Некорректное значение");
      return;
    }
    if (exiting) return;
    setLoading(true);
    setError(null);
    try {
      await onSave(finalValue);
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
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
              className="input no-focus-shadow"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
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
            maxLength={maxLength}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
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
        <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: "6px 12px" }}>
          Отмена
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "..." : `Обновить ${label}`}
        </button>
      </div>
    </>
  );

  const animateTarget = useMemo(() => 
    exiting
      ? { x: exitOffset.x, y: exitOffset.y, scale: 0, opacity: 0 }
      : { x: 0, y: 0, scale: 1, opacity: 1 },
    [exiting, exitOffset.x, exitOffset.y]
  );
  const transitionTarget = useMemo(() => 
    exiting ? { duration: 0.15, ease: "easeIn" as const } : { duration: 0.15, ease: "easeOut" as const },
    [exiting]
  );

  if (!ready) {
    return createPortal(
      <div
        ref={cardRef}
        data-inline-edit="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          visibility: "hidden",
          zIndex: 10001,
          width: 280,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow)",
        }}
      >
        {content}
      </div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      key="animated"
      ref={cardRef}
      data-inline-edit="true"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 10001,
        width: 280,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow)",
      }}
      initial={{ x: pos.offsetX, y: pos.offsetY, scale: 0, opacity: 0 }}
      animate={animateTarget}
      transition={transitionTarget}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {content}
    </motion.div>,
    document.body
  );
}
