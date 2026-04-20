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
  getToken,
  setToken,
} from "../api";
import Avatar from "../components/Avatar";
import { DraggableBlockCard } from "../components/DraggableBlockCard";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import MobileVisitPreviewModal from "../components/MobileVisitPreviewModal";
import SocialMediaForm, { type SocialSubmitItem } from "../components/SocialMediaForm";
import InlineInputCard from "../components/InlineInputCard";
import { formatPhoneNumber } from "../utils/phone";
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
  const [dragCellSize, setDragCellSize] = useState<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const revealTimeoutsRef = useRef<number[]>([]);

  // Рефы для отложенного перестроения
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasVirtualLayoutRef = useRef(false);
  const lastVirtualBlockSizesRef = useRef<BlockSizes | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: () => ({ x: 0, y: 0 }), // не используем клавиатуру
    })
  );

  // Если не на странице /editor – не рендерим
  if (location.pathname !== "/editor") return null;

  // Отслеживание координат мыши
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

  // Функция перестроения по координатам курсора
  const recalcVirtualLayout = useCallback((draggedId: number, cursorX: number, cursorY: number) => {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const draggedBlock = blocks.find(b => b.id === draggedId);
    if (!draggedBlock) return;

    // 1. Вычисляем якорь для перетаскиваемого блока
    const gs = getResolvedGridSize(draggedBlock, blockSizes[draggedId], currentGridColumns);
    let anchor = clientPointToGridAnchor(
      cursorX, cursorY, gridEl, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT, gs.colSpan
    );
    // Корректируем, чтобы не выходил за правый край
    const maxStartCol = currentGridColumns - gs.colSpan + 1;
    if (anchor.gridColumnStart > maxStartCol) anchor.gridColumnStart = Math.max(1, maxStartCol);

    // 2. Применяем якорь к перетаскиваемому блоку
    let newSizes: BlockSizes = {
      ...blockSizes,
      [draggedId]: {
        ...(blockSizes[draggedId] || {}),
        colSpan: gs.colSpan,
        rowSpan: gs.rowSpan,
        anchorsByBreakpoint: {
          ...(blockSizes[draggedId]?.anchorsByBreakpoint || {}),
          [breakpoint]: anchor,
        },
      },
    };

    // 3. Перестраиваем все блоки, чтобы не было пересечений
    let assigned = assignSparseAnchorsForBreakpoint(
      currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT,
      { onlyMissing: true, priorityBlockId: draggedId }
    );
    let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);

    console.log(`[VIRTUAL] Перестроение для блока ${draggedId} в ячейку ${anchor.gridColumnStart},${anchor.gridRowStart}`);
    setBlockSizes(resolved);
    lastVirtualBlockSizesRef.current = resolved;
    hasVirtualLayoutRef.current = true;
  }, [blocks, blockSizes, currentOrder, breakpoint, currentGridColumns, cellSize, currentGridGap, gridRef]);

  // Обработчики перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    setIsDragging(true);
    setDragCellSize(cellSize);
    setActiveId(event.active.id as number);
    hasVirtualLayoutRef.current = false;
    lastVirtualBlockSizesRef.current = null;
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

    // Запускаем таймер перестроения (200 мс)
    if (activeId !== null) {
      dragTimeoutRef.current = setTimeout(() => {
        recalcVirtualLayout(activeId, lastPointerRef.current.x, lastPointerRef.current.y);
        dragTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    setIsDragging(false);
    setDragCellSize(null);
    const draggedId = event.active.id as number;
    setActiveId(null);

    if (hasVirtualLayoutRef.current && lastVirtualBlockSizesRef.current) {
      // Сохраняем последнее перестроение в БД
      await saveBlockSizesDebounced(lastVirtualBlockSizesRef.current);
      console.log("[DRAG] Сохранено перестроение");
      hasVirtualLayoutRef.current = false;
      lastVirtualBlockSizesRef.current = null;
    } else {
      // Дроп на пустую область
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
            const gs = getResolvedGridSize(block, blockSizes[draggedId], currentGridColumns);
            let anchor = clientPointToGridAnchor(
              pointer.x, pointer.y, gridEl, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT, gs.colSpan
            );
            const maxStartCol = currentGridColumns - gs.colSpan + 1;
            if (anchor.gridColumnStart > maxStartCol) anchor.gridColumnStart = Math.max(1, maxStartCol);
            const newSizes = {
              ...blockSizes,
              [draggedId]: {
                ...(blockSizes[draggedId] || {}),
                colSpan: gs.colSpan,
                rowSpan: gs.rowSpan,
                anchorsByBreakpoint: {
                  ...(blockSizes[draggedId]?.anchorsByBreakpoint || {}),
                  [breakpoint]: anchor,
                },
              },
            };
            let assigned = assignSparseAnchorsForBreakpoint(
              currentOrder, blocks, newSizes, breakpoint, currentGridColumns, cellSize, currentGridGap, BENTO_ROW_UNIT, { onlyMissing: true }
            );
            let resolved = resolveAnchorOverlaps(assigned, currentOrder, blocks, breakpoint, currentGridColumns, cellSize, currentGridGap);
            setBlockSizes(resolved);
            await saveBlockSizesDebounced(resolved);
            console.log("[DRAG] Дроп на пустую область, якорь обновлён");
          }
        }
      }
    }
  };

  // ----- Остальные функции (сохранение профиля, удаление блоков, обновление, изменение размеров, создание блоков и т.д.) -----
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
    setBlockSizes((prev) => {
      const next = { ...prev };
      if (nextDimensions == null) {
        delete next[id];
        saveBlockSizesDebounced(next);
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
      saveBlockSizesDebounced(merged);
      return merged;
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
      revealCreatedBlock(
        options?.scrollTargetId ?? newIds[newIds.length - 1],
        options?.focusType ? { focusType: options.focusType } : undefined,
      );
    },
    [revealCreatedBlock, saveLayoutDebounced],
  );

  const createEmptyBlock = async (type: BlockType, initialData: Partial<Block> = {}) => {
    try {
      const newBlock = await createBlock({ type, ...initialData } as any);
      appendCreatedBlocks([newBlock], { focusType: type });
    } catch (e) {
      console.error(e);
      setToast("Не удалось создать блок");
    }
  };

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

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const newBlock = await createBlock(data as any);
      appendCreatedBlocks([newBlock]);
    } catch (e) {
      alert("Не удалось создать блок");
      console.error(e);
    }
  }

  async function handleSocialMediaSubmit(blocksData: SocialSubmitItem[]) {
    try {
      const createdBlocks = await Promise.all(blocksData.map(blockData => createBlock(blockData as any)));
      appendCreatedBlocks(createdBlocks, { scrollTargetId: createdBlocks[0]?.id });
    } catch (e) {
      alert("Не удалось создать блоки");
      console.error(e);
      throw e;
    }
  }

  // Редиректы и рендер
  if (isAuthorized === false) return <Navigate to="/login" replace />;
  if (loading) return <div className="page-bg min-h-screen flex items-center justify-center">Загрузка…</div>;
  if (error) return <div className="page-bg min-h-screen flex items-center justify-center"><div className="ribbon error">{error}</div></div>;
  if (!profile || !layout) return null;

  const totalBlocks = blocks.length;

  return (
    <div className="page-bg min-h-screen editor-page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Левая колонка – профиль */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
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
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Имя</label>
                        <input className="input" placeholder="Ваше имя" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} style={{ fontSize: 16, fontWeight: 700, padding: "8px 12px", width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Username</label>
                        <div style={{ position: "relative", width: "100%" }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--text)", pointerEvents: "none", zIndex: 1 }}>@</span>
                          <input className="input" placeholder="username" value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} required style={{ fontSize: 16, padding: "8px 12px 8px 28px", width: "100%" }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Описание</label>
                        <textarea className="textarea" placeholder="Расскажите о себе..." value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={4} style={{ fontSize: 14, resize: "vertical", width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Телефон</label>
                        <input className="input" type="tel" placeholder="+7 (999) 123-45-67" value={profileForm.phone || ""} onChange={(e) => { const formatted = formatPhoneNumber(e.target.value); setProfileForm({ ...profileForm, phone: formatted }); }} style={{ fontSize: 14, padding: "8px 12px", width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Email</label>
                        <input className="input" type="email" placeholder="example@mail.ru" value={profileForm.email || ""} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} style={{ fontSize: 14, padding: "8px 12px", width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>Telegram</label>
                        <div style={{ position: "relative", width: "100%" }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text)", pointerEvents: "none", zIndex: 1 }}>@</span>
                          <input className="input" placeholder="username" value={profileForm.telegram || ""} onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })} style={{ fontSize: 14, padding: "8px 12px 8px 28px", width: "100%" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                        <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ width: "100%" }}>{savingProfile ? "Сохранение..." : "Сохранить"}</button>
                        <button type="button" onClick={() => { setEditingProfile(false); setProfileForm({ username: profile.username || "", name: profile.name || "", bio: profile.bio || "", phone: (profile as any).phone || "", email: (profile as any).email || "", telegram: (profile as any).telegram || "" }); }} className="btn btn-ghost" style={{ width: "100%" }}>Отмена</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ textAlign: "left", width: "100%" }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--text)", marginBottom: 8, wordBreak: "break-word" }}>{profile.name || profile.username}</h1>
                        <p style={{ fontSize: 16, color: "var(--text)", marginBottom: 16, fontWeight: 500 }}>@{profile.username}</p>
                        {profile.bio && <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.6, textAlign: "left", wordBreak: "break-word", whiteSpace: "pre-wrap", marginBottom: 16 }}>{profile.bio}</p>}
                        {(profile.phone || profile.email || profile.telegram) && (
                          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            {profile.phone && <div style={{ fontSize: 14, color: "var(--text)" }}>📞 {profile.phone}</div>}
                            {profile.email && <div style={{ fontSize: 14, color: "var(--text)" }}>✉️ {profile.email}</div>}
                            {profile.telegram && <div style={{ fontSize: 14, color: "var(--text)" }}>✈️ {profile.telegram}</div>}
                          </div>
                        )}
                        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                          <button type="button" className="btn" style={{ fontSize: 13, width: "100%", justifyContent: "flex-start" }} onClick={() => setShowQr(true)}>📱 Показать QR визитки</button>
                          <div style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>Публичная ссылка: {publicUrl(profile.username)}</div>
                        </div>
                        <button onClick={() => setEditingProfile(true)} className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px", marginTop: 16, width: "auto", background: "var(--accent)", border: "1px solid var(--border)" }}>✏️ Редактировать</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }}></div>
          </div>

          {/* Правая колонка – блоки */}
          <div className="editor-blocks-column" style={{ minWidth: 0, width: "100%" }}>
            {totalBlocks === 0 ? (
              <SocialMediaForm onSubmit={handleSocialMediaSubmit} />
            ) : (
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
                }}
              >
                <div
                  ref={gridRef}
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
                        onDelete={() => handleDeleteBlock(block.id)}
                        onUpdate={(partial) => handleUpdateBlock(block.id, partial)}
                      />
                    );
                  })}
                </div>
                <DragOverlay>
                  {activeId ? (
                    <BlockCard 
                      b={blocks.find(b => b.id === activeId)!}
                      isDragPreview
                      colSpan={1}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar */}
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
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
              </button>
            ))}
            <div role="separator" style={{ width: 1, alignSelf: "stretch", minHeight: 44, background: "var(--border)", margin: "0 6px" }} />
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
              <span style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.2 }}>{isMobileViewport ? "Превью" : "Тел."}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Модалки и тосты */}
      {modalType && (
        <BlockModal
          type={modalType}
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setModalType(null); }}
          onSubmit={handleBlockSubmit}
        />
      )}
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
              try { new URL(val); return true; } catch { return false; }
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
      {toast && (
        <div className="card" style={{ position: "fixed", right: 24, top: 24, padding: "14px 18px", zIndex: 10000, boxShadow: "var(--shadow-xl)", animation: "slideIn 0.3s ease" }}>
          {toast}
        </div>
      )}
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
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Отсканируйте код камерой телефона, чтобы открыть публичную страницу.</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img src={qrUrlForPublic(profile.username)} alt="QR-код визитки" style={{ width: 220, height: 220 }} />
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
            <button type="button" className="btn" style={{ width: "100%", fontSize: 14 }} onClick={() => setShowQr(false)}>Закрыть</button>
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