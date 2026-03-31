import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { 
  listBlocks, 
  deleteBlock, 
  updateBlock,
  getProfile, 
  updateProfile, 
  createBlock,
  publicUrl, 
  qrUrlForPublic,
  type Block, 
  type BlockGridSize,
  type Profile, 
  type BlockType,
  type BlockSizes,
  type Layout,
} from "../api";
import Avatar from "../components/Avatar";
import { SortableBlockCard } from "../components/SortableBlockCard";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import MobileVisitPreviewModal from "../components/MobileVisitPreviewModal";
import SocialMediaForm, { type SocialSubmitItem } from "../components/SocialMediaForm";
import InlineInputCard from "../components/InlineInputCard";
import { formatPhoneNumber } from "../utils/phone";
import { useBreakpoint, Breakpoint } from "../hooks/useBreakpoint";
import { useBentoGridMetrics } from "../hooks/useBentoGridMetrics";
import {
  BENTO_ROW_UNIT,
  GRID_COLUMNS,
  assignSparseAnchorsForBreakpoint,
  clampGridSize,
  clientPointToGridAnchor,
  flattenLayoutIds,
  getResolvedGridSize,
  resolveAnchorOverlaps,
  sanitizeBlockSizes,
  stripAnchorsForBreakpoint,
} from "../lib/block-grid";

// dnd-kit imports
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import "../styles/drag-reorder.css";

/** Droppable сетки: сброс на «пустое» место без наезда на другую карточку */
const GRID_SURFACE_ID = "bento-grid-surface" as const;

/** Нижняя зона экрана при перетаскивании: растём вниз и чуть скроллим */
const DRAG_BOTTOM_EDGE_PX = 110;
const DRAG_BOTTOM_EXPAND_STEP = 14;

function pointerInExtendedGrid(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement,
  committedPadBottom: number,
  desiredPadBottom: number,
): boolean {
  const r = gridEl.getBoundingClientRect();
  const extra = Math.max(0, desiredPadBottom - committedPadBottom);
  const bottom = r.bottom + extra;
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= bottom
  );
}

function BentoGridDropSurface({
  gridRef,
  className,
  style,
  children,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: GRID_SURFACE_ID,
    data: { type: "grid-surface" },
  });
  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setNodeRef(node);
    },
    [gridRef, setNodeRef],
  );
  return (
    <div ref={mergedRef} className={className} style={style}>
      {children}
    </div>
  );
}

type DebouncedFn<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 500): DebouncedFn<T> {
  let timeoutId: number | undefined;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      fn(...args);
    }, wait);
  }) as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

