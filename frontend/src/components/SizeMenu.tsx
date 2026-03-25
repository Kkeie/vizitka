import React from 'react';
import { BlockGridSize } from '../api';

interface SizeMenuProps {
  onSelect: (size: BlockGridSize) => void;
  currentSize: BlockGridSize;
  maxCols: number;
  showStyleButton?: boolean;
  onStyleClick?: () => void;
}

const PRESETS: Array<{ cols: number; rows: number }> = [
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 2, rows: 2 },
];

const SizeMenu = React.forwardRef<HTMLDivElement, SizeMenuProps>(
  ({ onSelect, currentSize, maxCols, showStyleButton = false, onStyleClick }, ref) => {
    const validPresets = PRESETS.filter(p => p.cols <= maxCols);
    const isActive = (cols: number, rows: number) =>
      currentSize.colSpan === cols && currentSize.rowSpan === rows;

    const cellSize = 8;      // размер одной ячейки в пикселях
    const gap = 2;           // зазор между ячейками внутри иконки
    const borderWidth = 1.5; // жирность границы (px)

    return (
      <div
        ref={ref}
        style={{
          background: '#1a1a1a',
          borderRadius: '6px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
          flexWrap: 'nowrap',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {validPresets.map(preset => {
          const active = isActive(preset.cols, preset.rows);
          const width = preset.cols * cellSize + (preset.cols - 1) * gap;
          const height = preset.rows * cellSize + (preset.rows - 1) * gap;
          return (
            <button
              key={`${preset.cols}x${preset.rows}`}
              onClick={() => onSelect({ colSpan: preset.cols, rowSpan: preset.rows })}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '28px',
                height: '28px',
                background: active ? '#fff' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  border: active
                    ? `${borderWidth}px solid #000`
                    : `${borderWidth}px solid #fff`,
                  backgroundColor: active ? '#fff' : 'transparent',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
              />
            </button>
          );
        })}
        {showStyleButton && onStyleClick && (
          <>
            <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStyleClick();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: 28,
                height: 28,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                color: '#fff',
                fontSize: 16,
              }}
            >
              ⋯
            </button>
          </>
        )}
      </div>
    );
  }
);

SizeMenu.displayName = 'SizeMenu';
export default SizeMenu;