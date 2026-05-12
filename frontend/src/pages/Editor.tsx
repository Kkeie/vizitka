import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
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
  checkUsername,
  getTodayViews,
} from "../api";
import Avatar from "../components/Avatar";
import MenuCard from "../components/MenuCard";
import InlineEditCard from "../components/InlineEditCard";
import PasswordChangeCard from "../components/PasswordChangeCard";
import { DraggableBlockCard } from "../components/DraggableBlockCard";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import InlineInputCard from "../components/InlineInputCard";
import OnboardingInEditor from "../components/onboarding/OnboardingInEditor";

import { measureBlockRects, animateFlip } from "../utils/flipAnimation";
import { useBreakpoint, Breakpoint } from "../hooks/useBreakpoint";
import { useBentoGridMetrics } from "../hooks/useBentoGridMetrics";
import { getSocialInfo } from "../lib/social-preview";
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
} from "../lib/block-grid";
import {
  validateLinkInput,
  validateMusicInput,
  validateSocialInput,
  validateVideoInput,
} from "../lib/blockValidation";
import { PUBLIC_BASE_URL_WITH_SLASH } from "../lib/publicBaseUrl";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
} from "../lib/authFieldLimits";

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
} from "@dnd-kit/core";

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
  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debounced;
}

export default function Editor({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileRef = useRef<HTMLDivElement>(null);
  const viewportBreakpoint = useBreakpoint();

  // Основные данные
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
     email: "",
   });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "phone">("desktop");
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

  // Состояния для меню и inline-редактирования профиля
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<DOMRect | null>(null);
   const [activeInlineField, setActiveInlineField] = useState<"username" | "email" | null>(null);
  const [inlineAnchor, setInlineAnchor] = useState<DOMRect | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempBio, setTempBio] = useState("");

  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [passwordAnchor, setPasswordAnchor] = useState<DOMRect | null>(null);

  const [todayViews, setTodayViews] = useState<number | null>(null);
  const [viewsLoading, setViewsLoading] = useState(false);

  // Для быстрого добавления блоков
  const [inlineInput, setInlineInput] = useState<{
    type: 'link' | 'video' | 'music';
    buttonRect: DOMRect;
  } | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const overflowToggleRef = useRef<HTMLButtonElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1400));
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const breakpoint: Breakpoint = previewMode === "phone" ? "mobile" : viewportBreakpoint;

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
    }),
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
    const token = getToken();
    if (!token) {
      setToken(null);
      setIsAuthorized(false);
      setLoading(false);
      return;
    }
    loadData().then(() => {
      refreshViews();
    });
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [b, p] = await Promise.all([listBlocks(), getProfile()]);
      const sorted = [...b].sort((a, b) => a.sort - b.sort);
      const normalizedBlockSizes = sanitizeBlockSizes(p.blockSizes, sorted.map((block) => block.id));
      setBlocks(sorted);
      setBlockSizes(normalizedBlockSizes);
      setProfile(p);

      setTempName(p.name ?? "");
      setTempBio(p.bio ?? "");

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
         email: (p as any).email || "",
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
    () =>
      debounce(async (newLayout: Layout) => {
        try {
          await updateProfile({ layout: newLayout });
        } catch (e) {
          console.error(e);
        }
      }, 500),
    [],
  );
  const saveBlockSizesDebounced = useMemo(
    () =>
      debounce(async (newBlockSizes: BlockSizes) => {
        try {
          await updateProfile({ blockSizes: newBlockSizes });
        } catch (e) {
          console.error(e);
        }
      }, 500),
    [],
  );

  const currentOrderRef = useRef(currentOrder);
  const blocksRef = useRef(blocks);
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bioTextareaRef.current) {
      bioTextareaRef.current.style.height = "auto";
      bioTextareaRef.current.style.height = bioTextareaRef.current.scrollHeight + "px";
    }
  }, [tempBio])

  useEffect(() => {
    if (profile) {
      setTempName(profile.name ?? "");
      setTempBio(profile.bio ?? "");
    }
  }, [profile]);

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const handleResize = () => setToolbarWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        overflowToggleRef.current?.contains(target) ||
        bottomBarRef.current?.contains(target) ||
        overflowMenuRef.current?.contains(target)
      ) {
        return;
      }
      setShowOverflowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleCloseCards = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-inline-edit]') ||
        target.closest('[data-menu-item]') ||
        target.closest('[data-menu-button]')
      ) return;
      setActiveInlineField(null);
      setInlineAnchor(null);
      setShowPasswordCard(false);
      setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleCloseCards);
    return () => document.removeEventListener("mousedown", handleCloseCards);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInlineField(null);
        setShowPasswordCard(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    getTodayViews()
      .then(setTodayViews)
      .catch(err => console.error("Failed to load today views:", err));
  }, []);

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

  const refreshViews = useCallback(async () => {
    setViewsLoading(true);
    try {
      const views = await getTodayViews();
      setTodayViews(views);
    } catch (err) {
      console.error(err);
    } finally {
      setViewsLoading(false);
    }
  }, []);

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
         email: profileForm.email || null,
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
          const socialResult = validateSocialInput(data.socialType, data.socialUrl || "");
          if (!socialResult.ok || !socialResult.value) {
            setToast(socialResult.message || "Проверьте формат ссылки на соцсеть");
            return;
          }
          const newBlock = await createBlock({
            type: "social",
            socialType: data.socialType,
            socialUrl: socialResult.value,
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
          const linkResult = validateLinkInput(data.linkUrl || "");
          if (!linkResult.ok || !linkResult.value) {
            setToast(linkResult.message || "Проверьте ссылку");
            return;
          }
          const newBlock = await createBlock({
            type: "link",
            linkUrl: linkResult.value,
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
        const linkResult = validateLinkInput(value);
        if (!linkResult.ok || !linkResult.value) {
          setToast(linkResult.message || "Проверьте формат ссылки");
          return;
        }
        const normalizedLink = linkResult.value;
        const socialInfo = getSocialInfo(normalizedLink);
        if (socialInfo.platform !== 'other') {
          const socialResult = validateSocialInput(socialInfo.platform, normalizedLink);
          if (!socialResult.ok || !socialResult.value) {
            setToast(socialResult.message || "Неверная ссылка соцсети");
            return;
          }
          const newBlock = await createBlock({ type: 'social', socialType: socialInfo.platform, socialUrl: socialResult.value } as any);
          appendCreatedBlocks([newBlock]);
        } else {
          const newBlock = await createBlock({ type: 'link', linkUrl: normalizedLink } as any);
          appendCreatedBlocks([newBlock]);
        }
      } else if (type === 'video') {
        const videoResult = validateVideoInput(value);
        if (!videoResult.ok || !videoResult.value) {
          setToast(videoResult.message || "Неверная ссылка на видео");
          return;
        }
        const newBlock = await createBlock({ type: 'video', videoUrl: videoResult.value } as any);
        appendCreatedBlocks([newBlock]);
      } else if (type === 'music') {
        const musicResult = validateMusicInput(value);
        if (!musicResult.ok || !musicResult.value) {
          setToast(musicResult.message || "Неверный формат музыки");
          return;
        }
        const newBlock = await createBlock({ type: 'music', musicEmbed: musicResult.value } as any);
        appendCreatedBlocks([newBlock]);
      }
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
    setInlineInput(null);
  };

  const handleAddBlockClick = useCallback((type: BlockType, sourceButton?: HTMLElement) => {
    if (type === 'section') {
      createEmptyBlock('section', { note: '' });
    } else if (type === 'note') {
      createEmptyBlock('note', { note: '' });
    } else if (type === 'link' || type === 'video' || type === 'music') {
      const btn = sourceButton ?? (document.querySelector(`[data-add-type="${type}"]`) as HTMLElement | null);
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

  // ---------- Обработчики для inline-редактирования профиля ----------
  const handleSaveName = async () => {
    if (!profile) return;
    const newName = tempName.trim() || null;
    if (newName === profile.name) {
      setEditingName(false);
      return;
    }
    try {
      const updated = await updateProfile({ name: newName });
      setProfile(updated);
    } catch (err) {
      alert("Не удалось сохранить имя");
    } finally {
      setEditingName(false);
    }
  };

  const handleSaveBio = async () => {
    if (!profile) return;
    const newBio = tempBio.trim() || null;
    if (newBio === profile.bio) {
      setEditingBio(false);
      return;
    }
    try {
      const updated = await updateProfile({ bio: newBio });
      setProfile(updated);
    } catch (err) {
      alert("Не удалось сохранить описание");
    } finally {
      setEditingBio(false);
    }
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!profile) return;
    const normalized = newUsername.toLowerCase();
    if (normalized.length < USERNAME_MIN_LENGTH) throw new Error(`Минимум ${USERNAME_MIN_LENGTH} символа`);
    if (normalized.length > USERNAME_MAX_LENGTH) throw new Error(`Максимум ${USERNAME_MAX_LENGTH} символов`);
    if (!/^[a-z0-9_]+$/.test(normalized)) throw new Error("Только латиница, цифры и _");
    const check = await checkUsername(normalized);
    if (!check.available) throw new Error("Username уже занят");
    const updated = await updateProfile({ username: normalized });
    setProfile(updated);
  };

  const handleUpdateEmail = async (newEmail: string) => {
    if (!profile) return;
    const trimmed = newEmail.trim();
    if (trimmed.length > EMAIL_MAX_LENGTH) throw new Error(`Email не длиннее ${EMAIL_MAX_LENGTH} символов`);
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) throw new Error("Некорректный email");
    const updated = await updateProfile({ email: trimmed });
    setProfile(updated);
  };



  const handlePasswordChangeSuccess = useCallback((newToken: string) => {
    setToken(newToken);
    // Необязательно: перезагрузить пользователя
    loadData();
    setToast("Пароль успешно изменён");
  }, []);

  const MenuItem = ({ onClick, children }: { onClick: (rect: DOMRect) => void; children: React.ReactNode }) => (
    <button
      data-menu-item
      onMouseDown={(e) => e.stopPropagation()}  // ← не даём событию всплыть
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onClick(rect);
      }}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 16px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
  // ---------------------------------------------------------------

  if (isAuthorized === false) return <Navigate to="/login" replace />;
  if (loading) return <div className="page-bg min-h-screen flex items-center justify-center">Загрузка…</div>;
  if (error) return <div className="page-bg min-h-screen flex items-center justify-center"><div className="ribbon error">{error}</div></div>;
  if (!profile || !layout) return null;

  const totalBlocks = blocks.length;
  const showOnboardingPanel = onboardingMode && !onboardingComplete;
  const compactProfileText = previewMode === "phone" || viewportBreakpoint === "mobile";
  const useFramedPhonePreview = previewMode === "phone" && viewportBreakpoint !== "mobile";
  const addActions: Array<{ type: BlockType; label: string; icon: string }> = [
    { type: "section", label: "Заголовок", icon: "📑" },
    { type: "note", label: "Заметка", icon: "📝" },
    { type: "link", label: "Ссылка", icon: "🔗" },
    { type: "social", label: "Соцсеть", icon: "💬" },
    { type: "photo", label: "Фото", icon: "🖼️" },
    { type: "video", label: "Видео", icon: "🎥" },
    { type: "music", label: "Музыка", icon: "🎵" },
    { type: "map", label: "Карта", icon: "🗺️" },
  ];
  const visibleActionCount = toolbarWidth < 560 ? 2 : toolbarWidth < 760 ? 3 : toolbarWidth < 980 ? 5 : toolbarWidth < 1240 ? 6 : addActions.length;
  const primaryActions = addActions.slice(0, visibleActionCount);
  const overflowActions = addActions.slice(visibleActionCount);

  const compactToolbarMode = true;

  return (
    <div
      className={`page-bg min-h-screen editor-page ${useFramedPhonePreview ? "editor-page--phone-preview" : ""}`}
      style={useFramedPhonePreview ? { height: "100dvh", overflow: "hidden" } : undefined}
    >
      <div
        className={`container ${useFramedPhonePreview ? "editor-phone-preview-shell" : ""}`}
        style={
          useFramedPhonePreview
            ? {
                paddingTop: 24,
                paddingBottom: 24,
                height: "min(820px, calc(100dvh - 132px))",
              }
            : { paddingTop: 40, paddingBottom: 100 }
        }
      >
        <div
          className="two-column-layout"
          style={{
            alignItems: "start",
            ...(previewMode === "phone" ? { gridTemplateColumns: "1fr", gap: "16px" } : {}),
            ...(useFramedPhonePreview
              ? {
                  height: "100%",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  paddingRight: 4,
                }
              : {}),
          }}
        >
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
            <div ref={profileRef} className="profile-column" style={{ maxWidth: "100%", position: "relative", minHeight: "100%" }}>
              <div className="reveal reveal-in">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "flex-start" }}>
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
                    onRemove={async () => {
                      if (confirm("Удалить фото?")) {
                        try {
                          const updated = await updateProfile({ avatarUrl: null } as any);
                          setProfile(updated);
                        } catch { alert("Не удалось удалить фото"); }
                      }
                    }}
                  />

                  {/* Имя – всегда инпут, без рамки */}
                  <div style={{ width: "100%" }}>
                    <input
                      type="text"
                      value={tempName ?? profile.name ?? ""}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleSaveName(); }}
                      placeholder="Ваше имя"
                      className="no-focus-shadow"
                      style={{
                        fontSize: compactProfileText ? 24 : 32,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        width: "100%",
                        padding: "0",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    />
                  </div>

                  {/* Био – Enter = перенос строки, сохранение при потере фокуса */}
                  <textarea
                    ref={bioTextareaRef}
                    value={tempBio ?? profile.bio ?? ""}
                    onChange={(e) => setTempBio(e.target.value)}
                    onBlur={handleSaveBio}
                    placeholder="Расскажите о себе..."
                    rows={1}
                    spellCheck={false}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      width: "100%",
                      padding: "0",
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      resize: "none",
                      overflow: "hidden",
                      color: "var(--muted)",  // Серый цвет
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                  />
                </div>
              </div>
            </div>
            )}
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }} />
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
          <div
            ref={bottomBarRef}
            style={{
              position: "fixed",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: compactToolbarMode ? "8px 10px" : "10px 12px",
              zIndex: 1000,
              boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
              maxWidth: "calc(100% - 24px)",
              width: "fit-content",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: compactToolbarMode ? "6px" : "4px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl(profile.username));
                  setToast("Ссылка скопирована");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 32,
                  padding: "0 14px",
                  background: "#7EDC8A",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                Поделиться Визиткой
              </button>
              <div role="separator" style={{ width: 1, alignSelf: "stretch", minHeight: 26, background: "var(--border)", margin: "0 2px" }} />
              <button
                data-add-type="qr"
                onClick={() => setShowQr(true)}
                title="QR"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, background: "var(--accent)", border: "none", cursor: "pointer", borderRadius: 7, color: "var(--text)", fontSize: 14 }}
              >
                📱
              </button>
              {primaryActions.map(({ type, label, icon }) => (
                <button
                  key={type}
                  data-add-type={type}
                  onClick={(e) => handleAddBlockClick(type, e.currentTarget)}
                  title={label}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, background: "var(--accent)", border: "none", cursor: "pointer", borderRadius: 7, color: "var(--text)", fontSize: 14 }}
                >
                  {icon}
                </button>
              ))}
              {overflowActions.length > 0 && (
                <div style={{ position: "relative" }}>
                  <button
                    ref={overflowToggleRef}
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setShowOverflowMenu((prev) => !prev)}
                    title="Еще"
                    data-testid="editor-overflow-toggle"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, background: showOverflowMenu ? "var(--ring)" : "var(--accent)", border: "none", cursor: "pointer", borderRadius: 7, color: "var(--text)", fontSize: 16 }}
                  >
                    <span style={{ lineHeight: 1 }}>⋯</span>
                  </button>
                  {showOverflowMenu && (
                    <div
                      ref={overflowMenuRef}
                      className="card"
                      data-testid="editor-overflow-menu"
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ position: "absolute", bottom: "calc(100% + 10px)", right: 0, minWidth: 170, padding: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 1200, pointerEvents: "auto" }}
                    >
                      {overflowActions.map(({ type, label, icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            handleAddBlockClick(type, overflowToggleRef.current ?? undefined);
                            setShowOverflowMenu(false);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "none", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left" }}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div role="separator" style={{ width: 1, alignSelf: "stretch", minHeight: 26, background: "var(--border)", margin: "0 2px" }} />
              <button
                type="button"
                onClick={() => setPreviewMode((prev) => (prev === "desktop" ? "phone" : "desktop"))}
                title={previewMode === "phone" ? "Переключить на ПК" : "Переключить на телефон"}
                aria-label={previewMode === "phone" ? "Переключить на ПК" : "Переключить на телефон"}
                data-testid="editor-preview-phone-toggle"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 32,
                  padding: 0,
                  background: previewMode === "phone" ? "#111" : "var(--accent)",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                  color: previewMode === "phone" ? "#fff" : "var(--text)",
                  transition: "all 0.2s ease",
                }}
              >
                {previewMode === "phone" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="12.5" rx="1.8" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {modalType && <BlockModal type={modalType} isOpen={modalOpen} onClose={() => { setModalOpen(false); setModalType(null); }} onSubmit={handleBlockSubmit} />}
      {inlineInput && <InlineInputCard buttonRect={inlineInput.buttonRect} onSubmit={handleInlineSubmit} onCancel={() => setInlineInput(null)} placeholder={inlineInput.type === 'link' ? 'https://example.com' : inlineInput.type === 'video' ? 'https://youtu.be/...' : 'https://music.yandex.ru/...'} buttonText="Добавить" type={inlineInput.type === 'link' ? 'url' : 'text'} validate={(val) => {
        if (inlineInput.type === "link") {
          const result = validateLinkInput(val);
          return result.ok ? true : (result.message || "Неверная ссылка");
        }
        if (inlineInput.type === "video") {
          const result = validateVideoInput(val);
          return result.ok ? true : (result.message || "Неверная ссылка на видео");
        }
        if (inlineInput.type === "music") {
          const result = validateMusicInput(val);
          return result.ok ? true : (result.message || "Неверный формат музыки");
        }
        return true;
      }} />}
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

      {/* Фиксированная панель слева внизу: настройки + счётчик просмотров */}
      {!showOnboardingPanel && previewMode !== "phone" && viewportBreakpoint !== "mobile" && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 1000,
          }}
        >
          {/* Кнопка настроек (оставляем как есть) */}
          <button
            data-menu-button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (showProfileMenu) {
                setShowProfileMenu(false);
                setActiveInlineField(null);
                setInlineAnchor(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setProfileMenuAnchor(rect);
                setShowProfileMenu(true);
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="28" height="28" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="15" width="30" height="3.5" rx="1.75" fill="black" />
              <circle cx="17.5" cy="16.75" r="5.5" fill="black" />
              <circle cx="17.5" cy="16.75" r="2.5" fill="white" />
              <rect x="10" y="26.5" width="30" height="3.5" rx="1.75" fill="black" />
              <circle cx="31.6" cy="28.25" r="5.5" fill="black" />
              <circle cx="31.6" cy="28.25" r="2.5" fill="white" />
            </svg>
          </button>

          {/* Вертикальный разделитель */}
          <div style={{ width: 1, height: 24, background: "#ccc" }} />
          
          {todayViews !== null && (
            <div
              style={{
                background: "#f0f0f0",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onClick={refreshViews}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e6e6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f0f0f0")}
              title="Просмотры за день"
            >
              <span>👁</span>
              <span>{todayViews}</span>
            </div>
          )}
        </div>
      )}

      {/* Главное меню редактирования — появляется над кнопкой */}
      {showProfileMenu && profileMenuAnchor && (
        <MenuCard
          anchorRect={profileMenuAnchor}
          onClose={() => {
            setShowProfileMenu(false);
            setActiveInlineField(null);
            setInlineAnchor(null);
          }}
          position="top"
          width={260}
        >
          <div style={{ display: "flex", flexDirection: "column"}}>
            <MenuItem onClick={(rect) => {
              setInlineAnchor(rect);
              setActiveInlineField("username");
              setShowPasswordCard(false);
            }}>
              <div>Изменить имя пользователя</div>
              <div style={{ fontSize: 11, color: "var(--muted)"}}>{profile?.username || ""}</div>
            </MenuItem>

            <MenuItem onClick={(rect) => {
              setInlineAnchor(rect);
              setActiveInlineField("email");
              setShowPasswordCard(false);
            }}>
              <div>Изменить email</div>
              <div style={{ fontSize: 11, color: "var(--muted)"}}>{(profile as any)?.email || "не указан"}</div>
            </MenuItem>



            <MenuItem onClick={(rect) => {
              setPasswordAnchor(rect);
              setShowPasswordCard(true);
              setActiveInlineField(null);
              setInlineAnchor(null);
            }}>
              <div>Изменить пароль</div>
            </MenuItem>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <MenuItem onClick={() => alert("Функция в разработке")}>
              <div>Экспорт данных</div>
            </MenuItem>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <MenuItem onClick={() => { onLogout(); }}>
              <div>Выйти из аккаунта</div>
            </MenuItem>
          </div>
        </MenuCard>
      )}

      {/* Подменю для выбранного поля */}
      {activeInlineField && inlineAnchor && (
        <InlineEditCard
          key={activeInlineField}
          anchorRect={inlineAnchor}
           value={(() => {
             if (activeInlineField === "username") return profile?.username || "";
             if (activeInlineField === "email") return (profile as any)?.email || "";
             return "";
           })()}
           onSave={async (newValue) => {
             if (activeInlineField === "username") await handleUpdateUsername(newValue);
             if (activeInlineField === "email") await handleUpdateEmail(newValue);
             setActiveInlineField(null);
             setInlineAnchor(null);
           }}
          onCancel={() => {
            setActiveInlineField(null);
            setInlineAnchor(null);
          }}
           label={
             activeInlineField === "username"
               ? "Username"
               : activeInlineField === "email"
               ? "Email"
               : ""
           }
           placeholder={
             activeInlineField === "username" ? "Введите имя пользователя" :
             activeInlineField === "email"    ? "email@example.com" :
             ""
           }
           inputType={activeInlineField === "email" ? "email" : "text"}
           validation={(val) => {
             if (activeInlineField === "username") {
               return (
                 val.length >= USERNAME_MIN_LENGTH &&
                 val.length <= USERNAME_MAX_LENGTH &&
                 /^[a-z0-9_]+$/.test(val)
               );
             }
             if (activeInlineField === "email") {
               return /^\S+@\S+\.\S+$/.test(val) && val.length <= EMAIL_MAX_LENGTH;
             }
             return true;
           }}
           format={(val) => {
             if (activeInlineField === "username") return val.toLowerCase();
             return val;
           }}
          prefix={activeInlineField === "username" ? PUBLIC_BASE_URL_WITH_SLASH : undefined}
          maxLength={
            activeInlineField === "username"
              ? USERNAME_MAX_LENGTH
              : activeInlineField === "email"
                ? EMAIL_MAX_LENGTH
                : undefined
          }
        />
      )}

      {/* Карточка смены пароля */}
      {showPasswordCard && passwordAnchor && (
        <PasswordChangeCard
          anchorRect={passwordAnchor}
          onClose={() => {
            setShowPasswordCard(false);
            setPasswordAnchor(null);
          }}
          onSuccess={handlePasswordChangeSuccess}
        />
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