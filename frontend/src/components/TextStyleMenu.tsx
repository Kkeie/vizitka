import React from 'react';
import { NoteTextStyle } from '../api';

interface TextStyleMenuProps {
  currentStyle: NoteTextStyle;
  onStyleChange: (style: Partial<NoteTextStyle>) => void;
}

const TextStyleMenu = React.forwardRef<HTMLDivElement, TextStyleMenuProps>(
  ({ currentStyle, onStyleChange }, ref) => {
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onStyleChange({ textColor: e.target.value });
    };

    const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onStyleChange({ backgroundColor: e.target.value });
    };

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onStyleChange({ fontFamily: e.target.value as NoteTextStyle['fontFamily'] });
    };

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
          flexDirection: 'column',
          gap: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Верхняя строка: выравнивание + жирный/курсив */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          <button
            title="По левому краю"
            style={buttonStyle(currentStyle.align === 'left')}
            onClick={() => onStyleChange({ align: 'left' })}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 5h16v2H4V5zm0 4h10v2H4V9zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
            </svg>
          </button>
          <button
            title="По центру"
            style={buttonStyle(currentStyle.align === 'center')}
            onClick={() => onStyleChange({ align: 'center' })}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 5h16v2H4V5zm4 4h8v2H8V9zm-4 4h16v2H4v-2zm4 4h8v2H8v-2z" />
            </svg>
          </button>
          <button
            title="По правому краю"
            style={buttonStyle(currentStyle.align === 'right')}
            onClick={() => onStyleChange({ align: 'right' })}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 5h16v2H4V5zm10 4h10v2H14V9zm-10 4h16v2H4v-2zm10 4h10v2H14v-2z" />
            </svg>
          </button>

          <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />

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
        </div>

        {/* Нижняя строка: цвета + шрифт */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          <label
            title="Цвет текста"
            style={{ cursor: 'pointer', display: 'flex' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              value={currentStyle.textColor || '#000000'}
              onChange={handleColorChange}
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

          <label
            title="Цвет фона"
            style={{ cursor: 'pointer', display: 'flex' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              value={currentStyle.backgroundColor || '#ffffff'}
              onChange={handleBgColorChange}
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

          <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />

          <select
            value={currentStyle.fontFamily || 'default'}
            onChange={handleFontFamilyChange}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer',
              height: 28,
              minHeight: 28,
              maxHeight: 28,
              boxSizing: 'border-box',
            }}
          >
            <option value="default" style={{ background: '#2a2a2a', color: '#fff' }}>Default</option>
            <option value="serif" style={{ background: '#2a2a2a', color: '#fff' }}>Serif</option>
            <option value="mono" style={{ background: '#2a2a2a', color: '#fff' }}>Mono</option>
            <option value="system" style={{ background: '#2a2a2a', color: '#fff' }}>System</option>
          </select>
        </div>
      </div>
    );
  }
);

TextStyleMenu.displayName = 'TextStyleMenu';
export default TextStyleMenu;