import React from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockGridAnchor, BlockGridSize, NoteTextStyle } from '../api';
import BlockCard, { Block } from './BlockCard';
import { clampGridSize, getGridRowSpan, getResolvedGridSize } from '../lib/block-grid';
import SizeMenu from './SizeMenu';
import TextStyleMenu from './TextStyleMenu';
import SearchInputCard from './SearchInputCard';

interface SortableBlockCardProps {
  block: Block;
  onDelete?: () => void;
  onUpdate?: (partial: Partial<Block>) => void;
  gridSize?: BlockGridSize | null;
  gridColumns: number;
  cellSize: number | null;
  gridGap: number;
  onGridSizeChange?: (size: BlockGridSize | null) => void;
  /** Якорь в CSS Grid для текущего брейкпоинта (без него — только span, авто-расстановка) */
  gridAnchor?: BlockGridAnchor | null;
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
  gridAnchor,
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
  const isMap = block.type === 'map';

  const [isHovered, setIsHovered] = React.useState(false);
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; cardWidth: number } | null>(null);

  const [isTextMenuVisible, setIsTextMenuVisible] = React.useState(false);
  const textMenuRef = React.useRef<HTMLDivElement>(null);
  const [textMenuPosition, setTextMenuPosition] = React.useState<{ top: number; left: number; cardWidth: number } | null>(null);

  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [searchPosition, setSearchPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);

  // Закрываем все меню при скролле #root
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const handleScroll = () => {
      if (isMenuVisible) setIsMenuVisible(false);
      if (isTextMenuVisible) setIsTextMenuVisible(false);
      if (isSearchActive) setIsSearchActive(false);
    };
    root.addEventListener('scroll', handleScroll);
    return () => root.removeEventListener('scroll', handleScroll);
  }, [isMenuVisible, isTextMenuVisible, isSearchActive]);

  // При открытии поиска вычисляем позицию под меню
  React.useEffect(() => {
    if (isSearchActive && menuRef.current && menuPosition) {
      const menuHeight = menuRef.current.clientHeight;
      setSearchPosition({
        top: menuPosition.top + menuHeight + 4,
        left: menuPosition.left,
      });
    } else {
      setSearchPosition(null);
    }
  }, [isSearchActive, menuPosition]);

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

  // Обновляем позиции при открытии меню (один раз)
  React.useEffect(() => {
    if (isMenuVisible) {
      updateMenuPosition();
    }
  }, [isMenuVisible, updateMenuPosition]);

  React.useEffect(() => {
    if (isTextMenuVisible) {
      updateTextMenuPosition();
    }
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
    // Если активен поиск, не скрываем меню
    if (isSearchActive) return;

    const relatedTarget = e.relatedTarget as Node;
    if (menuRef.current && menuRef.current.contains(relatedTarget)) return;
    if (textMenuRef.current && textMenuRef.current.contains(relatedTarget)) return;
    setIsHovered(false);
    setIsMenuVisible(false);
    setIsTextMenuVisible(false);
  };

  const handleMenuMouseLeave = (e: React.MouseEvent) => {
    // Если активен поиск, не скрываем меню
    if (isSearchActive) return;

    const relatedTarget = e.relatedTarget as Node;
    if (cardRef.current && cardRef.current.contains(relatedTarget)) return;
    setIsMenuVisible(false);
    setIsHovered(false);
  };

  const handleTextMenuMouseLeave = (e: React.MouseEvent) => {
    // Если активен поиск, не скрываем меню
    if (isSearchActive) return;

    const relatedTarget = e.relatedTarget as Node;
    if (cardRef.current && cardRef.current.contains(relatedTarget)) return;
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

  const handleOpenMap = React.useCallback(() => {
    if (block.mapLat != null && block.mapLng != null) {
      const url = `https://yandex.ru/maps/?pt=${block.mapLng},${block.mapLat}&z=14`;
      window.open(url, '_blank');
    }
  }, [block.mapLat, block.mapLng]);

  const handleMapSelect = React.useCallback((lat: number, lng: number) => {
    onUpdate?.({ mapLat: lat, mapLng: lng });
    setIsSearchActive(false);
  }, [onUpdate]);

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
    gridColumn: gridAnchor
      ? `${gridAnchor.gridColumnStart} / span ${resolvedGridSize.colSpan}`
      : `span ${resolvedGridSize.colSpan}`,
    gridRow: gridAnchor
      ? `${gridAnchor.gridRowStart} / span ${resolvedRowSpan}`
      : `span ${resolvedRowSpan}`,
    position: 'relative' as const,
    minWidth: 0,
    minHeight: 0,
    // Без dense соседние ячейки могут визуально заходить под ручки; поднимаем активную карточку
    zIndex:
      isDragging
        ? 50
        : isResizing || isHovered || isMenuVisible || isTextMenuVisible || isSearchActive
          ? 20
          : undefined,
  };

  const startResize =
    (direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!onGridSizeChange) return;
      event.preventDefault();
      event.stopPropagation();
      const grid = event.currentTarget.closest('.bento-grid') as HTMLElement | null;
      if (!grid) return;
      setIsResizing(true);
      const computed = window.getComputedStyle(grid);
      const gap = parseFloat(computed.columnGap || computed.gap || '16') || 16;
      const cssCellSize = parseFloat(computed.getPropertyValue('--bento-cell-size'));
      const rect = grid.getBoundingClientRect();
      const cellSize = cssCellSize || (rect.width - gap * (gridColumns - 1)) / gridColumns;
      const step = cellSize + gap;
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = resolvedGridSize;
      const handleEl = event.currentTarget;
      handleEl.setPointerCapture(event.pointerId);

      const handlePointerMove = (moveEvent: Event) => {
        const ev = moveEvent as PointerEvent;
        if (ev.cancelable) ev.preventDefault();
        const deltaCols = Math.round((ev.clientX - startX) / step);
        const deltaRows = Math.round((ev.clientY - startY) / step);
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
      const moveOpts: AddEventListenerOptions = { passive: false };
      const handlePointerUp = (upEvent: Event) => {
        const ev = upEvent as PointerEvent;
        setIsResizing(false);
        try {
          handleEl.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released */
        }
        window.removeEventListener('pointermove', handlePointerMove, moveOpts);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
      window.addEventListener('pointermove', handlePointerMove, moveOpts);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    };

  const handles = [
    { key: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 12 } },
    { key: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 12 } },
    { key: 'e', cursor: 'ew-resize', style: { right: -4, top: '50%', transform: 'translateY(-50%)', width: 12, height: 36 } },
    { key: 'w', cursor: 'ew-resize', style: { left: -4, top: '50%', transform: 'translateY(-50%)', width: 12, height: 36 } },
    { key: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4, width: 16, height: 16 } },
    //{ key: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4, width: 16, height: 16 } },
    { key: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4, width: 16, height: 16 } },
    { key: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4, width: 16, height: 16 } },
  ] as const;

  const ExpandIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
    </svg>
  );

  const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  const mapExtraButtons = isMap ? (
    <>
      <button
        onClick={handleOpenMap}
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
          transition: 'all 0.2s ease',
        }}
        title="Открыть карту"
      >
        <ExpandIcon />
      </button>
      <button
        onClick={() => setIsSearchActive(prev => !prev)}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 28,
          height: 28,
          background: isSearchActive ? '#fff' : '#000',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          color: isSearchActive ? '#000' : '#fff',
          transition: 'all 0.2s ease',
        }}
        title="Поиск по карте"
      >
        <SearchIcon />
      </button>
    </>
  ) : null;

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        onPointerDownCapture={handlePointerDownCapture}
        data-drag-item=""
        data-block-id={block.id}
        className={`bento-grid-item ${isDragging ? 'dragging' : ''}`.trim()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        onKeyDown={handleKeyDown}
      >
        <BlockCard
          b={block}
          onDelete={onDelete}
          onUpdate={onUpdate}
          isDragPreview={isDragging}
          sortableProps={{ ...attributes, ...(listeners ?? {}) }}
          colSpan={resolvedGridSize.colSpan}
        />

        {onDelete && isHovered && !isDragging && (
          <button
            onClick={onDelete}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Удалить блок"
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              zIndex: 4,
              padding: 0,
              width: 30,
              height: 30,
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block" }}
            >
              <path d="M4 6h16" />
              <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
              <path d="M9 3h6" />
            </svg>
          </button>
        )}

        {onGridSizeChange && !isDragging && !isSection && isHovered && (
          <>
            {handles.map((handle) => (
              <div
                key={handle.key}
                className="bento-resize-handle"
                role="presentation"
                title="Тяните handle, чтобы изменить размер карточки по сетке. Двойной клик сбросит размер."
                onPointerDown={startResize(handle.key)}
                onDoubleClick={() => onGridSizeChange(null)}
                style={{
                  position: 'absolute',
                  zIndex: 40,
                  cursor: handle.cursor,
                  touchAction: 'none',
                  pointerEvents: 'auto',
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
              extraButtons={mapExtraButtons}
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

      {isSearchActive && searchPosition && block.mapLat != null && block.mapLng != null && (
        createPortal(
          <SearchInputCard
            initialLat={block.mapLat}
            initialLng={block.mapLng}
            onSelect={handleMapSelect}
            style={{
              position: 'absolute',
              top: searchPosition.top,
              left: searchPosition.left,
              transform: 'translateX(-50%)',
              zIndex: 10002,
            }}
          />,
          document.body
        )
      )}
    </>
  );
};