// flipAnimation.ts

export interface BlockRect {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function measureBlockRects(blockIds: number[]): Map<number, DOMRect> {
  const rects = new Map<number, DOMRect>();
  for (const id of blockIds) {
    const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    if (el) {
      rects.set(id, el.getBoundingClientRect());
    }
  }
  return rects;
}

export function animateFlip(
  beforeRects: Map<number, DOMRect>,
  afterRects: Map<number, DOMRect>,
  duration = 300,
  onComplete?: () => void,
): { cancel: () => void } {
  let isCancelled = false;
  const animations: Array<{ el: HTMLElement; deltaX: number; deltaY: number }> = [];

  for (const [id, before] of beforeRects.entries()) {
    const after = afterRects.get(id);
    if (!after) continue;
    const deltaX = before.left - after.left;
    const deltaY = before.top - after.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
    const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    if (!el) continue;
    animations.push({ el, deltaX, deltaY });
  }

  if (animations.length === 0) {
    onComplete?.();
    return { cancel: () => {} };
  }

  // Применяем обратные трансформации без перехода
  for (const { el, deltaX, deltaY } of animations) {
    const originalTransition = el.style.transition;
    el.style.transition = 'none';
    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    void el.offsetHeight; // force reflow
    el.style.transition = originalTransition || `transform ${duration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
  }

  // В следующем кадре убираем трансформации – блоки поедут
  requestAnimationFrame(() => {
    if (isCancelled) return;
    for (const { el } of animations) {
      el.style.transform = '';
    }
  });

  const timeout = window.setTimeout(() => {
    if (isCancelled) return;
    for (const { el } of animations) {
      if (el.style.transition && !el.style.transition.includes('transform')) {
        // оставляем пользовательский transition
      } else {
        el.style.transition = '';
      }
    }
    onComplete?.();
  }, duration + 50);

  return {
    cancel: () => {
      if (isCancelled) return;
      isCancelled = true;
      window.clearTimeout(timeout);
      for (const { el } of animations) {
        el.style.transition = '';
        el.style.transform = '';
      }
    },
  };
}