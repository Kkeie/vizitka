# Drag & Drop Integration Guide

## Overview

This project now includes a modern, performant drag-and-drop system with:
- Pointer Events API (touch + mouse support)
- Spring physics animations (iPhone-like feel)
- GPU acceleration (translate3d)
- Keyboard navigation & accessibility (ARIA)
- Edge scrolling support

## Files Created

1. `frontend/src/lib/drag-reorder.ts` - Core vanilla JS drag-and-drop module
2. `frontend/src/styles/drag-reorder.css` - Styles for drag states and animations
3. `frontend/src/hooks/useDragReorder.ts` - React hook wrapper
4. `frontend/src/pages/Editor.tsx.cursor.bak` - Backup of original Editor.tsx

## Integration

### React Component Usage

```tsx
import { useDragReorder } from '../hooks/useDragReorder';
import '../styles/drag-reorder.css';

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useDragReorder({
    containerRef: containerRef,
    itemSelector: '[data-drag-item]',
    handleSelector: '.drag-handle', // optional
    onChange: (newOrderIds) => {
      // Handle reorder: newOrderIds is array of item IDs
      console.log('New order:', newOrderIds);
    },
    spring: { stiffness: 300, damping: 28 },
    getItemId: (el) => el.dataset.blockId || el.id,
  });

  return (
    <div ref={containerRef} className="grid">
      {items.map(item => (
        <div key={item.id} data-drag-item data-block-id={item.id}>
          <div className="drag-handle">⋮⋮</div>
          {/* content */}
        </div>
      ))}
    </div>
  );
}
```

### HTML Attributes Required

- Container: Must have `.grid` class or match `containerSelector`
- Items: Must have `data-drag-item` attribute
- Items: Should have `data-block-id` or `id` for identification
- Handle (optional): Elements with `.drag-handle` class restrict drag to handle only

## Configuration Options

### Spring Parameters

```typescript
spring: {
  stiffness: 300,  // Higher = faster, more bouncy (default: 300)
  damping: 28      // Higher = less oscillation (default: 28)
}
```

### Selectors

- `containerSelector`: CSS selector or HTMLElement ref for container
- `itemSelector`: CSS selector for draggable items (default: `[data-drag-item]`)
- `handleSelector`: CSS selector for drag handle (null = drag anywhere on item)

### Callbacks

- `onChange(newOrderIds: string[])`: Called when order changes
- `getItemId(element: HTMLElement) => string`: Custom ID extraction function

## Keyboard Navigation

- **Space/Enter**: Pick up item for reordering
- **Arrow Up/Left**: Move item up
- **Arrow Down/Right**: Move item down
- **Space/Enter**: Drop item
- **Escape**: Cancel reordering

## Accessibility

- ARIA attributes automatically added (`role="list"`, `role="listitem"`, `aria-grabbed`)
- Screen reader announcements via live region
- Keyboard navigation fully supported
- Focus management during drag

## Performance

- GPU-accelerated transforms (`translate3d`)
- `will-change` hints for optimal rendering
- Minimal reflows/repaints
- RequestAnimationFrame for smooth animations

## Browser Support

- Modern browsers with Pointer Events API
- Fallback to mouse/touch events if needed
- Mobile Safari/Chrome fully supported

## Troubleshooting

### Items not draggable
- Ensure `data-drag-item` attribute is present
- Check that container selector matches
- Verify `disabled` prop is not true

### Order not saving
- Check `onChange` callback is implemented
- Verify `getItemId` returns correct IDs
- Ensure IDs match between items and callback

### Animation not smooth
- Adjust spring parameters (higher stiffness = faster)
- Check GPU acceleration is enabled in browser
- Verify `will-change` CSS is applied

## Migration Notes

The old HTML5 drag-and-drop API has been replaced with Pointer Events. 
Old drag handlers (`onDragStart`, `onDragOver`, `onDrop`) are no longer needed.
