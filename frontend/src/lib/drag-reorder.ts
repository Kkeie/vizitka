// drag-reorder.ts - Advanced drag-and-drop with Pointer Events, Spring animations, and accessibility
// Supports React integration via hooks

export interface DragReorderConfig {
  containerSelector?: string | HTMLElement;
  itemSelector?: string;
  handleSelector?: string | null;
  onChange?: (newOrder: string[]) => void;
  spring?: { stiffness: number; damping: number };
  getItemId?: (element: HTMLElement) => string;
  disabled?: boolean;
}

export interface DragReorderInstance {
  recalc: () => void;
  destroy: () => void;
}

// Spring physics implementation
class Spring {
  private stiffness: number;
  private damping: number;
  private position: number = 0;
  private velocity: number = 0;
  private target: number = 0;

  constructor(stiffness: number = 300, damping: number = 28) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: number) {
    this.target = target;
  }

  setPosition(position: number) {
    this.position = position;
    this.velocity = 0;
  }

  update(dt: number = 1 / 60): number {
    const x = this.position - this.target;
    const acc = -this.stiffness * x - this.damping * this.velocity;
    this.velocity += acc * dt;
    this.position += this.velocity * dt;

    // Stop when close enough
    if (Math.abs(x) < 0.1 && Math.abs(this.velocity) < 0.1) {
      this.position = this.target;
      this.velocity = 0;
    }

    return this.position;
  }

  isAtRest(): boolean {
    return Math.abs(this.position - this.target) < 0.1 && Math.abs(this.velocity) < 0.1;
  }
}

