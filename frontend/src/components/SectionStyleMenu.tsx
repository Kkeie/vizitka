import React from 'react';
import { NoteTextStyle } from '../api';

interface SectionStyleMenuProps {
  currentStyle: NoteTextStyle;
  onStyleChange: (style: Partial<NoteTextStyle>) => void;
}

const SectionStyleMenu = React.forwardRef<HTMLDivElement, SectionStyleMenuProps>(
  ({ currentStyle, onStyleChange }, ref) => {
    const buttonStyle = (active: boolean = false): React.CSSProperties => ({
      width: 28,
      height: 28,
      minWidth: 28,
      minHeight: 28,
      maxWidth: 28,
      maxHeight: 28,
      padding: 0,
      margin: 0,
      background: active ? '#fff' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 4,
      color: active ? '#000' : '#fff',
      boxSizing: 'border-box',
    });

    return (
      <div
        ref={ref}
        style={{
          background: '#1a1a1a',
          borderRadius: 6,
          padding: '4px',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          title="Жирный"
          style={buttonStyle(!!currentStyle.bold)}
          onClick={() => onStyleChange({ bold: !currentStyle.bold })}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </button>

        <button
          title="Курсив"
          style={buttonStyle(!!currentStyle.italic)}
          onClick={() => onStyleChange({ italic: !currentStyle.italic })}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>

        <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />

        <label
          title="Цвет текста"
          style={{ cursor: 'pointer', display: 'flex' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            value={currentStyle.textColor || '#000000'}
            onChange={(e) => onStyleChange({ textColor: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 28,
              height: 28,
              minWidth: 28,
              minHeight: 28,
              padding: 0,
              margin: 0,
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'transparent',
              boxSizing: 'border-box',
            }}
          />
        </label>
      </div>
    );
  }
);

SectionStyleMenu.displayName = 'SectionStyleMenu';
export default SectionStyleMenu;
