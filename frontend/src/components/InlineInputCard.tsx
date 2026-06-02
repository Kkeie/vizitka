import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { motion } from "framer-motion";

interface InlineInputCardProps {
  buttonRect: DOMRect;
  positionRect?: DOMRect;
  exitButtonRect?: DOMRect;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  closing?: boolean;
  placeholder?: string;
  buttonText?: string;
  type?: 'text' | 'url';
  validate?: (value: string) => boolean | string;
}

export default function InlineInputCard({
  buttonRect,
  positionRect,
  exitButtonRect,
  onSubmit,
  onCancel,
  closing = false,
  placeholder = 'Введите URL...',
  buttonText = 'Добавить',
  type = 'url',
  validate,
}: InlineInputCardProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, offsetX: 0, offsetY: 0, exitOffsetX: 0, exitOffsetY: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const prevClosingRef = useRef(closing);

  useLayoutEffect(() => {
    if (!cardRef.current || ready) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    const padding = 8;
    const anchorRect = positionRect ?? buttonRect;
    let top = anchorRect.top - cardRect.height - 8;
    if (top < padding) {
      top = anchorRect.bottom + 8;
    }
    let left = anchorRect.left + anchorRect.width / 2 - cardRect.width / 2;
    if (left < padding) left = padding;
    if (left + cardRect.width > window.innerWidth - padding) {
      left = window.innerWidth - cardRect.width - padding;
    }

    const btnCenterX = buttonRect.left + buttonRect.width / 2;
    const btnCenterY = buttonRect.top + buttonRect.height / 2;
    const finalCenterX = left + cardRect.width / 2;
    const finalCenterY = top + cardRect.height / 2;

    let exitOffsetX = btnCenterX - finalCenterX;
    let exitOffsetY = btnCenterY - finalCenterY;
    if (exitButtonRect) {
      const exitCenterX = exitButtonRect.left + exitButtonRect.width / 2;
      const exitCenterY = exitButtonRect.top + exitButtonRect.height / 2;
      exitOffsetX = exitCenterX - finalCenterX;
      exitOffsetY = exitCenterY - finalCenterY;
    }

    setPos({
      top,
      left,
      offsetX: btnCenterX - finalCenterX,
      offsetY: btnCenterY - finalCenterY,
      exitOffsetX,
      exitOffsetY,
    });
    setReady(true);
  }, [buttonRect, positionRect, exitButtonRect, ready]);

  useEffect(() => {
    if (ready) inputRef.current?.focus();
  }, [ready]);

  useEffect(() => {
    if (closing && !prevClosingRef.current) {
      prevClosingRef.current = true;
      setExiting(true);
      setTimeout(() => onCancelRef.current(), 150);
    } else if (!closing) {
      prevClosingRef.current = false;
    }
  }, [closing]);

  useEffect(() => {
    if (!ready || exiting || !cardRef.current) return;
    const el = cardRef.current;
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-add-type]')) return;
      if (!el.contains(event.target as Node)) {
        setExiting(true);
        setTimeout(() => onCancel(), 150);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onCancel, exiting, ready]);

  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => onCancel(), 150);
  };

  const handleSubmit = () => {
    if (exiting) return;
    if (value.trim() === '') return;
    if (validate) {
      const result = validate(value);
      if (result !== true) {
        setError(typeof result === "string" ? result : "Некорректное значение для этой карточки.");
        return;
      }
    }
    setError(null);
    setExiting(true);
    setTimeout(() => {
      onSubmit(value.trim());
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const content = (
    <>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          fontSize: '14px',
          marginBottom: '8px',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <div
          style={{
            marginBottom: "8px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#b91c1c",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: 'var(--accent)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {buttonText}
        </button>
      </div>
    </>
  );

  if (!ready) {
    return (
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          visibility: 'hidden',
          zIndex: 1100,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          width: 'min(400px, calc(100vw - 16px))',
          minWidth: 'min(320px, calc(100vw - 16px))',
          maxWidth: 'calc(100vw - 16px)',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <motion.div
      key="animated"
      ref={cardRef}
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        zIndex: 1100,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px',
        boxShadow: 'var(--shadow-lg)',
        width: 'min(400px, calc(100vw - 16px))',
        minWidth: 'min(320px, calc(100vw - 16px))',
        maxWidth: 'calc(100vw - 16px)',
      }}
      initial={{ x: pos.offsetX, y: pos.offsetY, scale: 0, opacity: 0 }}
      animate={exiting
        ? { x: pos.exitOffsetX, y: pos.exitOffsetY, scale: 0, opacity: 0 }
        : { x: 0, y: 0, scale: 1, opacity: 1 }
      }
      transition={exiting ? { duration: 0.15, ease: "easeIn" } : { duration: 0.15, ease: "easeOut" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {content}
    </motion.div>
  );
}