export default function initDragReorder(config: DragReorderConfig = {}): DragReorderInstance | null {
  const {
    containerSelector = '.grid',
    itemSelector = '[data-drag-item]',
    handleSelector = null,
    onChange = () => {},
    spring = { stiffness: 300, damping: 28 },
    getItemId = (el) => el.dataset.key || el.id || '',
    disabled = false,
  } = config;

  const container = typeof containerSelector === 'string' 
    ? document.querySelector(containerSelector) as HTMLElement
    : containerSelector;

  if (!container) {
    console.warn(`DragReorder: Container not found`, containerSelector);
    return null;
  }

  if (disabled) {
    return null;
  }

  // Debug log (can be removed in production)
  if (typeof window !== 'undefined' && (window as any).__DRAG_REORDER_DEBUG__) {
    console.log('DragReorder: Initializing', {
      container: container.tagName,
      itemSelector,
      handleSelector,
      itemsCount: container.querySelectorAll(itemSelector).length,
    });
  }

  let draggingEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let initialIndex = -1;
  let positions: Array<{ el: HTMLElement; top: number; height: number; left: number; width: number }> = [];
  let offsetX = 0;
  let offsetY = 0;
  let pointerId: number | null = null;
  let rafId: number | null = null;
  let currentY = 0;
  let currentX = 0;
  let springX: Spring | null = null;
  let springY: Spring | null = null;
  let liveRegion: HTMLElement | null = null;

  // Create live region for screen readers
  function createLiveRegion() {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;';
      document.body.appendChild(liveRegion);
    }
    return liveRegion;
  }

  function announce(message: string) {
    const region = createLiveRegion();
    region.textContent = message;
    setTimeout(() => {
      if (region) region.textContent = '';
    }, 1000);
  }

  function recalcPositions() {
    const children = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
    positions = children.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        el,
        top: rect.top + window.scrollY,
        height: rect.height,
        left: rect.left + window.scrollX,
        width: rect.width,
      };
    });
  }

  function createPlaceholder(height: number, width: number) {
    const ph = document.createElement('div');
    ph.className = 'dr-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.style.cssText = `
      height: ${height}px;
      width: ${width}px;
      background: rgba(0,0,0,0.03);
      border-radius: 8px;
      transition: height 160ms cubic-bezier(.2,.9,.2,1), width 160ms cubic-bezier(.2,.9,.2,1);
      pointer-events: none;
    `;
    return ph;
  }

  function findInsertPosition(y: number, x: number): { element: HTMLElement | null; insertAfter: boolean } {
    let insertAfter = false;
    let targetEl: HTMLElement | null = null;

    for (const pos of positions) {
      if (pos.el === draggingEl) continue;

      const centerY = pos.top + pos.height / 2;
      const centerX = pos.left + pos.width / 2;

      // Check if pointer is within bounds
      if (
        y >= pos.top &&
        y <= pos.top + pos.height &&
        x >= pos.left &&
        x <= pos.left + pos.width
      ) {
        // Determine insert position based on pointer position relative to center
        insertAfter = y > centerY;
        targetEl = pos.el;
        break;
      }
    }

    // If not found, check if we're before first or after last
    if (!targetEl && positions.length > 0) {
      const first = positions[0];
      const last = positions[positions.length - 1];

      if (y < first.top) {
        return { element: first.el, insertAfter: false };
      }
      if (y > last.top + last.height) {
        return { element: last.el, insertAfter: true };
      }
    }

    return { element: targetEl, insertAfter };
  }

  function updatePlaceholder() {
    if (!draggingEl || !placeholder) return;

    const midY = currentY + window.scrollY;
    const midX = currentX + window.scrollX;
    const { element, insertAfter } = findInsertPosition(midY, midX);

    if (element && element !== placeholder.previousSibling && element !== placeholder.nextSibling) {
      if (insertAfter) {
        if (element.nextSibling !== placeholder) {
          container.insertBefore(placeholder, element.nextSibling);
        }
      } else {
        if (element !== placeholder) {
          container.insertBefore(placeholder, element);
        }
      }
    } else if (!element && placeholder.parentNode === container) {
      // Move to end if no target
      if (container.lastChild !== placeholder) {
        container.appendChild(placeholder);
      }
    }
  }

  function animate() {
    if (!draggingEl || !springX || !springY) return;

    const newX = springX.update();
    const newY = springY.update();

    const deltaX = newX - (parseFloat(draggingEl.style.left || '0') - window.scrollX);
    const deltaY = newY - (parseFloat(draggingEl.style.top || '0') - window.scrollY);

    draggingEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    draggingEl.style.left = `${newX}px`;
    draggingEl.style.top = `${newY}px`;

    updatePlaceholder();

    if (!springX.isAtRest() || !springY.isAtRest()) {
      rafId = requestAnimationFrame(animate);
    }
  }

  function onPointerDown(e: PointerEvent) {
    // Ignore right clicks and non-primary buttons
    if (e.button !== 0) return;

    // Find the draggable item
    const target = (e.target as HTMLElement).closest(itemSelector) as HTMLElement;
    if (!target) {
      return;
    }

    // Check handle selector - if specified, only allow drag from handle
    if (handleSelector) {
      const handle = (e.target as HTMLElement).closest(handleSelector);
      if (!handle || !target.contains(handle)) {
        return;
      }
    }

    // Debug log
    if (typeof window !== 'undefined' && (window as any).__DRAG_REORDER_DEBUG__) {
      console.log('DragReorder: Starting drag', { target, handleSelector });
    }

    e.preventDefault();
    e.stopPropagation();

    pointerId = e.pointerId;
    draggingEl = target;

    // Try to set pointer capture
    try {
      draggingEl.setPointerCapture(pointerId);
    } catch (err) {
      // Fallback for browsers that don't support pointer capture
    }

    initialIndex = Array.from(container.children).indexOf(draggingEl);
    const rect = draggingEl.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    currentX = e.clientX;
    currentY = e.clientY;

    // Create placeholder
    placeholder = createPlaceholder(rect.height, rect.width);
    container.insertBefore(placeholder, draggingEl.nextSibling);

    // Setup dragging element
    draggingEl.classList.add('dragging');
    draggingEl.setAttribute('aria-grabbed', 'true');
    draggingEl.style.width = `${rect.width}px`;
    draggingEl.style.position = 'fixed';
    draggingEl.style.left = `${rect.left}px`;
    draggingEl.style.top = `${rect.top}px`;
    draggingEl.style.zIndex = '9999';
    draggingEl.style.pointerEvents = 'none';
    draggingEl.style.margin = '0';
    draggingEl.style.transform = 'translate3d(0, 0, 0) scale(1.02)';
    draggingEl.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)';
    draggingEl.style.willChange = 'transform';

    document.body.appendChild(draggingEl);

    // Initialize springs
    springX = new Spring(spring.stiffness, spring.damping);
    springY = new Spring(spring.stiffness, spring.damping);
    springX.setPosition(rect.left);
    springY.setPosition(rect.top);
    springX.setTarget(rect.left);
    springY.setTarget(rect.top);

    recalcPositions();
    announce(`Перетаскивание элемента ${initialIndex + 1} из ${positions.length}`);

    // Start animation loop
    rafId = requestAnimationFrame(animate);
  }

  function onPointerMove(e: PointerEvent) {
    if (!draggingEl || e.pointerId !== pointerId) return;

    e.preventDefault();
    e.stopPropagation();

    currentX = e.clientX;
    currentY = e.clientY;

    const targetX = currentX - offsetX;
    const targetY = currentY - offsetY;

    if (springX && springY) {
      springX.setTarget(targetX);
      springY.setTarget(targetY);

      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!draggingEl || e.pointerId !== pointerId) return;

    e.preventDefault();
    e.stopPropagation();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Release pointer capture
    try {
      draggingEl.releasePointerCapture(pointerId!);
    } catch (err) {
      // Ignore
    }

    // Place element at placeholder position
    if (placeholder && placeholder.parentNode) {
      container.insertBefore(draggingEl, placeholder);
    } else {
      container.appendChild(draggingEl);
    }

    // Reset styles
    draggingEl.style.position = '';
    draggingEl.style.left = '';
    draggingEl.style.top = '';
    draggingEl.style.width = '';
    draggingEl.style.zIndex = '';
    draggingEl.style.pointerEvents = '';
    draggingEl.style.margin = '';
    draggingEl.style.transform = '';
    draggingEl.style.boxShadow = '';
    draggingEl.style.willChange = '';
    draggingEl.classList.remove('dragging');
    draggingEl.setAttribute('aria-grabbed', 'false');

    // Remove placeholder
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }

    // Get new order
    const newOrder = Array.from(container.querySelectorAll(itemSelector))
      .map((el) => getItemId(el as HTMLElement))
      .filter((id) => id);

    const finalIndex = Array.from(container.children).indexOf(draggingEl);
    announce(`Элемент перемещен на позицию ${finalIndex + 1} из ${positions.length}`);

    // Call onChange callback
    if (onChange && initialIndex !== finalIndex) {
      onChange(newOrder);
    }

    draggingEl = null;
    pointerId = null;
    springX = null;
    springY = null;
  }

  function onKeyDown(e: KeyboardEvent) {
    const focused = document.activeElement as HTMLElement;
    if (!focused || !focused.matches(itemSelector)) return;

    if ((e.key === ' ' || e.key === 'Enter') && focused.getAttribute('aria-grabbed') !== 'true') {
      // Pick up
      e.preventDefault();
      focused.setAttribute('aria-grabbed', 'true');
      focused.classList.add('dragging-keyboard');
      focused.setAttribute('tabindex', '-1');
      announce(`Выбран элемент для перемещения`);
    } else if (
      (e.key === 'ArrowUp' || e.key === 'ArrowLeft') &&
      focused.getAttribute('aria-grabbed') === 'true'
    ) {
      e.preventDefault();
      const idx = Array.from(container.children).indexOf(focused);
      if (idx > 0) {
        container.insertBefore(focused, container.children[idx - 1]);
        announce(`Перемещено на позицию ${idx} из ${container.children.length}`);
      }
    } else if (
      (e.key === 'ArrowDown' || e.key === 'ArrowRight') &&
      focused.getAttribute('aria-grabbed') === 'true'
    ) {
      e.preventDefault();
      const idx = Array.from(container.children).indexOf(focused);
      if (idx < container.children.length - 1) {
        container.insertBefore(focused, container.children[idx + 2] || null);
        announce(`Перемещено на позицию ${idx + 2} из ${container.children.length}`);
      }
    } else if (e.key === 'Escape' && focused.getAttribute('aria-grabbed') === 'true') {
      e.preventDefault();
      focused.setAttribute('aria-grabbed', 'false');
      focused.classList.remove('dragging-keyboard');
      focused.setAttribute('tabindex', '0');
      announce('Отмена перемещения');
    } else if (
      (e.key === ' ' || e.key === 'Enter') &&
      focused.getAttribute('aria-grabbed') === 'true'
    ) {
      // Drop
      e.preventDefault();
      focused.setAttribute('aria-grabbed', 'false');
      focused.classList.remove('dragging-keyboard');
      focused.setAttribute('tabindex', '0');

      const newOrder = Array.from(container.querySelectorAll(itemSelector))
        .map((el) => getItemId(el as HTMLElement))
        .filter((id) => id);

      onChange(newOrder);
      announce('Элемент размещен');
    }
  }

  // Edge scroll support
  function checkEdgeScroll(e: PointerEvent) {
    if (!draggingEl) return;

    const scrollThreshold = 50;
    const scrollSpeed = 10;
    const rect = container.getBoundingClientRect();

    if (e.clientY < rect.top + scrollThreshold) {
      window.scrollBy(0, -scrollSpeed);
    } else if (e.clientY > rect.bottom - scrollThreshold) {
      window.scrollBy(0, scrollSpeed);
    }

    if (e.clientX < rect.left + scrollThreshold) {
      window.scrollBy(-scrollSpeed, 0);
    } else if (e.clientX > rect.right - scrollThreshold) {
      window.scrollBy(scrollSpeed, 0);
    }
  }

  // Setup event listeners
  const pointerMoveHandler = (e: PointerEvent) => {
    onPointerMove(e);
    checkEdgeScroll(e);
  };

  const handlers = {
    pointerdown: onPointerDown as EventListener,
    pointermove: pointerMoveHandler,
    pointerup: onPointerUp as EventListener,
    pointercancel: onPointerUp as EventListener,
    keydown: onKeyDown,
  };

  container.addEventListener('pointerdown', handlers.pointerdown, { passive: false });
  window.addEventListener('pointermove', handlers.pointermove, { passive: false });
  window.addEventListener('pointerup', handlers.pointerup, { passive: false });
  window.addEventListener('pointercancel', handlers.pointercancel, { passive: false });
  container.addEventListener('keydown', handlers.keydown);

  // Setup ARIA attributes
  container.setAttribute('role', 'list');
  Array.from(container.querySelectorAll(itemSelector)).forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.setAttribute('role', 'listitem');
    htmlEl.setAttribute('aria-grabbed', 'false');
    if (!htmlEl.dataset.key && !htmlEl.id) {
      htmlEl.dataset.key = `item-${i}`;
    }
    if (htmlEl.tabIndex === -1) {
      htmlEl.tabIndex = 0;
    }
  });

  // MutationObserver for dynamic content
  const observer = new MutationObserver(() => {
    if (!draggingEl) {
      recalcPositions();
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  return {
    recalc: recalcPositions,
    destroy: () => {
      container.removeEventListener('pointerdown', handlers.pointerdown);
      window.removeEventListener('pointermove', handlers.pointermove);
      window.removeEventListener('pointerup', handlers.pointerup);
      window.removeEventListener('pointercancel', handlers.pointercancel);
      container.removeEventListener('keydown', handlers.keydown);
      observer.disconnect();
      if (liveRegion) {
        liveRegion.remove();
        liveRegion = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}
