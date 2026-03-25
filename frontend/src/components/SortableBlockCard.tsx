import React from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockGridSize, NoteTextStyle } from '../api';
import BlockCard, { Block } from './BlockCard';
import { clampGridSize, getGridRowSpan, getResolvedGridSize } from '../lib/block-grid';
import SizeMenu from './SizeMenu';
import TextStyleMenu from './TextStyleMenu';

interface SortableBlockCardProps {
  block: Block;
  onDelete?: () => void;
  onUpdate?: (partial: Partial<Block>) => void;
  gridSize?: BlockGridSize | null;
  gridColumns: number;
  cellSize: number | null;
  gridGap: number;
  onGridSizeChange?: (size: BlockGridSize | null) => void;
}

export const SortableBlockCard: React.FC<SortableBlockCardProps> = ({
  block,
  onDelete,
  onUpdate,
  gridSize,
  gridColumns,
  cellSize,
  gridGap,
  onGridSizeChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const resolvedGridSize = getResolvedGridSize(block, gridSize, gridColumns);
  const resolvedRowSpan = getGridRowSpan(block, resolvedGridSize, cellSize, gridGap);
  const isSection = block.type === 'section';
  const isNote = block.type === 'note';

  const [isHovered, setIsHovered] = React.useState(false);
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; cardWidth: number } | null>(null);

  const [isTextMenuVisible, setIsTextMenuVisible] = React.useState(false);
  const textMenuRef = React.useRef<HTMLDivElement>(null);
  const [textMenuPosition, setTextMenuPosition] = React.useState<{ top: number; left: number; cardWidth: number } | null>(null);

  const updateMenuPosition = React.useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY - 4,
      left: rect.left + window.scrollX + rect.width / 2,
      cardWidth: rect.width,
    });
  }, []);

  const updateTextMenuPosition = React.useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTextMenuPosition({
      top: rect.bottom + window.scrollY - 4,
      left: rect.left + window.scrollX + rect.width / 2,
      cardWidth: rect.width,
    });
  }, []);

  // Обновляем позицию при скролле и ресайзе, если меню видимо
  React.useEffect(() => {
    if (!isMenuVisible) return;
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isMenuVisible, updateMenuPosition]);

  React.useEffect(() => {
    if (!isTextMenuVisible) return;
    updateTextMenuPosition();
    window.addEventListener('scroll', updateTextMenuPosition);
    window.addEventListener('resize', updateTextMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateTextMenuPosition);
      window.removeEventListener('resize', updateTextMenuPosition);
    };
  }, [isTextMenuVisible, updateTextMenuPosition]);

  React.useEffect(() => {
    if (!isTextMenuVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        textMenuRef.current &&
        !textMenuRef.current.contains(e.target as Node) &&
        !cardRef.current?.contains(e.target as Node)
      ) {
        setIsTextMenuVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTextMenuVisible]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsMenuVisible(true);
  };

  const handleCardMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node;
    if (menuRef.current && menuRef.current.contains(relatedTarget)) {
      return;
    }
    if (textMenuRef.current && textMenuRef.current.contains(relatedTarget)) {
      return;
    }
    setIsHovered(false);
    setIsMenuVisible(false);
    setIsTextMenuVisible(false);
  };

  const handleMenuMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node;
    if (cardRef.current && cardRef.current.contains(relatedTarget)) {
      return;
    }
    setIsMenuVisible(false);
    setIsHovered(false);
  };

  const handleTextMenuMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node;
    if (cardRef.current && cardRef.current.contains(relatedTarget)) {
      return;
    }
    setIsTextMenuVisible(false);
    setIsHovered(false);
  };

  const handleSizeSelect = (newSize: BlockGridSize) => {
    onGridSizeChange?.(newSize);
  };

  const handleTextStyleChange = (style: Partial<NoteTextStyle>) => {
    if (!onUpdate) return;
    const newNoteStyle = { ...(block.noteStyle || {}), ...style };
    onUpdate({ noteStyle: newNoteStyle });
  };

  const handleStyleMenuOpen = () => {
    updateTextMenuPosition();
    setIsTextMenuVisible(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      )) {
        e.stopPropagation();
      }
    }
  };

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const interactive = target.closest('a, button, input, textarea, [contenteditable="true"], .no-drag');
    if (interactive) {
      e.stopPropagation();
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    gridColumn: `span ${resolvedGridSize.colSpan}`,
    gridRow: `span ${resolvedRowSpan}`,
    position: 'relative' as const,
    minWidth: 0,
    minHeight: 0,
  };

  const startResize =
    (direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!onGridSizeChange) return;
      event.preventDefault();
      event.stopPropagation();
      const grid = event.currentTarget.closest('.bento-grid') as HTMLElement | null;
      if (!grid) return;
      const computed = window.getComputedStyle(grid);
      const gap = parseFloat(computed.columnGap || computed.gap || '16') || 16;
      const cssCellSize = parseFloat(computed.getPropertyValue('--bento-cell-size'));
      const rect = grid.getBoundingClientRect();
      const cellSize = cssCellSize || (rect.width - gap * (gridColumns - 1)) / gridColumns;
      const step = cellSize + gap;
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = resolvedGridSize;
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaCols = Math.round((moveEvent.clientX - startX) / step);
        const deltaRows = Math.round((moveEvent.clientY - startY) / step);
        const nextSize = clampGridSize(
          {
            colSpan: direction.includes('e')
              ? startSize.colSpan + deltaCols
              : direction.includes('w')
                ? startSize.colSpan - deltaCols
                : startSize.colSpan,
            rowSpan: direction.includes('s')
              ? startSize.rowSpan + deltaRows
              : direction.includes('n')
                ? startSize.rowSpan - deltaRows
                : startSize.rowSpan,
          },
          gridColumns,
        );
        onGridSizeChange(nextSize);
      };
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

  const handles = [
    { key: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 12 } },
    { key: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 12 } },
    { key: 'e', cursor: 'ew-resize', style: { right: -4, top: '50%', transform: 'translateY(-50%)', width: 12, height: 36 } },
    { key: 'w', cursor: 'ew-resize', style: { left: -4, top: '50%', transform: 'translateY(-50%)', width: 12, height: 36 } },
    { key: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4, width: 16, height: 16 } },
    { key: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4, width: 16, height: 16 } },
    { key: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4, width: 16, height: 16 } },
    { key: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4, width: 16, height: 16 } },
  ] as const;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      onPointerDownCapture={handlePointerDownCapture}
      data-drag-item=""
      className={`bento-grid-item ${isDragging ? 'dragging' : ''}`.trim()}
      {...attributes}
      {...listeners}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <BlockCard
        b={block}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isDragPreview={isDragging}
      />

      {onDelete && isHovered && !isDragging && (
        <button
          onClick={onDelete}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Удалить блок"
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            zIndex: 4,
            padding: 0,
            width: 20,
            height: 20,
            fontSize: 10,
            color: '#000000',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          🗑️
        </button>
      )}

      {onGridSizeChange && !isDragging && !isSection && isHovered && (
        <>
          {handles.map((handle) => (
            <div
              key={handle.key}
              role="presentation"
              title="Тяните handle, чтобы изменить размер карточки по сетке. Двойной клик сбросит размер."
              onPointerDown={startResize(handle.key)}
              onDoubleClick={() => onGridSizeChange(null)}
              style={{
                position: 'absolute',
                zIndex: 4,
                cursor: handle.cursor,
                touchAction: 'none',
                ...handle.style,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 999,
                  background: handle.key.length === 2 ? 'var(--border)' : 'rgba(229,229,229,0.85)',
                  opacity: 0.8,
                }}
              />
            </div>
          ))}
        </>
      )}

      {isMenuVisible && onGridSizeChange && !isSection && menuPosition && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
            transform: 'translateX(-50%)',
            zIndex: 10000,
            maxWidth: menuPosition.cardWidth,
            width: 'auto',
          }}
          onMouseEnter={() => setIsMenuVisible(true)}
          onMouseLeave={handleMenuMouseLeave}
        >
          <SizeMenu
            onSelect={handleSizeSelect}
            currentSize={resolvedGridSize}
            maxCols={gridColumns}
            showStyleButton={isNote}
            onStyleClick={handleStyleMenuOpen}
          />
        </div>,
        document.body
      )}

      {isNote && onUpdate && isTextMenuVisible && textMenuPosition && createPortal(
        <div
          ref={textMenuRef}
          style={{
            position: 'absolute',
            top: textMenuPosition.top,
            left: textMenuPosition.left,
            transform: 'translateX(-50%)',
            zIndex: 10001,
            maxWidth: textMenuPosition.cardWidth,
            width: 'auto',
          }}
          onMouseEnter={() => setIsTextMenuVisible(true)}
          onMouseLeave={handleTextMenuMouseLeave}
        >
          <TextStyleMenu
            currentStyle={block.noteStyle || {}}
            onStyleChange={handleTextStyleChange}
          />
        </div>,
        document.body
      )}
    </div>
  );
};