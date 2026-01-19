import React, { useEffect, useRef } from "react";

export default function BlockMasonryGrid({
  children,
  minCol = 2,
  maxCol = 4,
}: {
  children: React.ReactNode;
  minCol?: number;
  maxCol?: number;
}) {
  const gridCols = `grid-cols-1 sm:grid-cols-${Math.max(1, minCol)} lg:grid-cols-${Math.max(minCol + 1, 3)} xl:grid-cols-${maxCol}`;
  return (
    <div className={`grid ${gridCols} gap-5`} style={{ gridAutoRows: "8px" }}>
      {children}
    </div>
  );
}

function imagesLoadedPromise(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  return new Promise(resolve => {
    let counter = 0;
    const checkComplete = () => {
      counter++;
      if (counter === imgs.length) resolve();
    };
    imgs.forEach(img => {
      if (img.complete) {
        checkComplete();
      } else {
        img.addEventListener('load', checkComplete, { once: true });
        img.addEventListener('error', checkComplete, { once: true });
      }
    });
  });
}

function resizeAllGridItems(grid: HTMLElement) {
  const rowHeight = parseFloat(getComputedStyle(grid).getPropertyValue('grid-auto-rows')) || 8;
  // Получаем rowGap из CSS, проверяя разные варианты свойств
  let rowGap = parseFloat(getComputedStyle(grid).getPropertyValue('row-gap'));
  if (!rowGap || isNaN(rowGap)) {
    rowGap = parseFloat(getComputedStyle(grid).getPropertyValue('grid-row-gap'));
  }
  if (!rowGap || isNaN(rowGap)) {
    const gapValue = getComputedStyle(grid).getPropertyValue('gap');
    if (gapValue) {
      const gapParts = gapValue.trim().split(/\s+/);
      rowGap = parseFloat(gapParts[gapParts.length > 1 ? 1 : 0]) || 16;
    } else {
      rowGap = 16;
    }
  }

  const items = Array.from(grid.children) as HTMLElement[];
  for (const item of items) {
    // Try to find .card__content, or use the item itself
    const content = item.querySelector<HTMLElement>('.card__content') || item;
    const contentHeight = content.getBoundingClientRect().height;
    // Правильная формула: высота контента делится на (высота строки + промежуток между строками)
    // rowGap уже учитывается автоматически в CSS Grid между элементами
    const rowSpan = Math.ceil(contentHeight / (rowHeight + rowGap));
    item.style.gridRowEnd = `span ${rowSpan}`;
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number = 120): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useMasonryAutoSpan(depKeys: any[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const grid = root.querySelector<HTMLElement>('.grid') || root;
    if (!grid) return;

    const updateMasonry = () => {
      imagesLoadedPromise(grid).then(() => {
        resizeAllGridItems(grid);
      });
    };

    // Initial calculation
    updateMasonry();

    // Handle window resize (debounced)
    const handleResize = debounce(() => updateMasonry(), 150);
    window.addEventListener('resize', handleResize);

    // Observe grid children changes
    const mo = new MutationObserver(debounce(() => updateMasonry(), 100));
    mo.observe(grid, { childList: true, subtree: true });

    // Observe individual card size changes
    const cards = Array.from(grid.children) as HTMLElement[];
    const ro = new ResizeObserver(debounce(() => updateMasonry(), 100));
    cards.forEach(card => ro.observe(card));

    return () => {
      window.removeEventListener('resize', handleResize);
      mo.disconnect();
      ro.disconnect();
    };
  }, depKeys);

  return ref;
}

// Hook for standard .grid containers (without data-card wrapper)
export function useMasonryGrid(depKeys: any[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;

    const updateMasonry = () => {
      imagesLoadedPromise(grid).then(() => {
        resizeAllGridItems(grid);
      });
    };

    // Initial calculation
    updateMasonry();

    // Handle window resize (debounced)
    const handleResize = debounce(() => updateMasonry(), 150);
    window.addEventListener('resize', handleResize);

    // Observe grid children changes
    const mo = new MutationObserver(debounce(() => updateMasonry(), 100));
    mo.observe(grid, { childList: true, subtree: true });

    // Observe individual card size changes
    const cards = Array.from(grid.children) as HTMLElement[];
    const ro = new ResizeObserver(debounce(() => updateMasonry(), 100));
    cards.forEach(card => ro.observe(card));

    return () => {
      window.removeEventListener('resize', handleResize);
      mo.disconnect();
      ro.disconnect();
    };
  }, depKeys);

  return ref;
}



