// useDragReorder.ts - React hook for drag-and-drop integration

import { useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import initDragReorder, { DragReorderConfig, DragReorderInstance } from '../lib/drag-reorder';

export function useDragReorder(config: DragReorderConfig & { containerRef?: RefObject<HTMLElement> }) {
  const instanceRef = useRef<DragReorderInstance | null>(null);
  const onChangeRef = useRef(config.onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = config.onChange;
  }, [config.onChange]);

  useEffect(() => {
    if (config.disabled) {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
      return;
    }

    // Function to setup drag reorder
    const trySetup = () => {
      // Get container from ref or selector
      const container = config.containerRef?.current 
        || (typeof config.containerSelector === 'string'
          ? document.querySelector(config.containerSelector) as HTMLElement
          : config.containerSelector);

      if (container && !instanceRef.current) {
        setupDragReorder(container);
      }
    };

    // Try immediately
    trySetup();

    // Retry after a short delay if container not found yet (for React rendering)
    const timeout = setTimeout(() => {
      trySetup();
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [
    config.containerSelector,
    config.itemSelector,
    config.handleSelector,
    config.disabled,
    config.spring?.stiffness,
    config.spring?.damping,
    // Note: containerRef is intentionally omitted from deps to avoid re-initialization
  ]);

  function setupDragReorder(container: HTMLElement) {
    // Ensure items have data-drag-item attribute
    const items = container.querySelectorAll(config.itemSelector || '[data-drag-item]');
    items.forEach((item, index) => {
      const el = item as HTMLElement;
      if (!el.hasAttribute('data-drag-item')) {
        el.setAttribute('data-drag-item', '');
      }
      if (!el.dataset.key && !el.id && !el.dataset.blockId) {
        el.dataset.key = `item-${index}`;
      }
    });

    const instance = initDragReorder({
      ...config,
      containerSelector: container,
      onChange: (newOrder) => {
        if (onChangeRef.current) {
          onChangeRef.current(newOrder);
        }
      },
    });

    if (instance) {
      instanceRef.current = instance;
    }
  }

  return {
    recalc: useCallback(() => {
      instanceRef.current?.recalc();
    }, []),
  };
}