export default function Editor() {
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockSizes, setBlockSizes] = useState<BlockSizes>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    name: "",
    bio: "",
    phone: "",
    email: "",
    telegram: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [activeId, setActiveId] = useState<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  /** Всегда обновляем — dnd-kit считает коллизии до commit setActiveId после DragStart */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp, { capture: true });
    };
  }, []);

  // State для инлайн-карточки ввода (ссылка, видео, музыка)
  const [inlineInput, setInlineInput] = useState<{
    type: 'link' | 'video' | 'music';
    buttonRect: DOMRect;
  } | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  /** Синхронно с padding в state — для коллизий до следующего paint (иначе дроп не видит новую высоту) */
  const canvasPadDesiredRef = useRef(0);
  /** Нижний «холст» сетки (padding на самом .bento-grid, чтобы дроп и координаты совпадали) */
  const [editorCanvasPadBottom, setEditorCanvasPadBottom] = useState(0);

  const addCanvasPadDelta = useCallback((delta: number) => {
    if (delta <= 0) return;
    canvasPadDesiredRef.current += delta;
    setEditorCanvasPadBottom(canvasPadDesiredRef.current);
  }, []);

  /** Колёсик только во время drag: холст растёт вместе со скроллом, иначе дроп не попадает в сетку */
  useEffect(() => {
    if (activeId == null) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (e.deltaY <= 0) return;

      const el = e.target as HTMLElement;
      const scrollHost = el.closest(".card__content") as HTMLElement | null;
      if (scrollHost) {
        const oy = getComputedStyle(scrollHost).overflowY;
        if (
          (oy === "auto" || oy === "scroll") &&
          scrollHost.scrollHeight > scrollHost.clientHeight + 1
        ) {
          const { scrollTop, scrollHeight, clientHeight } = scrollHost;
          if (e.deltaY < 0 && scrollTop > 0) return;
          if (e.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 1) return;
        }
      }

      addCanvasPadDelta(Math.min(120, Math.abs(e.deltaY)));
    };

    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [activeId, addCanvasPadDelta]);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Если мы не на странице /editor, не делаем редирект
  if (location.pathname !== "/editor") {
    return null;
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobileViewport(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Проверяем наличие токена перед загрузкой данных
    const token = sessionStorage.getItem("token");
    if (!token) {
      // Убираем старый токен, если остался в localStorage
      localStorage.removeItem("token");
      setIsAuthorized(false);
      setLoading(false);
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [b, p] = await Promise.all([listBlocks(), getProfile()]);
      const sorted = [...b].sort((a, b) => a.sort - b.sort);
      const normalizedBlockSizes = sanitizeBlockSizes(p.blockSizes, sorted.map(block => block.id));
      setBlocks(sorted);
      setBlockSizes(normalizedBlockSizes);
      setProfile(p);

      if (p.layout) {
        setLayout(normalizeLayout(p.layout, sorted.map(b => b.id)));
      } else {
        const initialLayout = generateInitialLayout(sorted);
        setLayout(initialLayout);
        updateProfile({ layout: initialLayout }).catch(console.error);
      }

      setProfileForm({
        username: p.username || "",
        name: p.name || "",
        bio: p.bio || "",
        phone: (p as any).phone || "",
        email: (p as any).email || "",
        telegram: (p as any).telegram || "",
      });
      setIsAuthorized(true);
    } catch (e: any) {
      console.error("Ошибка загрузки данных:", e);
      const errorMessage = e?.message || "Не удалось загрузить данные";

      // Если ошибка авторизации, перенаправляем на страницу входа
      if (errorMessage === "unauthorized" || errorMessage === "user_not_found") {
        const token = sessionStorage.getItem("token");
        if (!token) {
          setIsAuthorized(false);
          return;
        }
        // Токен недействителен
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        setIsAuthorized(false);
        return;
      }

      // Если профиль не найден, но пользователь авторизован, это нормально - профиль будет создан автоматически
      if (errorMessage === "profile_load_failed" || errorMessage === "load_blocks_failed") {
        // Попробуем перезагрузить данные через секунду
        setTimeout(() => {
          loadData();
        }, 1000);
        return;
      }

      // Проверка на сетевые ошибки
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setError("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на http://localhost:3000");
        setIsAuthorized(true); // Не редиректим при сетевых ошибках
        return;
      }

      if (errorMessage === "backend_api_not_configured") {
        setError("Frontend собран без VITE_BACKEND_API_URL. Для Render укажите полный URL backend с /api на конце и пересоберите frontend.");
        setIsAuthorized(true);
        return;
      }

      if (errorMessage === "api_returned_html") {
        setError("API вернул HTML вместо JSON. Обычно это означает неверный VITE_BACKEND_API_URL или запросы в домен статики вместо backend.");
        setIsAuthorized(true);
        return;
      }

      setError(errorMessage === "Не удалось загрузить данные" ? errorMessage : `Ошибка: ${errorMessage}`);
      setIsAuthorized(true); // Не редиректим при других ошибках
    } finally {
      setLoading(false);
    }
  }

  function normalizeLayout(layout: Layout, allIds: number[]): Layout {
    const result: Layout = { mobile: [], tablet: [], desktop: [] };

    (Object.keys(result) as Breakpoint[]).forEach((bp) => {
      const ordered = flattenLayoutIds(layout?.[bp]);
      const merged = [...ordered];

      allIds.forEach((id) => {
        if (!merged.includes(id)) {
          merged.push(id);
        }
      });

      result[bp] = [merged];
    });

    return result;
  }

  function generateInitialLayout(blocks: Block[]): Layout {
    const ids = blocks.map(b => b.id);
    return {
      mobile: [ids],
      tablet: [ids],
      desktop: [ids],
    };
  }

  const currentOrder = React.useMemo(
    () => (layout ? flattenLayoutIds(layout[breakpoint]) : blocks.map((block) => block.id)),
    [layout, breakpoint, blocks],
  );

  const currentGridColumns = GRID_COLUMNS[breakpoint];
  const currentGridGap = 16;
  const { gridRef, cellSize } = useBentoGridMetrics(currentGridColumns, currentGridGap);

  /**
   * dnd-kit передаёт pointerCoordinates как activation+translate — при скролле/оверлее это может
   * расходиться с реальным clientX/Y. Всегда используем lastPointerRef (window pointermove).
   * Ниж сетки расширяем на (desiredPad − committedPad) до paint.
   */
  const bentoGridCollisionDetection = useMemo<CollisionDetection>(
    () => (args) => {
      const { droppableContainers, pointerCoordinates: kitPointer } = args;
      const pt = lastPointerRef.current;
      const pointerCoordinates =
        Number.isFinite(pt.x) && Number.isFinite(pt.y) ? { x: pt.x, y: pt.y } : kitPointer;
      if (!pointerCoordinates) return [];

      const argsWithPointer = { ...args, pointerCoordinates };

      const blockContainers = droppableContainers.filter((c) => typeof c.id === "number");
      const blockIntersections = pointerWithin({
        ...argsWithPointer,
        droppableContainers: blockContainers,
      });
      if (blockIntersections.length > 0) {
        return closestCenter({
          ...argsWithPointer,
          droppableContainers: args.droppableContainers.filter((container) =>
            blockIntersections.some((bc) => bc.id === container.id),
          ),
        });
      }

      const gridExtraBottom = Math.max(0, canvasPadDesiredRef.current - editorCanvasPadBottom);
      const gridContainer = droppableContainers.find((c) => c.id === GRID_SURFACE_ID);
      const gridEl = gridRef.current;
      if (gridContainer && gridEl) {
        const r = gridEl.getBoundingClientRect();
        const effectiveBottom = r.bottom + gridExtraBottom;
        const inGrid =
          pointerCoordinates.x >= r.left &&
          pointerCoordinates.x <= r.right &&
          pointerCoordinates.y >= r.top &&
          pointerCoordinates.y <= effectiveBottom;
        if (inGrid) {
          return [
            {
              id: GRID_SURFACE_ID,
              data: {
                droppableContainer: gridContainer,
                value: 0,
              },
            },
          ];
        }
      }

      return [];
    },
    [editorCanvasPadBottom, gridRef],
  );

  const saveLayout = useMemo(
    () =>
      debounce(async (newLayout: Layout) => {
        try {
          await updateProfile({ layout: newLayout });
        } catch (error) {
          console.error("Failed to save layout", error);
          setToast("Не удалось сохранить расположение блоков");
        }
      }, 500),
    []
  );

  const saveBlockSizes = useMemo(
    () =>
      debounce(async (newBlockSizes: BlockSizes) => {
        try {
          await updateProfile({ blockSizes: newBlockSizes });
        } catch (error) {
          console.error("Failed to save block sizes", error);
          setToast("Не удалось сохранить размер карточки");
        }
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      saveLayout.cancel();
      saveBlockSizes.cancel();
    };
  }, [saveLayout, saveBlockSizes]);

  const orderKey = currentOrder.join(",");
  const blockIdsKey = blocks.map((b) => b.id).join(",");

  useEffect(() => {
    if (!cellSize || !layout || blocks.length === 0) return;
    setBlockSizes((prev) => {
      const needAnchor = currentOrder.some(
        (id) => !prev[id]?.anchorsByBreakpoint?.[breakpoint],
      );
      if (!needAnchor) return prev;
      const assigned = assignSparseAnchorsForBreakpoint(
        currentOrder,
        blocks,
        prev,
        breakpoint,
        currentGridColumns,
        cellSize,
        currentGridGap,
      );
      saveBlockSizes(assigned);
      return assigned;
    });
  }, [
    cellSize,
    breakpoint,
    layout,
    orderKey,
    blockIdsKey,
    currentGridColumns,
    currentGridGap,
    saveBlockSizes,
  ]);

  const handleDragStart = (event: DragStartEvent) => {
    canvasPadDesiredRef.current = editorCanvasPadBottom;
    setActiveId(event.active.id as number);
    const e = event.activatorEvent as PointerEvent;
    if (e?.clientX != null) {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleDragMove = (_event: DragMoveEvent) => {
    if (typeof _event.active.id !== "number") return;
    const y = lastPointerRef.current.y;
    const gridEl = gridRef.current;
    if (gridEl) {
      const r = gridEl.getBoundingClientRect();
      const lagBottom = Math.max(0, canvasPadDesiredRef.current - editorCanvasPadBottom);
      const effectiveBottom = r.bottom + lagBottom;
      const margin = 56;
      if (y > effectiveBottom - margin) {
        const extra = Math.min(72, Math.ceil((y - (effectiveBottom - margin)) * 0.45 + 10));
        addCanvasPadDelta(extra);
      }
    }
    const h = window.innerHeight;
    const zoneStart = h - DRAG_BOTTOM_EDGE_PX;
    if (y <= zoneStart) return;
    const depth = Math.min(1, (y - zoneStart) / DRAG_BOTTOM_EDGE_PX);
    const delta = Math.max(6, Math.round(DRAG_BOTTOM_EXPAND_STEP * (0.4 + depth * 0.6)));
    addCanvasPadDelta(delta);
    window.scrollBy({ top: Math.min(delta, 28), left: 0, behavior: "auto" });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!layout) return;

    const draggedId = active.id as number;

    const gridEl = gridRef.current;
    const pointer = lastPointerRef.current;
    const dropOnGridSurface =
      over?.id === GRID_SURFACE_ID ||
      (!over &&
        gridEl &&
        pointerInExtendedGrid(
          pointer.x,
          pointer.y,
          gridEl,
          editorCanvasPadBottom,
          canvasPadDesiredRef.current,
        ));

    if (dropOnGridSurface) {
      if (!gridEl) return;

      const block = blocks.find((b) => b.id === draggedId);
      if (!block) return;

      const gs = getResolvedGridSize(block, blockSizes[draggedId], currentGridColumns);
      const anchor = clientPointToGridAnchor(
        pointer.x,
        pointer.y,
        gridEl,
        currentGridColumns,
        cellSize,
        currentGridGap,
        BENTO_ROW_UNIT,
        gs.colSpan,
      );

      setBlockSizes((prev) => {
        const prevEntry = prev[draggedId] ?? {};
        const next: BlockSizes = {
          ...prev,
          [draggedId]: {
            ...clampGridSize(
              { ...prevEntry, colSpan: gs.colSpan, rowSpan: gs.rowSpan },
              currentGridColumns,
            ),
            anchorsByBreakpoint: {
              ...(prevEntry.anchorsByBreakpoint ?? {}),
              [breakpoint]: anchor,
            },
          },
        };
        let merged = assignSparseAnchorsForBreakpoint(
          currentOrder,
          blocks,
          next,
          breakpoint,
          currentGridColumns,
          cellSize,
          currentGridGap,
          BENTO_ROW_UNIT,
          { onlyMissing: true },
        );
        merged = resolveAnchorOverlaps(
          merged,
          currentOrder,
          blocks,
          breakpoint,
          currentGridColumns,
          cellSize,
          currentGridGap,
        );
        saveBlockSizes(merged);
        return merged;
      });
      return;
    }

    if (!over) {
      return;
    }

    if (typeof over.id !== "number") return;

    const overId = over.id as number;
    const oldIndex = currentOrder.indexOf(draggedId);
    const newIndex = currentOrder.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const nextOrder = arrayMove(currentOrder, oldIndex, newIndex);
    const newLayout = { ...layout, [breakpoint]: [nextOrder] };
    setLayout(newLayout);
    saveLayout(newLayout);

    setBlockSizes((prev) => {
      const cleared = stripAnchorsForBreakpoint(prev, breakpoint);
      const assigned = assignSparseAnchorsForBreakpoint(
        nextOrder,
        blocks,
        cleared,
        breakpoint,
        currentGridColumns,
        cellSize,
        currentGridGap,
      );
      saveBlockSizes(assigned);
      return assigned;
    });
  };

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        username: profileForm.username,
        name: profileForm.name || null,
        bio: profileForm.bio || null,
        phone: profileForm.phone || null,
        email: profileForm.email || null,
        telegram: profileForm.telegram || null,
      } as any);
      setProfile(updated);
      setEditingProfile(false);
    } catch (e) {
      alert("Не удалось сохранить профиль");
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteBlock(id: number) {
    if (!confirm("Удалить этот блок?")) return;
    try {
      await deleteBlock(id);
      setBlocks(prev => prev.filter(b => b.id !== id));
      setBlockSizes(prev => {
        if (!(id in prev)) return prev;

        const next = { ...prev };
        delete next[id];
        saveBlockSizes(next);
        return next;
      });

      if (!layout) return;
      const newLayout = { ...layout };
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        newLayout[bp] = newLayout[bp].map(col => col.filter(blockId => blockId !== id));
      });
      setLayout(newLayout);
      saveLayout(newLayout);
    } catch (e) {
      alert("Не удалось удалить блок");
      console.error(e);
    }
  }

  async function handleUpdateBlock(id: number, partial: Partial<Block>) {
    try {
      const updated = await updateBlock(id, partial);
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (e) {
      console.error(e);
      setToast("Не удалось сохранить изменения");
    }
  }

  function handleBlockDimensionsChange(id: number, nextDimensions: BlockGridSize | null) {
    setBlockSizes((prev) => {
      const next = { ...prev };

      if (nextDimensions == null) {
        delete next[id];
        saveBlockSizes(next);
        return next;
      }

      const prevEntry = prev[id] ?? {};
      next[id] = {
        colSpan: nextDimensions.colSpan,
        rowSpan: nextDimensions.rowSpan,
        anchorsByBreakpoint: {
          ...(prevEntry.anchorsByBreakpoint ?? {}),
          ...(nextDimensions.anchorsByBreakpoint ?? {}),
        },
      };

      let merged = assignSparseAnchorsForBreakpoint(
        currentOrder,
        blocks,
        next,
        breakpoint,
        currentGridColumns,
        cellSize,
        currentGridGap,
        BENTO_ROW_UNIT,
        { onlyMissing: true },
      );
      merged = resolveAnchorOverlaps(
        merged,
        currentOrder,
        blocks,
        breakpoint,
        currentGridColumns,
        cellSize,
        currentGridGap,
      );
      saveBlockSizes(merged);
      return merged;
    });
  }

  // Для заголовков и заметок создаём пустой блок сразу и ставим фокус
  const createEmptyBlock = async (type: BlockType, initialData: Partial<Block> = {}) => {
    try {
      const newBlock = await createBlock({ type, ...initialData } as any);
      setBlocks(prev => [...prev, newBlock]);
      if (!layout) return;
      const newLayout = { ...layout };
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        const ordered = flattenLayoutIds(newLayout[bp]);
        newLayout[bp] = [[...ordered, newBlock.id]];
      });
      setLayout(newLayout);
      saveLayout(newLayout);

      // Фокусируемся на элементе с задержкой и повторными попытками
      const targetId = newBlock.id;
      const focusOnBlock = () => {
        const el = document.querySelector(`[data-block-id="${targetId}"]`);
        if (!el) return false;

        if (type === 'section') {
          const input = el.querySelector('input');
          if (input) {
            input.focus();
            return true;
          }
        } else if (type === 'note') {
          const editable = el.querySelector('[contenteditable="true"]');
          if (editable && editable instanceof HTMLElement) {
            editable.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editable);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
            return true;
          }
        }
        return false;
      };

      // Пробуем сразу
      if (focusOnBlock()) return;

      // Если не получилось, пробуем несколько раз с интервалом
      let attempts = 0;
      const interval = setInterval(() => {
        if (focusOnBlock() || attempts >= 20) {
          clearInterval(interval);
        }
        attempts++;
      }, 100);
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
  };

  // Для ссылок, видео, музыки – открываем инлайн-карточку над кнопкой
  const handleAddWithInline = (type: 'link' | 'video' | 'music', buttonElement: HTMLElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setInlineInput({
      type,
      buttonRect: rect,
    });
  };

  const handleInlineSubmit = async (value: string) => {
    if (!inlineInput) return;
    const { type } = inlineInput;
    let blockData: Partial<Block> = { type };
    if (type === 'link') {
      blockData.linkUrl = value;
    } else if (type === 'video') {
      blockData.videoUrl = value;
    } else if (type === 'music') {
      blockData.musicEmbed = value;
    }
    try {
      const newBlock = await createBlock(blockData as any);
      setBlocks(prev => [...prev, newBlock]);
      if (!layout) return;
      const newLayout = { ...layout };
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        const ordered = flattenLayoutIds(newLayout[bp]);
        newLayout[bp] = [[...ordered, newBlock.id]];
      });
      setLayout(newLayout);
      saveLayout(newLayout);
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
    setInlineInput(null);
  };

  // Остальные типы (соцсети, фото, карта) остаются в модалке
  const handleAddBlockClick = (type: BlockType) => {
    if (type === 'section') {
      createEmptyBlock('section', { note: '' });
    } else if (type === 'note') {
      createEmptyBlock('note', { note: '' });
    } else if (type === 'link' || type === 'video' || type === 'music') {
      const btn = document.querySelector(`[data-add-type="${type}"]`) as HTMLElement;
      if (btn) handleAddWithInline(type, btn);
    } else {
      setModalType(type);
      setModalOpen(true);
    }
  };

  async function handleBlockCreated(newBlock: Block) {
    // Раньше использовалась для модалки, сейчас не нужна, но оставим для совместимости
    if (!layout) return;
    const newLayout = { ...layout };
    (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
      const ordered = flattenLayoutIds(newLayout[bp]);
      newLayout[bp] = [[...ordered, newBlock.id]];
    });
    setLayout(newLayout);
    saveLayout(newLayout);
    setBlocks(prev => [...prev, newBlock]);
  }

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const newBlock = await createBlock(data as any);
      await handleBlockCreated(newBlock);
    } catch (e) {
      alert("Не удалось создать блок");
      console.error(e);
    }
  }

  async function handleSocialMediaSubmit(blocksData: SocialSubmitItem[]) {
    try {
      const createdBlocks = await Promise.all(
        blocksData.map(blockData => createBlock(blockData as any))
      );
      setBlocks(prev => [...prev, ...createdBlocks]);

      if (!layout) return;
      const newLayout = { ...layout };
      const newIds = createdBlocks.map(b => b.id);
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        const ordered = flattenLayoutIds(newLayout[bp]);
        newLayout[bp] = [[...ordered, ...newIds]];
      });
      setLayout(newLayout);
      saveLayout(newLayout);
    } catch (e) {
      alert("Не удалось создать блоки");
      console.error(e);
      throw e;
    }
  }

  // Редирект на страницу входа, если пользователь не авторизован
  if (isAuthorized === false) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="muted">Загрузка…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="ribbon error">{error}</div>
      </div>
    );
  }

  if (!profile || !layout) return null;

  const totalBlocks = blocks.length;

  return (
    <div className="page-bg min-h-screen editor-page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
        {/* Two Column Layout: Profile Left, Blocks Right */}
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Left Column: Profile (fixed) + Placeholder for grid */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {/* Fixed profile */}
            <div ref={profileRef} className="profile-column" style={{ maxWidth: "100%" }}>
              <div className="reveal reveal-in">
                <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", alignItems: "flex-start" }}>
                  {/* Avatar */}
                  <div>
                    <Avatar
                      src={profile.avatarUrl}
                      size={120}
                      editable={true}
                      onChange={async (url: string) => {
                        try {
                          const updated = await updateProfile({ avatarUrl: url } as any);
                          setProfile({ ...updated, avatarUrl: updated.avatarUrl ? `${updated.avatarUrl}?t=${Date.now()}` : updated.avatarUrl });
                        } catch {
                          alert("Не удалось сохранить аватар");
                        }
                      }}
                    />
                  </div>

                  {/* Profile Info */}
                  {editingProfile ? (
                    <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                          Имя
                        </label>
                        <input 
                        className="input"
                        placeholder="Ваше имя"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        style={{ fontSize: 16, fontWeight: 700, padding: "8px 12px", width: "100%" }}
                      />
                      </div>
                      <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Username
                      </label>
                        <div style={{ position: "relative", width: "100%" }}>
                        <span style={{ 
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 16, 
                          color: "var(--text)",
                          pointerEvents: "none",
                          zIndex: 1
                        }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          required
                          style={{ 
                            fontSize: 16, 
                            padding: "8px 12px 8px 28px", 
                            width: "100%"
                          }}
                        />
                        </div>
                      </div>
                      <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Описание
                      </label>
                      <textarea
                        className="textarea"
                        placeholder="Расскажите о себе..."
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={4}
                        style={{ fontSize: 14, resize: "vertical", width: "100%" }}
                      />
                      </div>
                      <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Телефон
                      </label>
                      <input
                        className="input"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={profileForm.phone || ""}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setProfileForm({ ...profileForm, phone: formatted });
                        }}
                        style={{ fontSize: 14, padding: "8px 12px", width: "100%" }}
                      />
                      </div>
                      <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Email
                      </label>
                      <input
                        className="input"
                        type="email"
                        placeholder="example@mail.ru"
                        value={profileForm.email || ""}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        style={{ fontSize: 14, padding: "8px 12px", width: "100%" }}
                      />
                      </div>
                      <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Telegram
                      </label>
                        <div style={{ position: "relative", width: "100%" }}>
                        <span style={{ 
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 14, 
                          color: "var(--text)",
                          pointerEvents: "none",
                          zIndex: 1
                        }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.telegram || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                          style={{ 
                            fontSize: 14, 
                            padding: "8px 12px 8px 28px", 
                            width: "100%"
                          }}
                        />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                        <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ width: "100%" }}>
                          {savingProfile ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile(false);
                            setProfileForm({
                              username: profile.username || "",
                              name: profile.name || "",
                              bio: profile.bio || "",
                              phone: (profile as any).phone || "",
                              email: (profile as any).email || "",
                              telegram: (profile as any).telegram || "",
                            });
                          }}
                          className="btn btn-ghost"
                          style={{ width: "100%" }}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                                            <div style={{ textAlign: "left", width: "100%" }}>
                        <h1 style={{ 
                          fontSize: 32, 
                          fontWeight: 800, 
                          letterSpacing: "-0.03em", 
                          lineHeight: 1.2, 
                          color: "var(--text)", 
                          marginBottom: 8, 
                          wordBreak: "break-word"
                        }}>
                          {profile.name || profile.username}
                        </h1>
                        <p style={{ 
                          fontSize: 16, 
                          color: "var(--text)", 
                          marginBottom: 16, 
                          fontWeight: 500
                        }}>
                          @{profile.username}
                        </p>
                        {profile.bio && (
                          <p style={{ 
                            color: "var(--text)", 
                            fontSize: 14, 
                            lineHeight: 1.6, 
                            textAlign: "left",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "pre-wrap",
                            width: "100%",
                            maxWidth: "100%",
                            marginBottom: 16
                          }}>
                            {profile.bio}
                          </p>
                        )}
                        {(profile.phone || profile.email || profile.telegram) && (
                          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            {profile.phone && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                📞 {profile.phone}
                              </div>
                            )}
                            {profile.email && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                ✉️ {profile.email}
                              </div>
                            )}
                            {profile.telegram && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                ✈️ {profile.telegram}
                              </div>
                            )}
                          </div>
                        )}
                        {/* QR-код публичной визитки */}
                        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: 13, width: "100%", justifyContent: "flex-start" }}
                            onClick={() => setShowQr(true)}
                          >
                            📱 Показать QR визитки
                          </button>
                          <div style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>
                            Публичная ссылка: {publicUrl(profile.username)}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingProfile(true)}
                          className="btn btn-ghost"
                          style={{ 
                            fontSize: 13, 
                            padding: "8px 16px", 
                            marginTop: 16, 
                            width: "auto",
                            background: "var(--accent)",
                            border: "1px solid var(--border)"
                          }}
                        >
                          ✏️ Редактировать
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
                        {/* Placeholder для сохранения места в grid на больших экранах */}
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }}></div>
          </div>

          {/* Right Column: Blocks — нижний отступ холста только на drag к низу экрана */}
          <div
            className="editor-blocks-column"
            style={{
              minWidth: 0,
              width: "100%",
            }}
          >
            {totalBlocks === 0 ? (
              <SocialMediaForm onSubmit={handleSocialMediaSubmit} />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={bentoGridCollisionDetection}
                measuring={{
                  droppable: { strategy: MeasuringStrategy.Always },
                }}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragCancel={() => setActiveId(null)}
                onDragEnd={handleDragEnd}
              >
                <BentoGridDropSurface
                  gridRef={gridRef}
                  className="bento-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${currentGridColumns}, minmax(0, 1fr))`,
                    ['--grid-columns' as string]: String(currentGridColumns),
                    ['--grid-gap' as string]: `${currentGridGap}px`,
                    ['--bento-cell-size' as string]: cellSize ? `${cellSize}px` : undefined,
                    ['--bento-row-unit' as string]: `${BENTO_ROW_UNIT}px`,
                    gap: `${currentGridGap}px`,
                    gridAutoRows: `${BENTO_ROW_UNIT}px`,
                    gridAutoFlow: 'row',
                    paddingBottom: editorCanvasPadBottom,
                    boxSizing: 'border-box',
                  }}
                >
                  <SortableContext items={currentOrder} strategy={rectSortingStrategy}>
                    {currentOrder.map(blockId => {
                      const block = blocks.find(b => b.id === blockId);
                      return block ? (
                        <SortableBlockCard
                          key={block.id}
                          block={block}
                          gridColumns={currentGridColumns}
                          cellSize={cellSize}
                          gridGap={currentGridGap}
                          gridSize={blockSizes[block.id]}
                          gridAnchor={blockSizes[block.id]?.anchorsByBreakpoint?.[breakpoint] ?? null}
                          onGridSizeChange={(dimensions) => handleBlockDimensionsChange(block.id, dimensions)}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onUpdate={(partial) => handleUpdateBlock(block.id, partial)}
                        />
                      ) : null;
                    })}
                  </SortableContext>
                </BentoGridDropSurface>

                <DragOverlay>
                  {activeId ? (
                    <BlockCard 
                      b={blocks.find(b => b.id === activeId)!}
                      isDragPreview
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar - Block Selection */}
        <div
          ref={bottomBarRef}
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 20px",
            zIndex: 1000,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            maxWidth: "calc(100% - 40px)",
            width: "fit-content",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {[
              { type: "section" as BlockType, label: "Заголовок", icon: "📑" },
              { type: "note" as BlockType, label: "Заметка", icon: "📝" },
              { type: "link" as BlockType, label: "Ссылка", icon: "🔗" },
              { type: "social" as BlockType, label: "Соцсеть", icon: "💬" },
              { type: "photo" as BlockType, label: "Фото", icon: "🖼️" },
              { type: "video" as BlockType, label: "Видео", icon: "🎥" },
              { type: "music" as BlockType, label: "Музыка", icon: "🎵" },
              { type: "map" as BlockType, label: "Карта", icon: "🗺️" },
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                data-add-type={type}
                onClick={() => handleAddBlockClick(type)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  padding: "6px 10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.2s ease",
                  color: "var(--text)",
                  minWidth: "65px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
              </button>
            ))}
            <div
              role="separator"
              style={{
                width: 1,
                alignSelf: "stretch",
                minHeight: 44,
                background: "var(--border)",
                margin: "0 6px",
              }}
            />
            <button
              type="button"
              title="Превью визитки на телефоне"
              aria-label="Превью визитки на телефоне"
              onClick={() => setShowMobilePreview(true)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "6px 10px",
                background: isMobileViewport ? "var(--accent)" : "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
                transition: "all 0.2s ease",
                color: "var(--text)",
                minWidth: isMobileViewport ? "72px" : "52px",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                <line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.2 }}>
                {isMobileViewport ? "Превью" : "Тел."}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Block Modal (для соцсетей, фото, карты) */}
      {modalType && (
        <BlockModal
          type={modalType}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalType(null);
          }}
          onSubmit={handleBlockSubmit}
        />
      )}

      {/* Инлайн-карточка для ссылок, видео, музыки */}
      {inlineInput && (
        <InlineInputCard
          buttonRect={inlineInput.buttonRect}
          onSubmit={handleInlineSubmit}
          onCancel={() => setInlineInput(null)}
          placeholder={
            inlineInput.type === 'link'
              ? 'https://example.com'
              : inlineInput.type === 'video'
              ? 'https://youtu.be/... или https://vk.com/video...'
              : 'https://music.yandex.ru/... или embed-код'
          }
          buttonText="Добавить"
          type={inlineInput.type === 'link' ? 'url' : 'text'}
          validate={(val) => {
            if (inlineInput.type === 'link') {
              try {
                new URL(val);
                return true;
              } catch {
                return false;
              }
            }
            return val.trim().length > 0;
          }}
        />
      )}

      {profile && layout && (
        <MobileVisitPreviewModal
          open={showMobilePreview}
          onClose={() => setShowMobilePreview(false)}
          profile={profile}
          blocks={blocks}
          layout={layout}
          blockSizes={blockSizes}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="card" style={{ position: "fixed", right: 24, top: 24, padding: "14px 18px", zIndex: 10000, boxShadow: "var(--shadow-xl)", animation: "slideIn 0.3s ease" }}>
          {toast}
        </div>
      )}

      {/* QR-модалка */}
      {showQr && profile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 11000,
          }}
          onClick={() => setShowQr(false)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 360, width: "90%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>QR-код вашей визитки</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Отсканируйте код камерой телефона, чтобы открыть публичную страницу.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img
                src={qrUrlForPublic(profile.username)}
                alt="QR-код визитки"
                style={{ width: 220, height: 220 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", fontSize: 14 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publicUrl(profile.username));
                    setToast("Ссылка на визитку скопирована");
                    setTimeout(() => setToast(null), 2500);
                  } catch {
                    setToast("Не удалось скопировать ссылку");
                    setTimeout(() => setToast(null), 2500);
                  }
                }}
              >
                📋 Скопировать ссылку
              </button>
              <a
                href={qrUrlForPublic(profile.username)}
                download={`vizitka-${profile.username}-qr.png`}
                className="btn"
                style={{ width: "100%", fontSize: 14, textAlign: "center", justifyContent: "center", display: "inline-flex" }}
              >
                ⬇️ Скачать QR-код
              </a>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", fontSize: 14 }}
              onClick={() => setShowQr(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
