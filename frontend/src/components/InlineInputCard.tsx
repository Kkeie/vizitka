import React, { useRef, useEffect, useLayoutEffect } from 'react';

interface InlineInputCardProps {
  buttonRect: DOMRect;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  buttonText?: string;
  type?: 'text' | 'url';
  validate?: (value: string) => boolean;
}

export default function InlineInputCard({
  buttonRect,
  onSubmit,
  onCancel,
  placeholder = 'Введите URL...',
  buttonText = 'Добавить',
  type = 'url',
  validate,
}: InlineInputCardProps) {
  const [value, setValue] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    let top = buttonRect.top - cardRect.height - 8;
    let left = buttonRect.left + buttonRect.width / 2 - cardRect.width / 2;

    // Корректировка, чтобы не выходила за пределы экрана
    const padding = 8;
    if (top < padding) {
      top = buttonRect.bottom + 8;
    }
    if (left < padding) {
      left = padding;
    }
    if (left + cardRect.width > window.innerWidth - padding) {
      left = window.innerWidth - cardRect.width - padding;
    }

    cardRef.current.style.top = `${top}px`;
    cardRef.current.style.left = `${left}px`;
  }, [buttonRect]);

  const handleSubmit = () => {
    if (value.trim() === '') return;
    if (validate && !validate(value)) return;
    onSubmit(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        zIndex: 1100,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '320px',
        maxWidth: '400px',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
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
    </div>
  );
}