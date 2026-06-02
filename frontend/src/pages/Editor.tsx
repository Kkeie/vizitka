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
  GRID_COLUMNS,
  assignSparseAnchorsForBreakpoint,
  clientPointToGridAnchor,
  flattenLayoutIds,
  getDynamicRowUnit,
  getGridRowSpan,
  getPersistedGridSpans,
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

import { motion, AnimatePresence } from "framer-motion";
import "../styles/drag-reorder.css";

const DRAG_BOTTOM_EDGE_PX = 110;
const DRAG_BOTTOM_EXPAND_STEP = 14;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "phone">(
    () => typeof window !== "undefined" && window.innerWidth < 600 ? "phone" : "desktop"
  );
  const viewportOriginalRef = useRef<string | null>(null);
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    if (viewportOriginalRef.current === null) {
      viewportOriginalRef.current = meta.getAttribute('content');
    }
    if (previewMode === "desktop" && window.innerWidth < 600) {
      meta.setAttribute('content', 'width=1280');
    } else {
      meta.setAttribute('content', viewportOriginalRef.current || 'width=device-width, initial-scale=1.0');
    }
    return () => {
      meta.setAttribute('content', viewportOriginalRef.current || 'width=device-width, initial-scale=1.0');
    };
  }, [previewMode]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  const [dragCellSize, setDragCellSize] = useState<number | null>(null);
  /** Виртуальная раскладка во время drag — показывает «как будет выглядеть после drop». */
  const [virtualBlockSizes, setVirtualBlockSizes] = useState<BlockSizes | null>(null);
  /** Последний спроецированный якорь — для дедупа: пересчитываем только при пересечении границы клетки. */
  const lastProjectedAnchorRef = useRef<BlockGridAnchor | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const revealTimeoutsRef = useRef<number[]>([]);

  // ONBOARDING: состояние для режима онбординга
  const onboardingMode = searchParams.get("onboarding") === "true";
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Реф для хранения исходного состояния якорей на момент начала drag
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
  const [menuClosing, setMenuClosing] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<DOMRect | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const exitToRef = useRef<DOMRect | null>(null);
  const showProfileMenuRef = useRef(showProfileMenu);
  const [inlineEditClosing, setInlineEditClosing] = useState(false);
  const [activeInlineField, setActiveInlineField] = useState<"username" | "email" | null>(null);
  const [inlineAnchor, setInlineAnchor] = useState<DOMRect | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempBio, setTempBio] = useState("");

  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [passwordCardClosing, setPasswordCardClosing] = useState(false);
  const [passwordAnchor, setPasswordAnchor] = useState<DOMRect | null>(null);

  const [todayViews, setTodayViews] = useState<number | null>(null);

  // Для быстрого добавления блоков
  const [inlineInput, setInlineInput] = useState<{
    type: 'link' | 'video' | 'music';
    buttonRect: DOMRect;
    positionRect?: DOMRect;
    exitButtonRect?: DOMRect;
  } | null>(null);
  const [inlineClosing, setInlineClosing] = useState(false);
  const pendingInlineActionRef = useRef<(() => void) | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const overflowToggleRef = useRef<HTMLButtonElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1400));
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [overflowClosing, setOverflowClosing] = useState(false);
  const overflowTimeoutRef = useRef<number | null>(null);

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
  // Cap cell width so that, when sidebar is hidden and right column suddenly widens,
  // cards don't balloon to absurd sizes. See block-grid.ts DEFAULT_BENTO_CELL_SIZE=180.
  const maxCellSize = breakpoint === "mobile" ? undefined : 280;
  const { gridRef, gridEl, cellSize } = useBentoGridMetrics(currentGridColumns, currentGridGap, {
    maxCellSize,
  });
  const rowUnit = getDynamicRowUnit(cellSize, currentGridGap);

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
  useEffect(() => {
    showProfileMenuRef.current = showProfileMenu;
  }, [showProfileMenu]);

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
          rowUnit,
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
          rowUnit,
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
        overflowMenuRef.current?.contains(target)
      ) {
        return;
      }
      setOverflowClosing(true);
      overflowTimeoutRef.current = window.setTimeout(() => {
        setShowOverflowMenu(false);
        setOverflowClosing(false);
        overflowTimeoutRef.current = null;
      }, 150);
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
      exitToRef.current = settingsBtnRef.current?.getBoundingClientRect() ?? null;
      if (activeInlineField) setInlineEditClosing(true);
      if (showPasswordCard) setPasswordCardClosing(true);
      if (showProfileMenuRef.current) setMenuClosing(true);
    };
    document.addEventListener("mousedown", handleCloseCards);
    return () => document.removeEventListener("mousedown", handleCloseCards);
  }, [activeInlineField, showPasswordCard]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitToRef.current = settingsBtnRef.current?.getBoundingClientRect() ?? null;
        if (activeInlineField) setInlineEditClosing(true);
        if (showPasswordCard) setPasswordCardClosing(true);
        if (showProfileMenuRef.current) setMenuClosing(true);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeInlineField, showPasswordCard]);

  useEffect(() => {
    getTodayViews()
      .then(setTodayViews)
      .catch(err => console.error("Failed to load today views:", err));

    const interval = setInterval(() => {
      getTodayViews()
        .then(setTodayViews)
        .catch(err => console.error("Failed to auto-refresh views:", err));
    }, 60000);

    return () => clearInterval(interval);
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

  const refreshViews = useCallback(async () => {
    try {
      const views = await getTodayViews();
      setTodayViews(views);
    } catch (err) {
      console.error(err);
    }
  }, []);

  /**
   * Спроецировать раскладку, как будто блок `draggedId` уже отпущен в (cursorX, cursorY).
   * Возвращает якорь drop-цели и полный пересчитанный BlockSizes (для рендера превью).
   */
  const projectLayoutFromCursor = useCallback(
    (draggedId: number, cursorX: number, cursorY: number) => {
            if (!gridEl) return null;
      const block = blocks.find((b) => b.id === draggedId);
      if (!block) return null;
      const r = gridEl.getBoundingClientRect();
      const extra = Math.max(0, canvasPadDesiredRef.current - editorCanvasPadBottom);
      const bottom = r.bottom + extra;
      if (cursorX < r.left || cursorX > r.right || cursorY < r.top || cursorY > bottom) {
        return null;
      }
      const baseSizes = originalBlockSizesRef.current;
      const gs = getResolvedGridSize(block, baseSizes[draggedId], currentGridColumns);
      const anchor = clientPointToGridAnchor(
        cursorX, cursorY, gridEl, currentGridColumns, cellSize, currentGridGap, rowUnit, gs.colSpan,
      );
      const maxStartCol = currentGridColumns - gs.colSpan + 1;
      if (anchor.gridColumnStart > maxStartCol) anchor.gridColumnStart = Math.max(1, maxStartCol);

      const newSizes: BlockSizes = {
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
      const assigned = assignSparseAnchorsForBreakpoint(
        currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, rowUnit,
        { onlyMissing: true, priorityBlockId: draggedId },
      );
      const resolved = resolveAnchorOverlaps(
        assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap,
        rowUnit, draggedId,
      );
      return { anchor, resolved };
    },
    [blocks, currentOrder, breakpoint, currentGridColumns, currentGridGap, cellSize, editorCanvasPadBottom, gridRef],
  );

  // Обработчики перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    if (flipAnimationRef.current) {
      flipAnimationRef.current.cancel();
      flipAnimationRef.current = null;
    }
    setIsDragging(true);
    setDragCellSize(cellSize);
    const draggedId = event.active.id as number;
    setActiveId(draggedId);
    // Сохраняем исходное состояние якорей на момент начала drag
    originalBlockSizesRef.current = blockSizes;
    lastProjectedAnchorRef.current = null;
    const e = event.activatorEvent as PointerEvent;
    if (e?.clientX != null) {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
    const projection = projectLayoutFromCursor(
      draggedId,
      lastPointerRef.current.x,
      lastPointerRef.current.y,
    );
    if (projection) {
      lastProjectedAnchorRef.current = projection.anchor;
      setVirtualBlockSizes(projection.resolved);
    } else {
      setVirtualBlockSizes(null);
    }
  };

  const handleDragMove = (_event: DragMoveEvent) => {
    const { x, y } = lastPointerRef.current;

    // Расширение нижнего холста для drop в конце страницы
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

    if (activeId !== null) {
      const projection = projectLayoutFromCursor(activeId, x, y);
      const scheduleFlip = () => {
        const beforeRects = measureBlockRects(currentOrder);
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            const afterRects = measureBlockRects(currentOrder);
            if (flipAnimationRef.current) flipAnimationRef.current.cancel();
            flipAnimationRef.current = animateFlip(beforeRects, afterRects, 180, () => {
              flipAnimationRef.current = null;
            });
          }, 0);
        });
      };

      if (!projection) {
        // Курсор вышел из сетки — плавно возвращаем карточки на исходные места
        if (virtualBlockSizes) {
          scheduleFlip();
          lastProjectedAnchorRef.current = null;
          setVirtualBlockSizes(null);
        }
        return;
      }

      const last = lastProjectedAnchorRef.current;
      // Дедуп: пока курсор не пересёк границу клетки — раскладка не меняется, обновлять нечего.
      if (last &&
        last.gridColumnStart === projection.anchor.gridColumnStart &&
        last.gridRowStart === projection.anchor.gridRowStart) {
        return;
      }
      lastProjectedAnchorRef.current = projection.anchor;
      scheduleFlip();
      setVirtualBlockSizes(projection.resolved);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    setDragCellSize(null);
    const draggedId = event.active.id as number;
    setActiveId(null);

    const virtual = virtualBlockSizes;
        let committedSizes: BlockSizes | null = null;

    if (virtual && draggedId) {
      // Превью уже совпадает с финальной раскладкой — просто фиксируем её,
      // в одном батче с очисткой virtualBlockSizes (никакого визуального скачка).
      committedSizes = virtual;
    } else if (gridEl && draggedId) {
      // Курсор был вне сетки и превью пустое: пересчитаем по последней позиции
      const projection = projectLayoutFromCursor(
        draggedId,
        lastPointerRef.current.x,
        lastPointerRef.current.y,
      );
      if (projection) committedSizes = projection.resolved;
    }

    setVirtualBlockSizes(null);
    lastProjectedAnchorRef.current = null;

    if (committedSizes) {
      setBlockSizes(committedSizes);
      syncLayoutFromBlockSizes(committedSizes);
      await saveBlockSizesDebounced(committedSizes);
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

  async function handleDeleteBlock(id: number) {
    if (!confirm("Удалить эту карточку?")) return;
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
      alert("Не удалось удалить карточку");
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
        currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, rowUnit,
        { onlyMissing: true, priorityBlockId: id }
      );
      let resolved = resolveAnchorOverlaps(
        assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap,
        rowUnit, id,
      );
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
      currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, rowUnit,
      { onlyMissing: true, priorityBlockId: id }
    );
    let resolved = resolveAnchorOverlaps(
      assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap,
      rowUnit, id,
    );
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

      // Pre-assign anchors at the very bottom of the grid for each breakpoint,
      // so assignSparseAnchorsForBreakpoint (onlyMissing) won't fill them into
      // the first empty space above existing content.
      setBlockSizes((prevSizes) => {
        const existingBlocks = blocksRef.current;
        const nextSizes = { ...prevSizes };

        for (const bp of ['mobile', 'tablet', 'desktop'] as const) {
          const cols = GRID_COLUMNS[bp];

          // Find the lowest occupied micro-row across all existing blocks
          let bottomRow = 0;
          for (const block of existingBlocks) {
            const anchor = prevSizes[block.id]?.anchorsByBreakpoint?.[bp];
            if (!anchor) continue;
            const gs = getResolvedGridSize(block, prevSizes[block.id], cols);
            const h = getGridRowSpan(block, gs, cellSize, currentGridGap, rowUnit);
            const blockBottom = anchor.gridRowStart - 1 + h;
            if (blockBottom > bottomRow) bottomRow = blockBottom;
          }

          // Stack new blocks one after another below all existing content
          let row = bottomRow;
          for (const newBlock of createdBlocks) {
            const gs = getResolvedGridSize(newBlock, null, cols);
            const h = getGridRowSpan(newBlock, gs, cellSize, currentGridGap, rowUnit);
            const prevEntry = nextSizes[newBlock.id];
            const persisted = getPersistedGridSpans(newBlock, prevEntry);
            nextSizes[newBlock.id] = {
              ...(prevEntry ?? {}),
              colSpan: persisted.colSpan,
              rowSpan: persisted.rowSpan,
              anchorsByBreakpoint: {
                ...(prevEntry?.anchorsByBreakpoint ?? {}),
                [bp]: { gridColumnStart: 1, gridRowStart: row + 1 },
              },
            };
            row += h;
          }
        }

        saveBlockSizesDebounced(nextSizes);
        return nextSizes;
      });

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
    [revealCreatedBlock, saveLayoutDebounced, saveBlockSizesDebounced, cellSize, currentGridGap],
  );

  const createEmptyBlock = useCallback(async (type: BlockType, initialData: Partial<Block> = {}) => {
    console.log('createEmptyBlock called with type:', type);
      try {
        const newBlock = await createBlock({ type, ...initialData } as any);
        appendCreatedBlocks([newBlock], { focusType: type });
      } catch (e) {
        console.error(e);
        setToast("Не удалось создать карточку");
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
        setToast("Не удалось создать карточку. Проверьте ссылку.");
      }
  }, [blocks.length]);

  const handleAddWithInline = (type: 'link' | 'video' | 'music', buttonElement: HTMLElement) => {
    if (inlineClosing) return;

    const rect = buttonElement.getBoundingClientRect();
    let positionRect: DOMRect | undefined;
    let exitButtonRect: DOMRect | undefined;
    if (buttonElement.closest('[data-testid="editor-overflow-menu"]') && overflowToggleRef.current) {
      positionRect = overflowToggleRef.current.getBoundingClientRect();
      exitButtonRect = positionRect;
    }

    if (inlineInput?.type === type) {
      pendingInlineActionRef.current = () => setInlineInput(null);
      setInlineClosing(true);
      return;
    }
    if (inlineInput) {
      pendingInlineActionRef.current = () => setInlineInput({ type, buttonRect: rect, positionRect, exitButtonRect });
      setInlineClosing(true);
      return;
    }
    setInlineInput({ type, buttonRect: rect, positionRect, exitButtonRect });
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
      setToast("Не удалось создать карточку");
    }
    setInlineInput(null);
    setInlineClosing(false);
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
      if (inlineInput) {
        if (inlineClosing) return;
        pendingInlineActionRef.current = () => {
          setInlineInput(null);
          setModalType(type);
          setModalOpen(true);
        };
        setInlineClosing(true);
        return;
      }
      setModalType(type);
      setModalOpen(true);
    }
  }, [createEmptyBlock, handleAddWithInline, inlineInput, inlineClosing]);

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const newBlock = await createBlock(data as any);
      appendCreatedBlocks([newBlock]);
    } catch (e) {
      alert("Не удалось создать карточку");
      console.error(e);
    }
  }

  // ---------- Обработчики для inline-редактирования профиля ----------
  const handleSaveName = async () => {
    if (!profile) return;
    const newName = tempName.trim() || null;
    if (newName === profile.name) return;
    try {
      const updated = await updateProfile({ name: newName });
      setProfile(updated);
    } catch (err) {
      alert("Не удалось сохранить имя");
    }
  };

  const handleSaveBio = async () => {
    if (!profile) return;
    const newBio = tempBio.trim() || null;
    if (newBio === profile.bio) return;
    try {
      const updated = await updateProfile({ bio: newBio });
      setProfile(updated);
    } catch (err) {
      alert("Не удалось сохранить описание");
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
    if (updated.emailChangePending && updated.pendingEmail) {
      setToast(`Письмо отправлено на ${updated.pendingEmail}. Подтвердите email по ссылке из письма.`);
      window.setTimeout(() => setToast(null), 5000);
    }
  };



  const handlePasswordChangeSuccess = useCallback((newToken: string) => {
    setToken(newToken);
    // Необязательно: перезагрузить пользователя
    loadData();
    setToast("Пароль успешно изменён");
  }, []);

  const MenuItem = ({ onClick, children }: { onClick: (rect: DOMRect) => void; children: React.ReactNode }) => (
    <button
      data-menu-item="true"
      onMouseDown={(e) => e.stopPropagation()}
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

  const showOnboardingPanel = onboardingMode && !onboardingComplete;
  const compactProfileText = previewMode === "phone" || viewportBreakpoint === "mobile";
  const useFramedPhonePreview = previewMode === "phone" && viewportBreakpoint !== "mobile";
  const dockIconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 20,
    height: 20,
  };
  const addActions: Array<{ type: BlockType; label: string; icon: React.ReactNode }> = [
    {
      type: "section",
      label: "Заголовок",
      icon: (
        <svg {...dockIconProps}>
          <rect x="3" y="6" width="13" height="3.5" rx="0.8" />
          <path d="M3 14h18" />
          <path d="M3 18h13" />
        </svg>
      ),
    },
    {
      type: "note",
      label: "Заметка",
      icon: (
        <svg {...dockIconProps}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 14h6" />
          <path d="M9 17h4" />
        </svg>
      ),
    },
    {
      type: "link",
      label: "Ссылка",
      icon: (
        <svg {...dockIconProps}>
          <path d="M10.5 13.5a4 4 0 0 0 5.6 0l2.4-2.4a4 4 0 1 0-5.6-5.6L11.5 6.9" />
          <path d="M13.5 10.5a4 4 0 0 0-5.6 0l-2.4 2.4a4 4 0 1 0 5.6 5.6l1.4-1.4" />
        </svg>
      ),
    },
    {
      type: "social",
      label: "Соцсеть",
      icon: (
        <svg {...dockIconProps}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <path d="M16 4.2a3.2 3.2 0 0 1 0 6.2" />
          <path d="M17 13.2a5 5 0 0 1 4 5.8" />
        </svg>
      ),
    },
    {
      type: "photo",
      label: "Фото",
      icon: (
        <svg {...dockIconProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M21 15l-5-5L7 19" />
        </svg>
      ),
    },
    {
      type: "video",
      label: "Видео",
      icon: (
        <svg {...dockIconProps}>
          <rect x="2.5" y="6" width="13.5" height="12" rx="2" />
          <path d="M16 10l5.5-3v10L16 14z" />
        </svg>
      ),
    },
    {
      type: "music",
      label: "Музыка",
      icon: (
        <svg {...dockIconProps}>
          <path d="M9 17V5l10-2v12" />
          <circle cx="6" cy="17" r="3" />
          <circle cx="16" cy="15" r="3" />
        </svg>
      ),
    },
    {
      type: "map",
      label: "Карта",
      icon: (
        <svg {...dockIconProps}>
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      ),
    },
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
              {/* Панель: настройки + счётчик просмотров */}
              {!showOnboardingPanel && (
                <div
                  className="settings-entrance"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    zIndex: 30,
                    ...(window.innerWidth >= 700
                      ? { position: "fixed", bottom: "24px", left: "24px" }
                      : { position: "absolute", top: "0", right: "0" }
                    ),
                  }}
                >
                  <button
                    ref={settingsBtnRef}
                    data-menu-button="true"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      exitToRef.current = settingsBtnRef.current?.getBoundingClientRect() ?? null;
                      if (showPasswordCard) setPasswordCardClosing(true);
                      if (activeInlineField) setInlineEditClosing(true);
                      if (showProfileMenu) {
                        setMenuClosing(true);
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "flex-start" }}>
                  <div className="entrance-avatar entrance-delay-0">
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
                  </div>

                  {/* Имя – всегда инпут, без рамки */}
                  <div className="entrance-text entrance-delay-1">
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
                  </div>

                  {/* Био – Enter = перенос строки, сохранение при потере фокуса */}
                  <div className="entrance-bio entrance-delay-2">
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
                setVirtualBlockSizes(null);
                lastProjectedAnchorRef.current = null;
                setActiveId(null);
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
                onPointerDownCapture={() => {
                  if (flipAnimationRef.current) {
                    flipAnimationRef.current.cancel();
                    flipAnimationRef.current = null;
                  }
                }}
                style={{
                    display: 'grid',
                  // Use measured (already cap-applied) cellSize as the explicit column width.
                  // With 1fr columns and a hidden sidebar, cards balloon past their natural
                  // size; explicit width + justify-content: center keeps them sane.
                  gridTemplateColumns: cellSize
                    ? `repeat(${currentGridColumns}, ${cellSize}px)`
                    : `repeat(${currentGridColumns}, minmax(0, 1fr))`,
                  justifyContent: 'center',
                  gap: `${currentGridGap}px`,
                  gridAutoRows: `${rowUnit}px`,
                    gridAutoFlow: 'row',
                  paddingBottom: editorCanvasPadBottom,
                    boxSizing: 'border-box',
                }}
              >
                  {(() => {
                    const renderSizes = virtualBlockSizes ?? blockSizes;
                    return currentOrder.map(blockId => {
                      const block = blocks.find(b => b.id === blockId);
                      if (!block) return null;
                      const gridSize = getResolvedGridSize(block, renderSizes[blockId], currentGridColumns);
                      const anchor = renderSizes[blockId]?.anchorsByBreakpoint?.[breakpoint];
                      return (
                        <DraggableBlockCard
                          key={block.id}
                          block={block}
                          gridColumns={currentGridColumns}
                          cellSize={isDragging && dragCellSize !== null ? dragCellSize : cellSize}
                          gridGap={currentGridGap}
                          rowUnit={rowUnit}
                          gridSize={gridSize}
                          gridAnchor={anchor}
                          onGridSizeChange={(dimensions) => handleBlockDimensionsChange(block.id, dimensions)}
                          onResizeEnd={handleResizeEnd}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onUpdate={(partial) => handleUpdateBlock(block.id, partial)}
                        />
                      );
                    });
                  })()}
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
            className="toolbar-entrance"
            style={{
              position: "fixed",
              bottom: 20,
              left: "50%",
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
                onClick={() => setShowQr(true)}
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
              {primaryActions.map(({ type, label, icon }) => (
                <button
                  key={type}
                  data-add-type={type}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddBlockClick(type, e.currentTarget);
                              setOverflowClosing(true);
                              overflowTimeoutRef.current = window.setTimeout(() => {
                                setShowOverflowMenu(false);
                                setOverflowClosing(false);
                                overflowTimeoutRef.current = null;
                              }, 150);
                            }}
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
                    onClick={() => {
                      if (overflowClosing) {
                        if (overflowTimeoutRef.current) {
                          clearTimeout(overflowTimeoutRef.current);
                          overflowTimeoutRef.current = null;
                        }
                        setOverflowClosing(false);
                        setShowOverflowMenu(true);
                      } else if (showOverflowMenu) {
                        setOverflowClosing(true);
                        overflowTimeoutRef.current = window.setTimeout(() => {
                          setShowOverflowMenu(false);
                          setOverflowClosing(false);
                          overflowTimeoutRef.current = null;
                        }, 150);
                      } else {
                        setShowOverflowMenu(true);
                      }
                    }}
                    title="Еще"
                    data-testid="editor-overflow-toggle"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, background: showOverflowMenu ? "var(--ring)" : "var(--accent)", border: "none", cursor: "pointer", borderRadius: 7, color: "var(--text)", fontSize: 16 }}
                  >
                    <span style={{ lineHeight: 1 }}>⋯</span>
                  </button>
                  {(showOverflowMenu || overflowClosing) && (
                    <motion.div
                      key="overflow-menu"
                      ref={overflowMenuRef}
                      data-testid="editor-overflow-menu"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={
                        overflowClosing
                          ? { scale: 0, opacity: 0 }
                          : { scale: 1, opacity: 1 }
                      }
                      transition={{ duration: 0.15, ease: overflowClosing ? "easeIn" : "easeOut" }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ position: "absolute", bottom: "calc(100% + 10px)", right: 0, minWidth: 170, padding: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 1200, pointerEvents: "auto", transformOrigin: "bottom right", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow)" }}
                    >
                      {overflowActions.map(({ type, label, icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddBlockClick(type, e.currentTarget);
                            setOverflowClosing(true);
                            overflowTimeoutRef.current = window.setTimeout(() => {
                              setShowOverflowMenu(false);
                              setOverflowClosing(false);
                              overflowTimeoutRef.current = null;
                            }, 150);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "none", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left" }}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
              <div role="separator" style={{ width: 1, alignSelf: "stretch", minHeight: 26, background: "var(--border)", margin: "0 2px" }} />
              <div
                className="editor-preview-toggle"
                data-mode={previewMode}
                role="group"
                aria-label="Режим превью"
              >
                <div className="editor-preview-toggle__thumb" aria-hidden="true" />
                <button
                  type="button"
                  className="editor-preview-toggle__btn"
                  onClick={() => setPreviewMode("desktop")}
                  title="ПК"
                  aria-label="Переключить на ПК"
                  aria-pressed={previewMode === "desktop"}
                  data-testid="editor-preview-desktop-toggle"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="12.5" rx="1.8" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
                <button
                  type="button"
                  className="editor-preview-toggle__btn"
                  onClick={() => setPreviewMode("phone")}
                  title="Телефон"
                  aria-label="Переключить на телефон"
                  aria-pressed={previewMode === "phone"}
                  data-testid="editor-preview-phone-toggle"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BlockModal type={modalType ?? "note"} isOpen={modalOpen} onClose={() => { setModalOpen(false); setModalType(null); }} onSubmit={handleBlockSubmit} />
      {inlineInput && <InlineInputCard key={inlineInput.type} closing={inlineClosing} buttonRect={inlineInput.buttonRect} positionRect={inlineInput.positionRect} exitButtonRect={inlineInput.exitButtonRect} onSubmit={handleInlineSubmit} onCancel={() => { const action = pendingInlineActionRef.current; pendingInlineActionRef.current = null; setInlineClosing(false); setInlineInput(null); action?.(); }} placeholder={inlineInput.type === 'link' ? 'https://example.com' : inlineInput.type === 'video' ? 'https://youtu.be/...' : 'https://music.yandex.ru/...'} buttonText="Добавить" type={inlineInput.type === 'link' ? 'url' : 'text'} validate={(val) => {
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
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            className="modal-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", right: 24, top: 24, padding: "14px 18px", zIndex: 10000, boxShadow: "var(--shadow-xl)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showQr && profile && (
        <motion.div
          key="qr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11000 }}
          onClick={() => setShowQr(false)}
        >
          <motion.div
            className="modal-card"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: 24, maxWidth: 360, width: "90%", textAlign: "center" }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>QR-код визитки</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Отсканируйте код камерой телефона</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><img src={qrUrlForPublic(profile.username)} alt="QR" style={{ width: 220, height: 220 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <button className="btn" style={{ width: "100%" }} onClick={async () => { await navigator.clipboard.writeText(publicUrl(profile.username)); setToast("Ссылка скопирована"); setTimeout(() => setToast(null), 2500); }}>📋 Скопировать ссылку</button>
              <a href={qrUrlForPublic(profile.username)} download={`vizitka-${profile.username}-qr.png`} className="btn" style={{ width: "100%", textAlign: "center" }}>⬇️ Скачать QR</a>
            </div>
            <button className="btn" style={{ width: "100%" }} onClick={() => setShowQr(false)}>Закрыть</button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Главное меню редактирования — появляется над кнопкой */}
      {(showProfileMenu || menuClosing) && profileMenuAnchor && (
        <MenuCard
          anchorRect={profileMenuAnchor}
          closing={menuClosing}
          exitToRef={exitToRef}
          onClose={() => {
            setShowProfileMenu(false);
            setMenuClosing(false);
            setProfileMenuAnchor(null);
          }}
          position={window.innerWidth >= 700 ? "top" : "bottom"}
          align={window.innerWidth >= 700 ? "left" : "right"}
          width={260}
        >
          <div style={{ display: "flex", flexDirection: "column"}}>
            <MenuItem onClick={(rect) => {
              if (activeInlineField === "username") {
                setInlineEditClosing(true);
              } else {
                setInlineEditClosing(false);
                setPasswordCardClosing(true);
                setInlineAnchor(rect);
                setActiveInlineField("username");
              }
            }}>
              <div>Изменить имя пользователя</div>
              <div style={{ fontSize: 11, color: "var(--muted)"}}>{profile?.username || ""}</div>
            </MenuItem>

            <MenuItem onClick={(rect) => {
              if (activeInlineField === "email") {
                setInlineEditClosing(true);
              } else {
                setInlineEditClosing(false);
                setPasswordCardClosing(true);
                setInlineAnchor(rect);
                setActiveInlineField("email");
              }
            }}>
              <div>Изменить email</div>
              <div style={{ fontSize: 11, color: "var(--muted)"}}>{profile?.email || "не указан"}</div>
              {profile?.emailChangePending && profile.pendingEmail && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  Ожидает подтверждения: {profile.pendingEmail}
                </div>
              )}
            </MenuItem>



            <MenuItem onClick={(rect) => {
              if (showPasswordCard && !passwordCardClosing) {
                setPasswordCardClosing(true);
              } else {
                setActiveInlineField(null);
                setInlineAnchor(null);
                setInlineEditClosing(false);
                setPasswordAnchor(rect);
                setShowPasswordCard(true);
                setPasswordCardClosing(false);
              }
            }}>
              <div>Изменить пароль</div>
            </MenuItem>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <MenuItem onClick={() => { window.open("https://forms.gle/Cp3xcB3FK8kXTYc98", "_blank", "noopener,noreferrer"); setShowProfileMenu(false); }}>
              <div>Оставить обратную связь</div>
            </MenuItem>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <MenuItem onClick={() => { onLogout(); }}>
              <div>Выйти из аккаунта</div>
            </MenuItem>
          </div>
        </MenuCard>
      )}

      {/* Подменю для выбранного поля */}
      {(activeInlineField || inlineEditClosing) && inlineAnchor && (
        <InlineEditCard
          key={activeInlineField}
          closing={inlineEditClosing}
          anchorRect={inlineAnchor}
          exitToRef={exitToRef}
           value={(() => {
             if (activeInlineField === "username") return profile?.username || "";
             if (activeInlineField === "email") return (profile as any)?.email || "";
             return "";
           })()}
            onSave={async (newValue) => {
              if (activeInlineField === "username") await handleUpdateUsername(newValue);
              if (activeInlineField === "email") await handleUpdateEmail(newValue);
              exitToRef.current = null;
              setInlineEditClosing(true);
            }}
           onCancel={() => {
             exitToRef.current = null;
             setActiveInlineField(null);
             setInlineEditClosing(false);
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
      {(showPasswordCard || passwordCardClosing) && passwordAnchor && (
        <PasswordChangeCard
          anchorRect={passwordAnchor}
          closing={passwordCardClosing}
          exitToRef={exitToRef}
          onClose={() => {
            exitToRef.current = null;
            setShowPasswordCard(false);
            setPasswordCardClosing(false);
            setPasswordAnchor(null);
          }}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}

    </div>
  );
}