// src/components/SortableBlockCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BlockCard, { Block } from './BlockCard';

interface SortableBlockCardProps {
  block: Block;
  onDelete?: () => void;
}

export const SortableBlockCard: React.FC<SortableBlockCardProps> = ({ block, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlockCard
        b={block}
        onDelete={onDelete}
        dragHandleProps={listeners}
        isDragPreview={isDragging}
      />
    </div>
  );
};