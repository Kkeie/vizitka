import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom"; // ONBOARDING: added useSearchParams
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
  getToken,
  setToken,
  BlockGridAnchor,
} from "../api";
import Avatar from "../components/Avatar";
import { DraggableBlockCard } from "../components/DraggableBlockCard";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import MobileVisitPreviewModal from "../components/MobileVisitPreviewModal";
import InlineInputCard from "../components/InlineInputCard";
import OnboardingInEditor from "../components/onboarding/OnboardingInEditor"; // ONBOARDING: import
import { formatPhoneNumber } from "../utils/phone";
import { measureBlockRects, animateFlip } from '../utils/flipAnimation';
import { useBreakpoint, Breakpoint } from "../hooks/useBreakpoint";
import { useBentoGridMetrics } from "../hooks/useBentoGridMetrics";
import { getSocialInfo } from '../lib/social-preview';
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

// dnd-kit imports – только для перетаскивания оверлея
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
} from '@dnd-kit/core';

import "../styles/drag-reorder.css";

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

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T & { cancel: () => void } {
  let timeoutId: number | null = null;
  const debounced = ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  }) as T & { cancel: () => void };
  debounced.cancel = () => { if (timeoutId) clearTimeout(timeoutId); };
  return debounced;
}

export default function Editor() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams(); // ONBOARDING
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
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  const [dragCellSize, setDragCellSize] = useState<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const revealTimeoutsRef = useRef<number[]>([]);

  // ONBOARDING: состояние для режима онбординга
  const onboardingMode = searchParams.get("onboarding") === "true";
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Рефы для отложенного перестроения
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasVirtualLayoutRef = useRef(false);
  const lastVirtualBlockSizesRef = useRef<BlockSizes | null>(null);
  // Новый реф для хранения исходного состояния якорей на момент начала драга
  const originalBlockSizesRef = useRef<BlockSizes>({});

  // Реф для FLIP-анимации
  const flipAnimationRef = useRef<{ cancel: () => void } | null>(null);

  // State для нижнего холста
  const [editorCanvasPadBottom, setEditorCanvasPadBottom] = useState(0);
  const canvasPadDesiredRef = useRef(0);
  const addCanvasPadDelta = useCallback((delta: number) => {
    if (delta <= 0) return;
    canvasPadDesiredRef.current += delta;
    setEditorCanvasPadBottom(canvasPadDesiredRef.current);
  }, []);

  // State для инлайн-ввода
  const [inlineInput, setInlineInput] = useState<{
    type: 'link' | 'video' | 'music';
    buttonRect: DOMRect;
  } | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);

  const isResizingRef = useRef(false);
  const resizeOriginalBlockSizesRef = useRef<BlockSizes>({});
  const resizeBlockIdRef = useRef<number | null>(null);
  const lastResizeSizeRef = useRef<BlockGridSize | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: () => ({ x: 0, y: 0 }),
    })
  );

  if (location.pathname !== "/editor") return null;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    return () => {
      revealTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      revealTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobileViewport(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setToken(null);
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
      if (errorMessage === "unauthorized" || errorMessage === "user_not_found") {
        setToken(null);
        setIsAuthorized(false);
        return;
      }
      setError(errorMessage);
      setIsAuthorized(true);
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
        if (!merged.includes(id)) merged.push(id);
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

  const currentOrder = useMemo(
    () => (layout ? flattenLayoutIds(layout[breakpoint]) : blocks.map((block) => block.id)),
    [layout, breakpoint, blocks],
  );

  const currentGridColumns = GRID_COLUMNS[breakpoint];
  const currentGridGap = 16;
  const { gridRef, cellSize } = useBentoGridMetrics(currentGridColumns, currentGridGap);

  const saveLayoutDebounced = useMemo(
    () => debounce(async (newLayout: Layout) => {
      try { await updateProfile({ layout: newLayout }); } catch (e) { console.error(e); }
    }, 500),
    []
  );
  const saveBlockSizesDebounced = useMemo(
    () => debounce(async (newBlockSizes: BlockSizes) => {
      try { await updateProfile({ blockSizes: newBlockSizes }); } catch (e) { console.error(e); }
    }, 500),
    []
  );

  const currentOrderRef = useRef(currentOrder);
  const blocksRef = useRef(blocks);
  useEffect(() => {
    currentOrderRef.current = currentOrder;
  }, [currentOrder]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  /**
   * При смене ширины сетки `cellSize` и `getGridRowSpan` меняются, а `gridRowStart` в state остаётся
   * от предыдущей геометрии — блоки визуально наезжают. Переупаковываем якоря (как на публичной странице).
   */
  useEffect(() => {
    if (loading) return;
    if (isDragging) return;
    const schedule = () => {
      if (isResizingRef.current) return;
      if (isDraggingRef.current) return;
      setBlockSizes((prev) => {
        const order = currentOrderRef.current;
        const bl = blocksRef.current;
        if (order.length === 0) return prev;
        const assigned = assignSparseAnchorsForBreakpoint(
          order,
          bl,
          prev,
          breakpoint,
          currentGridColumns,
          cellSize,
          currentGridGap,
          BENTO_ROW_UNIT,
          { onlyMissing: true },
        );
        const resolved = resolveAnchorOverlaps(
          assigned,
          order,
          bl,
          breakpoint,
          currentGridColumns,
          cellSize,
          currentGridGap,
        );
        if (JSON.stringify(resolved) === JSON.stringify(prev)) return prev;
        saveBlockSizesDebounced(resolved);
        return resolved;
      });
    };
    const t = window.setTimeout(schedule, 80);
    return () => clearTimeout(t);
  }, [cellSize, breakpoint, loading, isDragging, currentGridColumns, currentGridGap, saveBlockSizesDebounced]);

  const syncLayoutFromBlockSizes = useCallback((newBlockSizes: BlockSizes) => {
    // Собираем блоки, у которых есть якорь для текущего breakpoint
    const blocksWithAnchor = blocks
      .map(block => ({
        id: block.id,
        anchor: newBlockSizes[block.id]?.anchorsByBreakpoint?.[breakpoint],
      }))
      .filter((item): item is { id: number; anchor: BlockGridAnchor } => item.anchor !== undefined);

    // Сортируем по строке, затем по колонке
    blocksWithAnchor.sort((a, b) => {
      if (a.anchor.gridRowStart !== b.anchor.gridRowStart) {
        return a.anchor.gridRowStart - b.anchor.gridRowStart;
      }
      return a.anchor.gridColumnStart - b.anchor.gridColumnStart;
    });

    // Блоки без якоря добавляем в конец
    const blocksWithoutAnchor = blocks
      .filter(block => !newBlockSizes[block.id]?.anchorsByBreakpoint?.[breakpoint])
      .map(block => block.id);

    const newOrder = [...blocksWithAnchor.map(item => item.id), ...blocksWithoutAnchor];

    // Обновляем layout только если порядок изменился
    setLayout(prev => {
      if (!prev) return prev; // защита от null
      const currentOrderForBp = prev[breakpoint]?.[0] ?? [];
      if (JSON.stringify(currentOrderForBp) === JSON.stringify(newOrder)) return prev;
      // Возвращаем новый объект, сохраняя все брейкпоинты
      return {
        mobile: prev.mobile,
        tablet: prev.tablet,
        desktop: prev.desktop,
        [breakpoint]: [newOrder],
      };
    });

    // Сохраняем layout в БД только если он существует
    if (layout) {
      saveLayoutDebounced({
        ...layout,
        [breakpoint]: [newOrder],
      });
    }
  }, [blocks, breakpoint, layout, saveLayoutDebounced]);

  // Функция перестроения по координатам курсора, используя базовое состояние (originalBlockSizes)
  const recalcVirtualLayout = useCallback((
    draggedId: number,
    cursorX: number,
    cursorY: number,
    baseSizes: BlockSizes,
  ) => {

    const gridEl = gridRef.current;
    if (!gridEl) {
      return;
    }
    const draggedBlock = blocks.find(b => b.id === draggedId);
    if (!draggedBlock) {
      return;
    }

    const beforeRects = measureBlockRects(currentOrder);

    const gs = getResolvedGridSize(draggedBlock, baseSizes[draggedId], currentGridColumns);
    let anchor = clientPointToGridAnchor(
      cursorX, cursorY, gridEl, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT, gs.colSpan
    );
    const maxStartCol = currentGridColumns - gs.colSpan + 1;
    if (anchor.gridColumnStart > maxStartCol) anchor.gridColumnStart = Math.max(1, maxStartCol);

    let newSizes: BlockSizes = {
      ...baseSizes,
      [draggedId]: {
        ...(baseSizes[draggedId] || {}),
        colSpan: gs.colSpan,
        rowSpan: gs.rowSpan,
        anchorsByBreakpoint: {
          ...(baseSizes[draggedId]?.anchorsByBreakpoint || {}),
          [breakpoint]: anchor,
        },
      },
    };

    let assigned = assignSparseAnchorsForBreakpoint(
      currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT,
      { onlyMissing: true, priorityBlockId: draggedId }
    );
    let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);

    setBlockSizes(resolved);
    syncLayoutFromBlockSizes(resolved); // синхронизация порядка
    lastVirtualBlockSizesRef.current = resolved;
    hasVirtualLayoutRef.current = true;

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const afterRects = measureBlockRects(currentOrder);
        if (flipAnimationRef.current) flipAnimationRef.current.cancel();
        flipAnimationRef.current = animateFlip(beforeRects, afterRects, 300, () => {
          if (flipAnimationRef.current?.cancel === flipAnimationRef.current?.cancel) {
            flipAnimationRef.current = null;
          }
        });
      }, 0);
    });
  }, [blocks, currentOrder, breakpoint, currentGridColumns, cellSize, currentGridGap, gridRef, syncLayoutFromBlockSizes]);

  // Обработчики перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    // Отменяем предыдущую анимацию
    if (flipAnimationRef.current) {
      flipAnimationRef.current.cancel();
      flipAnimationRef.current = null;
    }
    setIsDragging(true);
    setDragCellSize(cellSize);
    setActiveId(event.active.id as number);
    hasVirtualLayoutRef.current = false;
    lastVirtualBlockSizesRef.current = null;
    // Сохраняем исходное состояние якорей на момент начала драга
    originalBlockSizesRef.current = blockSizes;
    const e = event.activatorEvent as PointerEvent;
    if (e?.clientX != null) {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleDragMove = (_event: DragMoveEvent) => {
    // Сбрасываем таймер при любом движении
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    const { x, y } = lastPointerRef.current;

    // Расширение скролла вниз
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
    if (y > zoneStart) {
      const depth = Math.min(1, (y - zoneStart) / DRAG_BOTTOM_EDGE_PX);
      const delta = Math.max(6, Math.round(DRAG_BOTTOM_EXPAND_STEP * (0.4 + depth * 0.6)));
      addCanvasPadDelta(delta);
      window.scrollBy({ top: Math.min(delta, 28), left: 0, behavior: "auto" });
    }

    // Запускаем таймер перестроения (200 мс), используя исходное состояние originalBlockSizesRef
    if (activeId !== null) {
      dragTimeoutRef.current = setTimeout(() => {
        recalcVirtualLayout(
          activeId,
          lastPointerRef.current.x,
          lastPointerRef.current.y,
          originalBlockSizesRef.current
        );
        dragTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    if (flipAnimationRef.current) {
      flipAnimationRef.current.cancel();
      flipAnimationRef.current = null;
    }
    setIsDragging(false);
    setDragCellSize(null);
    const draggedId = event.active.id as number;
    setActiveId(null);

    if (hasVirtualLayoutRef.current && lastVirtualBlockSizesRef.current) {
      await saveBlockSizesDebounced(lastVirtualBlockSizesRef.current);
      syncLayoutFromBlockSizes(lastVirtualBlockSizesRef.current);
      hasVirtualLayoutRef.current = false;
      lastVirtualBlockSizesRef.current = null;
    } else {
      const gridEl = gridRef.current;
      if (gridEl && draggedId) {
        const pointer = lastPointerRef.current;
        const r = gridEl.getBoundingClientRect();
        const extra = Math.max(0, canvasPadDesiredRef.current - editorCanvasPadBottom);
        const bottom = r.bottom + extra;
        const inGrid = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= bottom;
        if (inGrid) {
          const block = blocks.find(b => b.id === draggedId);
          if (block) {
            const baseSizes = originalBlockSizesRef.current;
            const gs = getResolvedGridSize(block, baseSizes[draggedId], currentGridColumns);
            let anchor = clientPointToGridAnchor(
              pointer.x, pointer.y, gridEl, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT, gs.colSpan
            );
            const maxStartCol = currentGridColumns - gs.colSpan + 1;
            if (anchor.gridColumnStart > maxStartCol) anchor.gridColumnStart = Math.max(1, maxStartCol);
            let newSizes: BlockSizes = {
              ...baseSizes,
              [draggedId]: {
                ...(baseSizes[draggedId] || {}),
                colSpan: gs.colSpan,
                rowSpan: gs.rowSpan,
                anchorsByBreakpoint: {
                  ...(baseSizes[draggedId]?.anchorsByBreakpoint || {}),
                  [breakpoint]: anchor,
                },
              },
            };
            let assigned = assignSparseAnchorsForBreakpoint(
              currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT,
              { onlyMissing: true, priorityBlockId: draggedId }
            );
            let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);
            setBlockSizes(resolved);
            syncLayoutFromBlockSizes(resolved);
            await saveBlockSizesDebounced(resolved);
          }
        }
      }
    }
    originalBlockSizesRef.current = {};
  };

  const handleResizeEnd = useCallback(() => {
    if (!isResizingRef.current) return;
    if (resizeBlockIdRef.current !== null) {
      saveBlockSizesDebounced(blockSizes);
    }
    // Отменяем анимацию, если она ещё идёт
    if (flipAnimationRef.current) {
      flipAnimationRef.current.cancel();
      flipAnimationRef.current = null;
    }
    isResizingRef.current = false;
    resizeOriginalBlockSizesRef.current = {};
    resizeBlockIdRef.current = null;
    lastResizeSizeRef.current = null;
  }, [blockSizes, saveBlockSizesDebounced]);

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
        saveBlockSizesDebounced(next);
        syncLayoutFromBlockSizes(next);
        return next;
      });
      if (!layout) return;
      const newLayout = { ...layout };
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        newLayout[bp] = newLayout[bp].map(col => col.filter(blockId => blockId !== id));
      });
      setLayout(newLayout);
      saveLayoutDebounced(newLayout);
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
    // Сброс размера (двойной клик)
    if (nextDimensions === null) {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        resizeOriginalBlockSizesRef.current = {};
        resizeBlockIdRef.current = null;
        lastResizeSizeRef.current = null;
      }
      if (flipAnimationRef.current) {
        flipAnimationRef.current.cancel();
        flipAnimationRef.current = null;
      }
      const beforeRects = measureBlockRects(currentOrder);
      setBlockSizes(prev => {
        const next = { ...prev };
        delete next[id];
        saveBlockSizesDebounced(next);
        syncLayoutFromBlockSizes(next); // синхронизация
        return next;
      });
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          const afterRects = measureBlockRects(currentOrder);
          if (flipAnimationRef.current) flipAnimationRef.current.cancel();
          flipAnimationRef.current = animateFlip(beforeRects, afterRects, 300, () => {
            if (flipAnimationRef.current?.cancel === flipAnimationRef.current?.cancel) {
              flipAnimationRef.current = null;
            }
          });
        }, 0);
      });
      return;
    }

    // Активный ресайз (через хендлы)
    if (isResizingRef.current && resizeBlockIdRef.current === id) {
      if (lastResizeSizeRef.current &&
          lastResizeSizeRef.current.colSpan === nextDimensions.colSpan &&
          lastResizeSizeRef.current.rowSpan === nextDimensions.rowSpan) {
        return;
      }
      lastResizeSizeRef.current = nextDimensions;
      const baseSizes = resizeOriginalBlockSizesRef.current;
      let newSizes: BlockSizes = {
        ...baseSizes,
        [id]: {
          ...(baseSizes[id] || {}),
          colSpan: nextDimensions.colSpan,
          rowSpan: nextDimensions.rowSpan,
          anchorsByBreakpoint: baseSizes[id]?.anchorsByBreakpoint,
        },
      };
      const beforeRects = measureBlockRects(currentOrder);
      let assigned = assignSparseAnchorsForBreakpoint(
        currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT,
        { onlyMissing: true, priorityBlockId: id }
      );
      let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);
      setBlockSizes(resolved);
      syncLayoutFromBlockSizes(resolved); // синхронизация
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          const afterRects = measureBlockRects(currentOrder);
          if (flipAnimationRef.current) flipAnimationRef.current.cancel();
          flipAnimationRef.current = animateFlip(beforeRects, afterRects, 300, () => {
            if (flipAnimationRef.current?.cancel === flipAnimationRef.current?.cancel) {
              flipAnimationRef.current = null;
            }
          });
        }, 0);
      });
      return;
    }

    // Сброс остаточных флагов ресайза
    if (isResizingRef.current || resizeBlockIdRef.current !== null || lastResizeSizeRef.current !== null) {
      isResizingRef.current = false;
      resizeOriginalBlockSizesRef.current = {};
      resizeBlockIdRef.current = null;
      lastResizeSizeRef.current = null;
    }

    // Одиночное изменение (SizeMenu)
    const beforeRects = measureBlockRects(currentOrder);
    const baseSizes = blockSizes;
    let newSizes: BlockSizes = {
      ...baseSizes,
      [id]: {
        ...(baseSizes[id] || {}),
        colSpan: nextDimensions.colSpan,
        rowSpan: nextDimensions.rowSpan,
        anchorsByBreakpoint: baseSizes[id]?.anchorsByBreakpoint,
      },
    };
    let assigned = assignSparseAnchorsForBreakpoint(
      currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT,
      { onlyMissing: true, priorityBlockId: id }
    );
    let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);
    setBlockSizes(resolved);
    syncLayoutFromBlockSizes(resolved); // синхронизация
    saveBlockSizesDebounced(resolved);
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const afterRects = measureBlockRects(currentOrder);
        if (flipAnimationRef.current) flipAnimationRef.current.cancel();
        flipAnimationRef.current = animateFlip(beforeRects, afterRects, 300, () => {
          if (flipAnimationRef.current?.cancel === flipAnimationRef.current?.cancel) {
            flipAnimationRef.current = null;
          }
        });
      }, 0);
    });
  }

  const revealCreatedBlock = useCallback(
    (blockId: number, options?: { focusType?: BlockType }) => {
      let attempts = 0;
      let didScroll = false;
      const tryReveal = () => {
        const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
        if (!el) return false;
        if (!didScroll) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          didScroll = true;
        }
        if (options?.focusType === "section") {
          const input = el.querySelector("input");
          if (input instanceof HTMLInputElement) {
            input.focus();
            input.select();
            return true;
          }
          return false;
        }
        if (options?.focusType === "note") {
          const editable = el.querySelector('[contenteditable="true"]');
          if (editable instanceof HTMLElement) {
            editable.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editable);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
            return true;
          }
          return false;
        }
        return true;
      };
      if (tryReveal()) return;
      const scheduleRetry = () => {
        const timeoutId = window.setTimeout(() => {
          attempts += 1;
          if (tryReveal() || attempts >= 20) return;
          scheduleRetry();
        }, 100);
        revealTimeoutsRef.current.push(timeoutId);
      };
      scheduleRetry();
    },
    [],
  );

  const appendCreatedBlocks = useCallback(
    (createdBlocks: Block[], options?: { focusType?: BlockType; scrollTargetId?: number }) => {
      if (createdBlocks.length === 0) return;
      const newIds = createdBlocks.map((block) => block.id);
      setBlocks((prev) => [...prev, ...createdBlocks]);
      setLayout((prev) => {
        if (!prev) return prev;
        const nextLayout = { ...prev };
        (Object.keys(nextLayout) as Breakpoint[]).forEach((bp) => {
          const ordered = flattenLayoutIds(nextLayout[bp]);
          nextLayout[bp] = [[...ordered, ...newIds]];
        });
        saveLayoutDebounced(nextLayout);
        return nextLayout;
      });

      setTimeout(() => {
        revealCreatedBlock(
          options?.scrollTargetId ?? newIds[newIds.length - 1],
          options?.focusType ? { focusType: options.focusType } : undefined,
        );
      }, 100);
    },
    [revealCreatedBlock, saveLayoutDebounced], 
  );

  const createEmptyBlock = useCallback(async (type: BlockType, initialData: Partial<Block> = {}) => {
    console.log('createEmptyBlock called with type:', type);
    try {
      const newBlock = await createBlock({ type, ...initialData } as any);
      appendCreatedBlocks([newBlock], { focusType: type });
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
  }, [appendCreatedBlocks]);

  const addOnboardingBlock = useCallback(async (type: "social" | "link", data: any) => {
    try {
      if (type === "social") {
        let url = data.socialUrl?.trim();
        if (!url) {
          setToast("Введите username или ссылку");
          return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          const platform = data.socialType;
          if (platform === "telegram") url = `https://t.me/${url.replace(/^@/, "")}`;
          else if (platform === "vk") url = `https://vk.com/${url}`;
          else if (platform === "instagram") url = `https://instagram.com/${url.replace(/^@/, "")}`;
          else if (platform === "twitter") url = `https://twitter.com/${url.replace(/^@/, "")}`;
          else if (platform === "linkedin") url = `https://linkedin.com/in/${url}`;
          else if (platform === "github") url = `https://github.com/${url}`;
          else if (platform === "youtube") url = `https://youtube.com/@${url.replace(/^@/, "")}`;
          else if (platform === "dribbble") url = `https://dribbble.com/${url}`;
          else if (platform === "behance") url = `https://behance.net/${url}`;
          else url = `https://${url}`;
        }
        try { new URL(url); } catch { throw new Error("invalid_url"); }
        const newBlock = await createBlock({
          type: "social",
          socialType: data.socialType,
          socialUrl: url,
          sort: blocks.length,
        });
        setBlocks(prev => [...prev, newBlock]);
        setLayout(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          (Object.keys(next) as Breakpoint[]).forEach(bp => {
            next[bp] = next[bp].map(col => [...col, newBlock.id]);
          });
          return next;
        });
      } else if (type === "link") {
        let url = data.linkUrl?.trim();
        if (!url) {
          setToast("Введите URL ссылки");
          return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }
        try { new URL(url); } catch { throw new Error("invalid_url"); }
        const newBlock = await createBlock({
          type: "link",
          linkUrl: url,
          sort: blocks.length,
        });
        setBlocks(prev => [...prev, newBlock]);
        setLayout(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          (Object.keys(next) as Breakpoint[]).forEach(bp => {
            next[bp] = next[bp].map(col => [...col, newBlock.id]);
          });
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      setToast("Не удалось создать блок. Проверьте ссылку.");
    }
  }, [blocks.length]);

  const handleAddWithInline = (type: 'link' | 'video' | 'music', buttonElement: HTMLElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setInlineInput({ type, buttonRect: rect });
  };

  const handleInlineSubmit = async (value: string) => {
    if (!inlineInput) return;
    const { type } = inlineInput;
    try {
      if (type === 'link') {
        const socialInfo = getSocialInfo(value);
        if (socialInfo.platform !== 'other') {
          const newBlock = await createBlock({ type: 'social', socialType: socialInfo.platform, socialUrl: value } as any);
          appendCreatedBlocks([newBlock]);
        } else {
          const newBlock = await createBlock({ type: 'link', linkUrl: value } as any);
          appendCreatedBlocks([newBlock]);
        }
      } else if (type === 'video') {
        const newBlock = await createBlock({ type: 'video', videoUrl: value } as any);
        appendCreatedBlocks([newBlock]);
      } else if (type === 'music') {
        const newBlock = await createBlock({ type: 'music', musicEmbed: value } as any);
        appendCreatedBlocks([newBlock]);
      }
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
    setInlineInput(null);
  };

  const handleAddBlockClick = useCallback((type: BlockType) => {
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
  }, [createEmptyBlock, handleAddWithInline]);

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const newBlock = await createBlock(data as any);
      appendCreatedBlocks([newBlock]);
    } catch (e) {
      alert("Не удалось создать блок");
      console.error(e);
    }
  }

  if (isAuthorized === false) return <Navigate to="/login" replace />;
  if (loading) return <div className="page-bg min-h-screen flex items-center justify-center">Загрузка…</div>;
  if (error) return <div className="page-bg min-h-screen flex items-center justify-center"><div className="ribbon error">{error}</div></div>;
  if (!profile || !layout) return null;

  const totalBlocks = blocks.length;
  const showOnboardingPanel = onboardingMode && !onboardingComplete;

  return (
    <div className="page-bg min-h-screen editor-page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Левая колонка */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {showOnboardingPanel ? (
              <OnboardingInEditor
                onAddBlock={addOnboardingBlock}
                onComplete={() => {
                  setOnboardingComplete(true);
                  setSearchParams({});
                  loadData(); // перезагружаем данные, чтобы подтянуть все блоки
                }}
              />
            ) : (
              <div ref={profileRef} className="profile-column" style={{ maxWidth: "100%" }}>
                <div className="reveal reveal-in">
                  <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", alignItems: "flex-start" }}>
                    <Avatar
                      src={profile.avatarUrl}
                      size={120}
                      editable={true}
                      onChange={async (url: string) => {
                        try {
                          const updated = await updateProfile({ avatarUrl: url } as any);
                          setProfile({ ...updated, avatarUrl: updated.avatarUrl ? `${updated.avatarUrl}?t=${Date.now()}` : updated.avatarUrl });
                        } catch { alert("Не удалось сохранить аватар"); }
                      }}
                    />
                    {editingProfile ? (
                      <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
                        <div><label>Имя</label><input className="input" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} style={{ width: "100%" }} /></div>
                        <div><label>Username</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>@</span><input className="input" value={profileForm.username} onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))} style={{ paddingLeft: 28, width: "100%" }} required /></div></div>
                        <div><label>Описание</label><textarea className="textarea" value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={4} /></div>
                        <div><label>Телефон</label><input className="input" value={profileForm.phone || ""} onChange={e => setProfileForm(p => ({ ...p, phone: formatPhoneNumber(e.target.value) }))} /></div>
                        <div><label>Email</label><input className="input" value={profileForm.email || ""} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} /></div>
                        <div><label>Telegram</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: "50%" }}>@</span><input className="input" value={profileForm.telegram || ""} onChange={e => setProfileForm(p => ({ ...p, telegram: e.target.value }))} style={{ paddingLeft: 28, width: "100%" }} /></div></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ width: "100%" }}>{savingProfile ? "Сохранение..." : "Сохранить"}</button>
                          <button type="button" onClick={() => { setEditingProfile(false); setProfileForm({ username: profile.username || "", name: profile.name || "", bio: profile.bio || "", phone: (profile as any).phone || "", email: (profile as any).email || "", telegram: (profile as any).telegram || "" }); }} className="btn btn-ghost" style={{ width: "100%" }}>Отмена</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em" }}>{profile.name || profile.username}</h1>
                        <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>@{profile.username}</p>
                        {profile.bio && <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16 }}>{profile.bio}</p>}
                        {(profile.phone || profile.email || profile.telegram) && (
                          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            {profile.phone && <div>📞 {profile.phone}</div>}
                            {profile.email && <div>✉️ {profile.email}</div>}
                            {profile.telegram && <div>✈️ {profile.telegram}</div>}
                          </div>
                        )}
                        <div style={{ marginTop: 20 }}>
                          <button className="btn" style={{ fontSize: 13 }} onClick={() => setShowQr(true)}>📱 Показать QR визитки</button>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Публичная ссылка: {publicUrl(profile.username)}</div>
                        </div>
                        <button onClick={() => setEditingProfile(true)} className="btn btn-ghost" style={{ marginTop: 16, background: "var(--accent)", border: "1px solid var(--border)" }}>✏️ Редактировать</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }}></div>
          </div>

          {/* Правая колонка – сетка блоков */}
          <div className="editor-blocks-column" style={{ minWidth: 0, width: "100%" }}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                  setIsDragging(false);
                  setDragCellSize(null);
                  setActiveId(null);
                  if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
                  if (flipAnimationRef.current) {
                    flipAnimationRef.current.cancel();
                    flipAnimationRef.current = null;
                  }
                  originalBlockSizesRef.current = {};
                  // Сброс ресайза
                  if (isResizingRef.current) {
                    isResizingRef.current = false;
                    resizeOriginalBlockSizesRef.current = {};
                    resizeBlockIdRef.current = null;
                    lastResizeSizeRef.current = null;
                  }
                }}
              >
                <div
                  ref={gridRef}
                  className="bento-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${currentGridColumns}, minmax(0, 1fr))`,
                    gap: `${currentGridGap}px`,
                    gridAutoRows: `${BENTO_ROW_UNIT}px`,
                    gridAutoFlow: 'row',
                    paddingBottom: editorCanvasPadBottom,
                    boxSizing: 'border-box',
                  }}
                >
                  {currentOrder.map(blockId => {
                    const block = blocks.find(b => b.id === blockId);
                    if (!block) return null;
                    const gridSize = getResolvedGridSize(block, blockSizes[blockId], currentGridColumns);
                    const anchor = blockSizes[blockId]?.anchorsByBreakpoint?.[breakpoint];
                    return (
                      <DraggableBlockCard
                        key={block.id}
                        block={block}
                        gridColumns={currentGridColumns}
                        cellSize={isDragging && dragCellSize !== null ? dragCellSize : cellSize}
                        gridGap={currentGridGap}
                        gridSize={gridSize}
                        gridAnchor={anchor}
                        onGridSizeChange={(dimensions) => handleBlockDimensionsChange(block.id, dimensions)}
                        onResizeEnd={handleResizeEnd}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onUpdate={(partial) => handleUpdateBlock(block.id, partial)}
                      />
                    );
                  })}
                </div>
                <DragOverlay>
                  {activeId ? <BlockCard b={blocks.find(b => b.id === activeId)!} isDragPreview colSpan={1} /> : null}
                </DragOverlay>
              </DndContext>
          </div>
        </div>

        {/* Нижняя панель с кнопками добавления блоков – скрываем во время онбординга */}
        {!showOnboardingPanel && (
          <div ref={bottomBarRef} style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 20px", zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxWidth: "calc(100% - 40px)", width: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {[
                { type: "section", label: "Заголовок", icon: "📑" },
                { type: "note", label: "Заметка", icon: "📝" },
                { type: "link", label: "Ссылка", icon: "🔗" },
                { type: "social", label: "Соцсеть", icon: "💬" },
                { type: "photo", label: "Фото", icon: "🖼️" },
                { type: "video", label: "Видео", icon: "🎥" },
                { type: "music", label: "Музыка", icon: "🎵" },
                { type: "map", label: "Карта", icon: "🗺️" },
              ].map(({ type, label, icon }) => (
                <button key={type} data-add-type={type} onClick={() => handleAddBlockClick(type as BlockType)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "6px 10px", background: "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "all 0.2s ease", color: "var(--text)", minWidth: "65px" }}>
                  <span style={{ fontSize: "20px" }}>{icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 500 }}>{label}</span>
                </button>
              ))}
              <div role="separator" style={{ width: 1, alignSelf: "stretch", minHeight: 44, background: "var(--border)", margin: "0 6px" }} />
              <button type="button" onClick={() => setShowMobilePreview(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "6px 10px", background: isMobileViewport ? "var(--accent)" : "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "all 0.2s ease", color: "var(--text)", minWidth: isMobileViewport ? "72px" : "52px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "11px", fontWeight: 600 }}>{isMobileViewport ? "Превью" : "Тел."}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {modalType && <BlockModal type={modalType} isOpen={modalOpen} onClose={() => { setModalOpen(false); setModalType(null); }} onSubmit={handleBlockSubmit} />}
      {inlineInput && <InlineInputCard buttonRect={inlineInput.buttonRect} onSubmit={handleInlineSubmit} onCancel={() => setInlineInput(null)} placeholder={inlineInput.type === 'link' ? 'https://example.com' : inlineInput.type === 'video' ? 'https://youtu.be/...' : 'https://music.yandex.ru/...'} buttonText="Добавить" type={inlineInput.type === 'link' ? 'url' : 'text'} validate={(val) => inlineInput.type === 'link' ? (() => { try { new URL(val); return true; } catch { return false; } })() : val.trim().length > 0} />}
      {profile && layout && <MobileVisitPreviewModal open={showMobilePreview} onClose={() => setShowMobilePreview(false)} profile={profile} blocks={blocks} layout={layout} blockSizes={blockSizes} />}
      {toast && <div className="card" style={{ position: "fixed", right: 24, top: 24, padding: "14px 18px", zIndex: 10000, boxShadow: "var(--shadow-xl)", animation: "slideIn 0.3s ease" }}>{toast}</div>}
      {showQr && profile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11000 }} onClick={() => setShowQr(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 360, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>QR-код визитки</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Отсканируйте код камерой телефона</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><img src={qrUrlForPublic(profile.username)} alt="QR" style={{ width: 220, height: 220 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <button className="btn" style={{ width: "100%" }} onClick={async () => { await navigator.clipboard.writeText(publicUrl(profile.username)); setToast("Ссылка скопирована"); setTimeout(() => setToast(null), 2500); }}>📋 Скопировать ссылку</button>
              <a href={qrUrlForPublic(profile.username)} download={`vizitka-${profile.username}-qr.png`} className="btn" style={{ width: "100%", textAlign: "center" }}>⬇️ Скачать QR</a>
            </div>
            <button className="btn" style={{ width: "100%" }} onClick={() => setShowQr(false)}>Закрыть</button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}