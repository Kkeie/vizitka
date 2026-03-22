// src/components/SortableBlockCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockGridSize } from '../api';
import BlockCard, { Block } from './BlockCard';
import { clampGridSize, getResolvedGridSize } from '../lib/block-grid';

interface SortableBlockCardProps {
  block: Block;
  onDelete?: () => void;
  gridSize?: BlockGridSize | null;
  gridColumns: number;
  onGridSizeChange?: (size: BlockGridSize | null) => void;
}

export const SortableBlockCard: React.FC<SortableBlockCardProps> = ({
  block,
  onDelete,
  gridSize,
  gridColumns,
  onGridSizeChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const resolvedGridSize = getResolvedGridSize(block, gridSize, gridColumns);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
    gridColumn: `span ${resolvedGridSize.colSpan}`,
    gridRow: `span ${resolvedGridSize.rowSpan}`,
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
      ref={setNodeRef}
      style={style}
      data-drag-item
      className={`bento-grid-item ${isDragging ? 'dragging' : ''}`.trim()}
    >
      <BlockCard
        b={block}
        onDelete={onDelete}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          attributes,
          listeners,
        }}
        isDragPreview={isDragging}
      />
      {onGridSizeChange && !isDragging && (
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
    </div>
  );
};
