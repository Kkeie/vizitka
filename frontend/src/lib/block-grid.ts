import type { Block, BlockGridAnchor, BlockGridSize, BlockSizes, BlockType } from "../api";
import type { Breakpoint } from "../hooks/useBreakpoint";
import { classifyMusic, YANDEX_MUSIC_IFRAME_HEIGHT_PX } from "./embed";

/* dnd debug helper — включается через window.__DND_DEBUG = true в консоли */
function dndLog(fmt: string, ...args: unknown[]) {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__DND_DEBUG) {
    console.log("[DND] " + fmt, ...args);
  }
}
function dndGroup(fmt: string, ...args: unknown[]) {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__DND_DEBUG) {
    console.group("[DND] " + fmt, ...args);
  }
}
function dndGroupEnd() {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__DND_DEBUG) {
    console.groupEnd();
  }
}

function blockName(blocks: Block[], id: number): string {
  const b = blocks.find((bb) => bb.id === id);
  const text = b?.note || "";
  if (!text) return `#${id}`;
  const s = text.length > 25 ? text.slice(0, 25) + "…" : text;
  return `«${s}»`;
}

export const GRID_COLUMNS: Record<Breakpoint, number> = {
  mobile: 2,
  tablet: 3,
  desktop: 4,
};

export const MAX_ROW_SPAN = 6;
export const BENTO_ROW_UNIT = 8;
export const DEFAULT_BENTO_CELL_SIZE = 180;
export const SECTION_BLOCK_HEIGHT = 56;

const DEFAULT_SIZES: Record<BlockType, BlockGridSize> = {
  section: { colSpan: GRID_COLUMNS.desktop, rowSpan: 1 },
  note: { colSpan: 1, rowSpan: 1 },
  link: { colSpan: 2, rowSpan: 1 },
  photo: { colSpan: 2, rowSpan: 2 },
  video: { colSpan: 2, rowSpan: 2 },
  /* Только пресеты 1×1 и 2×1; по умолчанию шире — под embed Яндекса */
  music: { colSpan: 2, rowSpan: 1 },
  map: { colSpan: 2, rowSpan: 2 },
  social: { colSpan: 1, rowSpan: 1 },
};

export function flattenLayoutIds(columns?: number[][] | null): number[] {
  if (!columns?.length) {
    return [];
  }

  const seen = new Set<number>();
  const ordered: number[] = [];

  columns.forEach((column) => {
    column.forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    });
  });

  return ordered;
}

/**
 * Для mobile/tablet sparse-расстановки: порядок в layout-массиве не совпадает с вертикалью на desktop.
 * Сортируем по якорю desktop (строка, затем колонка), без якоря — сохраняем исходный порядок в списке.
 */
export function sortBlockIdsByDesktopVisualOrder(
  orderedIds: number[],
  blockSizes: BlockSizes,
): number[] {
  const index = new Map<number, number>();
  orderedIds.forEach((id, i) => index.set(id, i));

  return [...orderedIds].sort((idA, idB) => {
    const a = blockSizes[idA]?.anchorsByBreakpoint?.desktop;
    const b = blockSizes[idB]?.anchorsByBreakpoint?.desktop;
    const ra = a?.gridRowStart ?? Number.POSITIVE_INFINITY;
    const rb = b?.gridRowStart ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    const ca = a?.gridColumnStart ?? Number.POSITIVE_INFINITY;
    const cb = b?.gridColumnStart ?? Number.POSITIVE_INFINITY;
    if (ca !== cb) return ca - cb;
    return (index.get(idA) ?? 0) - (index.get(idB) ?? 0);
  });
}

export function clampGridSize(size: BlockGridSize, maxCols: number): BlockGridSize {
  const safeCols = Math.max(1, maxCols);

  return {
    colSpan: Math.max(1, Math.min(safeCols, Math.round(size.colSpan))),
    rowSpan: Math.max(1, Math.min(MAX_ROW_SPAN, Math.round(size.rowSpan))),
    ...(size.anchorsByBreakpoint ? { anchorsByBreakpoint: size.anchorsByBreakpoint } : {}),
  };
}

export function getDefaultGridSize(blockType: BlockType, maxCols: number): BlockGridSize {
  if (blockType === "section") {
    return { colSpan: Math.max(1, maxCols), rowSpan: 1 };
  }

  return clampGridSize(DEFAULT_SIZES[blockType] || { colSpan: 2, rowSpan: 2 }, maxCols);
}

/** Музыка: в редакторе разрешены только 1×1 и 2×1 (см. SizeMenu, первые два пресета). */
function snapMusicBlockSize(
  size: BlockGridSize,
  maxCols: number,
): BlockGridSize {
  const { anchorsByBreakpoint, ...rest } = size;
  const base = (span: { colSpan: number; rowSpan: number }): BlockGridSize =>
    anchorsByBreakpoint
      ? { ...span, anchorsByBreakpoint }
      : { ...span };
  if (rest.colSpan === 1 && rest.rowSpan === 1) {
    return base({ colSpan: 1, rowSpan: 1 });
  }
  if (maxCols >= 2 && rest.colSpan === 2 && rest.rowSpan === 1) {
    return base({ colSpan: 2, rowSpan: 1 });
  }
  // старые размеры (2×2 и т.д.) — приводим к «широкому» пресету при возможности
  return maxCols >= 2
    ? base({ colSpan: 2, rowSpan: 1 })
    : base({ colSpan: 1, rowSpan: 1 });
}

export function getResolvedGridSize(
  block: Pick<Block, "type">,
  rawSize: BlockGridSize | null | undefined,
  maxCols: number,
): BlockGridSize {
  if (block.type === "section") {
    return getDefaultGridSize(block.type, maxCols);
  }

  if (!rawSize) {
    return getDefaultGridSize(block.type, maxCols);
  }

  const resolved = clampGridSize(rawSize, maxCols);
  if (block.type === "music") {
    return snapMusicBlockSize(resolved, maxCols);
  }
  return resolved;
}

/**
 * colSpan/rowSpan в профиле — «авторский» размер в координатах desktop-сетки.
 * Не сужать их при раскладке mobile/tablet (иначе превью телефона затирает ширину на ПК).
 */
export function getPersistedGridSpans(
  block: Pick<Block, "type">,
  entry: BlockGridSize | undefined,
): { colSpan: number; rowSpan: number } {
  const r = getResolvedGridSize(block, entry, GRID_COLUMNS.desktop);
  return { colSpan: r.colSpan, rowSpan: r.rowSpan };
}

/**
 * Шаг сетки в микро-строках, равный высоте самой маленькой ячейки 1×1.
 * Используется для снапа drop-позиции при drag-and-drop: курсор всегда
 * попадает в начало строки самого маленького блока, без свободной расстановки.
 */
export function getCellRowMicroSteps(
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
): number {
  const cell = cellSize && cellSize > 0 ? cellSize : DEFAULT_BENTO_CELL_SIZE;
  return Math.max(1, Math.ceil((cell + gap) / (rowUnit + gap)));
}

/**
 * Вычисляет динамическую высоту микро-строки так, чтобы ровно `step` строк
 * занимали точно `cellSize` пикселей (с учётом gap между строками).
 * Это гарантирует, что ячейка 1×1 всегда квадратная.
 */
export function getDynamicRowUnit(
  cellSize: number | null,
  gap: number,
  baseRowUnit = BENTO_ROW_UNIT,
): number {
  if (!cellSize || cellSize <= 0) return baseRowUnit;
  const step = Math.round((cellSize + gap) / (baseRowUnit + gap));
  if (step <= 0) return baseRowUnit;
  return (cellSize + gap) / step - gap;
}

/** Координаты курсора → якорь сетки (линии 1-based), снапом по cell-row.
 *  sectionBreakpoints — микро-ряды (0-indexed), после которых перезапускается
 *  отсчёт cell-строк (каждый 8-й микро-ряд). */
export function clientPointToGridAnchor(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit: number,
  colSpan: number,
  sectionBreakpoints?: number[],
): BlockGridAnchor {
  const rect = gridEl.getBoundingClientRect();
  const cw =
    cellSize && cellSize > 0
      ? cellSize
      : (rect.width - gap * (gridColumns - 1)) / gridColumns;
  // Grid is `justify-content: center`: when cellSize is capped, content is narrower
  // than the container, so columns start at offsetX from the left edge.
  const contentWidth = cw * gridColumns + gap * (gridColumns - 1);
  const offsetX = Math.max(0, (rect.width - contentWidth) / 2);
  const relX = clientX - rect.left - offsetX;
  const relY = clientY - rect.top;

  const strideX = cw + gap;
  let col0 = Math.floor(Math.max(0, relX) / strideX);
  const w = Math.min(colSpan, gridColumns);
  col0 = Math.max(0, Math.min(gridColumns - w, col0));

  // Снаппинг Y: зоны между секциями, каждая — кратно cellRowMicroSteps (8).
  const cellSteps = getCellRowMicroSteps(cellSize, gap, rowUnit);
  const rawRowMicro = Math.max(0, Math.floor(Math.max(0, relY) / (rowUnit + gap)));
  let zoneStart = 0;
  if (sectionBreakpoints?.length) {
    for (const bp of sectionBreakpoints) {
      if (rawRowMicro >= bp) zoneStart = bp;
    }
  }
  const rowMicro = zoneStart + Math.floor((rawRowMicro - zoneStart) / cellSteps) * cellSteps;

  const result = clampAnchor(
    { gridColumnStart: col0 + 1, gridRowStart: rowMicro + 1 },
    gridColumns,
    w,
  );

  dndGroup("clientPointToGridAnchor");
  dndLog("cursor=({%s},{%s}), rect={%s,%s,%s,%s} w=%s h=%s", clientX.toFixed(1), clientY.toFixed(1), rect.left.toFixed(1), rect.top.toFixed(1), rect.right.toFixed(1), rect.bottom.toFixed(1), rect.width.toFixed(1), rect.height.toFixed(1));
  dndLog("offsetX=%s, relX=%s, relY=%s", offsetX.toFixed(1), relX.toFixed(1), relY.toFixed(1));
  dndLog("cw=%s, strideX=%s, col0=%s", cw.toFixed(1), strideX.toFixed(1), col0);
  dndLog("cellSteps=%s, rawRowMicro=%s, sectionBreakpoints=%s, zoneStart=%s", cellSteps, rawRowMicro, sectionBreakpoints ? `[${sectionBreakpoints.join(",")}]` : "[]", zoneStart);
  dndLog("→ anchor=(col:%s, row:%s)", result.gridColumnStart, result.gridRowStart);
  dndGroupEnd();

  return result;
}

function clampAnchor(
  anchor: BlockGridAnchor,
  gridColumns: number,
  colSpan: number,
): BlockGridAnchor {
  const maxColStart = Math.max(1, gridColumns - colSpan + 1);
  const result = {
    gridColumnStart: Math.max(1, Math.min(maxColStart, anchor.gridColumnStart)),
    gridRowStart: Math.max(1, anchor.gridRowStart),
  };
  if (result.gridColumnStart !== anchor.gridColumnStart || result.gridRowStart !== anchor.gridRowStart) {
    dndLog("  clampAnchor: (%s,%s) → (%s,%s) (maxColStart=%s, gridColumns=%s, colSpan=%s)", anchor.gridColumnStart, anchor.gridRowStart, result.gridColumnStart, result.gridRowStart, maxColStart, gridColumns, colSpan);
  }
  return result;
}

export function sanitizeBlockSizes(
  rawBlockSizes: unknown,
  validBlockIds: number[],
): Record<number, BlockGridSize> {
  if (!rawBlockSizes || typeof rawBlockSizes !== "object") {
    return {};
  }

  const validIds = new Set(validBlockIds);
  const sanitized: Record<number, BlockGridSize> = {};

  Object.entries(rawBlockSizes as Record<string, unknown>).forEach(([blockId, rawSize]) => {
    const id = Number(blockId);
    if (!Number.isInteger(id) || !validIds.has(id) || !rawSize || typeof rawSize !== "object") {
      return;
    }

    const candidate = rawSize as Record<string, unknown>;
    const colSpan = Number(candidate.colSpan);
    const rowSpan = Number(candidate.rowSpan);

    if (!Number.isFinite(colSpan) || !Number.isFinite(rowSpan)) {
      return;
    }

    const base = clampGridSize({ colSpan, rowSpan }, GRID_COLUMNS.desktop);
    const rawAnchors = (candidate as { anchorsByBreakpoint?: unknown }).anchorsByBreakpoint;
    let anchorsByBreakpoint: BlockGridSize["anchorsByBreakpoint"];
    if (rawAnchors && typeof rawAnchors === "object") {
      anchorsByBreakpoint = {};
      (["mobile", "tablet", "desktop"] as const).forEach((bp) => {
        const a = (rawAnchors as Record<string, unknown>)[bp];
        if (a && typeof a === "object") {
          const cs = Number((a as { gridColumnStart?: unknown }).gridColumnStart);
          const rs = Number((a as { gridRowStart?: unknown }).gridRowStart);
          if (Number.isFinite(cs) && Number.isFinite(rs)) {
            const maxCols = GRID_COLUMNS[bp];
            const w = base.colSpan;
            anchorsByBreakpoint![bp] = clampAnchor(
              { gridColumnStart: Math.round(cs), gridRowStart: Math.round(rs) },
              maxCols,
              w,
            );
          }
        }
      });
    }
    sanitized[id] =
      anchorsByBreakpoint && Object.keys(anchorsByBreakpoint).length > 0
        ? { ...base, anchorsByBreakpoint }
        : base;
  });

  return sanitized;
}

function colsOverlap(
  a: { c0: number; w: number },
  b: { c0: number; w: number },
): boolean {
  return !(a.c0 + a.w <= b.c0 || b.c0 + b.w <= a.c0);
}

function rowsOverlap(
  a: { r0: number; h: number },
  b: { r0: number; h: number },
): boolean {
  return !(a.r0 + a.h <= b.r0 || b.r0 + b.h <= a.r0);
}

type Rect = { id: number; c0: number; r0: number; w: number; h: number };

function buildRects(
  orderedIds: number[],
  blocks: Block[],
  blockSizes: BlockSizes,
  bp: Breakpoint,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit: number,
): Rect[] {
  return orderedIds.map((id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) {
      return { id, c0: 0, r0: 0, w: 1, h: 1 };
    }
    const gs = getResolvedGridSize(block, blockSizes[id], gridColumns);
    const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
    const w = gs.colSpan;
    const anchor = blockSizes[id]?.anchorsByBreakpoint?.[bp];
    const c0 = anchor ? anchor.gridColumnStart - 1 : 0;
    const r0 = anchor ? anchor.gridRowStart - 1 : 0;
    return { id, c0, r0, w, h };
  });
}

/** Удалить якоря одного брейкпоинта (например перед полной пересборкой после drag) */
export function stripAnchorsForBreakpoint(blockSizes: BlockSizes, bp: Breakpoint): BlockSizes {
  const out: BlockSizes = { ...blockSizes };
  for (const k of Object.keys(out)) {
    const id = Number(k);
    const e = out[id];
    if (!e?.anchorsByBreakpoint?.[bp]) continue;
    const { anchorsByBreakpoint: ab, ...restEntry } = e;
    const { [bp]: _, ...rest } = ab;
    out[id] = {
      ...restEntry,
      ...(Object.keys(rest).length > 0 ? { anchorsByBreakpoint: rest } : {}),
    };
  }
  return out;
}

/** Размещение sparse без dense: первый по строкам свободный прямоугольник */
export function assignSparseAnchorsForBreakpoint(
  orderedIds: number[],
  blocks: Block[],
  blockSizes: BlockSizes,
  bp: Breakpoint,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
  options?: { onlyMissing?: boolean; priorityBlockId?: number },
): BlockSizes {
  const onlyMissing = options?.onlyMissing !== false;
  const priorityBlockId = options?.priorityBlockId;

  const next: BlockSizes = { ...blockSizes };
  const occupancy: boolean[][] = [];

  const ensureRows = (rows: number) => {
    while (occupancy.length < rows) {
      occupancy.push(Array(gridColumns).fill(false));
    }
  };

  const tryPlaceAtExistingAnchor = (
    id: number,
    w: number,
    h: number,
  ): number | null => {
    if (!onlyMissing) return null;
    const ex = next[id]?.anchorsByBreakpoint?.[bp];
    if (ex?.gridColumnStart == null || ex?.gridRowStart == null) return null;
    const c = ex.gridColumnStart - 1;
    const r = ex.gridRowStart - 1;
    if (c < 0 || c + w > gridColumns || r < 0) return null;
    ensureRows(r + h);
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        if (occupancy[r + dr]?.[c + dc]) return null;
      }
    }
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        if (!occupancy[r + dr]) occupancy[r + dr] = Array(gridColumns).fill(false);
        occupancy[r + dr][c + dc] = true;
      }
    }
    return r;
  };

  const greedyPlace = (
    id: number,
    block: Block,
    w: number,
    h: number,
    minRow: number,
  ): number => {
    for (let r = minRow; r < 10000; r++) {
      for (let c = 0; c <= gridColumns - w; c++) {
        ensureRows(r + h);
        let free = true;
        for (let dr = 0; dr < h && free; dr++) {
          for (let dc = 0; dc < w; dc++) {
            if (occupancy[r + dr][c + dc]) { free = false; break; }
          }
        }
        if (free) {
          for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
              occupancy[r + dr][c + dc] = true;
            }
          }
          const prevEntry = next[id];
          const persisted = getPersistedGridSpans(block, prevEntry);
          const anchor = clampAnchor(
            { gridColumnStart: c + 1, gridRowStart: r + 1 },
            gridColumns,
            w,
          );
          next[id] = {
            ...(prevEntry ?? {}),
            colSpan: persisted.colSpan,
            rowSpan: persisted.rowSpan,
            anchorsByBreakpoint: {
              ...(prevEntry?.anchorsByBreakpoint ?? {}),
              [bp]: anchor,
            },
          };
          return r;
        }
      }
    }
    return -1;
  };

  // Приоритетный блок (drag/resize) фиксируется первым — без этого его бы вытеснили
  // в первое свободное место остальные блоки. Floor-правило к нему не применяем:
  // позиция выбрана пользователем явно.
  let priorityRow: number | null = null;
  if (priorityBlockId !== undefined && orderedIds.includes(priorityBlockId)) {
    const block = blocks.find((b) => b.id === priorityBlockId);
    if (block) {
      const gs = getResolvedGridSize(block, next[priorityBlockId], gridColumns);
      const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
      const w = Math.min(gs.colSpan, gridColumns);
      const existingRow = tryPlaceAtExistingAnchor(priorityBlockId, w, h);
      priorityRow =
        existingRow !== null ? existingRow : greedyPlace(priorityBlockId, block, w, h, 0);
      dndLog("  [priority] %s type=%s → priorityRow=%s", blockName(blocks, priorityBlockId!), block.type, priorityRow);
    }
  }

  // Section-блок = разделитель «зон». Все блоки после секции в orderedIds, у которых
  // нет своего якоря (или onlyMissing=false), не должны утягиваться выше неё, иначе
  // новые карточки «улетают» в предыдущий ряд (см. issue #134).
  dndGroup("assignSparseAnchors: onlyMissing=%s, priorityBlockId=%s", onlyMissing, priorityBlockId);
  dndLog("  orderedIds: [%s]", orderedIds.join(", "));
  let floor = 0;
  for (const id of orderedIds) {
    const block = blocks.find((b) => b.id === id);
    if (!block) continue;
    const gs = getResolvedGridSize(block, next[id], gridColumns);
    const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
    const w = Math.min(gs.colSpan, gridColumns);

    if (id === priorityBlockId) {
      if (block.type === "section" && priorityRow !== null && priorityRow >= 0) {
        floor = Math.max(floor, priorityRow + h);
        dndLog("  [%s type=%s] priority section, floor=%s", blockName(blocks, id), block.type, floor);
      } else {
        dndLog("  [%s type=%s] priorityBlockId, skip", blockName(blocks, id), block.type);
      }
      continue;
    }

    let placedRow = tryPlaceAtExistingAnchor(id, w, h);
    let placedMethod = "existingAnchor";
    if (placedRow === null) {
      placedRow = greedyPlace(id, block, w, h, floor);
      placedMethod = "greedyPlace";
    }
    dndLog("  [%s type=%s] %s → placedRow=%s (w=%s h=%s floor=%s)", blockName(blocks, id), block.type, placedMethod, placedRow, w, h, floor);

    if (block.type === "section" && placedRow !== null && placedRow >= 0) {
      floor = Math.max(floor, placedRow + h);
      dndLog("    section barrier: floor raised to %s", floor);
    }
  }
  dndGroupEnd();

  return next;
}

/** ID из layout, для которых есть запись в blocks (рассинхрон layout/удаление блока иначе ломает buildRects) */
function orderedIdsForExistingBlocks(orderedIds: number[], blocks: Block[]): number[] {
  return orderedIds.filter((id) => blocks.some((b) => b.id === id));
}

function compactAnchorsUpward(
  blockSizes: BlockSizes,
  orderedIds: number[],
  blocks: Block[],
  bp: Breakpoint,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
  priorityBlockId?: number,
): BlockSizes {
  const next: BlockSizes = JSON.parse(JSON.stringify(blockSizes)) as BlockSizes;
  const placed: Rect[] = [];

  const writeEntry = (id: number, block: Pick<Block, "type">, c0: number, r0: number, w: number) => {
    const prevEntry = next[id];
    const persisted = getPersistedGridSpans(block, prevEntry);
    next[id] = {
      ...(prevEntry ?? {}),
      colSpan: persisted.colSpan,
      rowSpan: persisted.rowSpan,
      anchorsByBreakpoint: {
        ...(prevEntry?.anchorsByBreakpoint ?? {}),
        [bp]: clampAnchor(
          { gridColumnStart: c0 + 1, gridRowStart: r0 + 1 },
          gridColumns,
          w,
        ),
      },
    };
  };

  // Приоритетный блок (последняя drag/resize цель) фиксируется в выбранной
  // пользователем точке — без этого компактация возвращала бы его на исходное место.
  // Размещаем его ПЕРВЫМ, чтобы остальные блоки обходили его при поиске свободного места.
  if (priorityBlockId !== undefined && orderedIds.includes(priorityBlockId)) {
    const block = blocks.find((b) => b.id === priorityBlockId);
    if (block) {
      const gs = getResolvedGridSize(block, next[priorityBlockId], gridColumns);
      const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
      const w = gs.colSpan;
      const anchor = next[priorityBlockId]?.anchorsByBreakpoint?.[bp];
      const c0 = Math.max(0, Math.min(gridColumns - w, (anchor?.gridColumnStart ?? 1) - 1));
      const r0 = Math.max(0, (anchor?.gridRowStart ?? 1) - 1);
      writeEntry(priorityBlockId, block, c0, r0, w);
      placed.push({ id: priorityBlockId, c0, r0, w, h });
    }
  }

  // Section-блок = разделитель «зон». Все блоки, идущие после секции в orderedIds,
  // не должны утягиваться вверх в свободное пространство ДО секции — иначе ломается
  // логика разделов и при добавлении новой карточки она «улетает» в предыдущий ряд.
  // Поэтому держим `floor`: минимальную строку, в которой может оказаться следующий блок.
  dndGroup("compactAnchorsUpward: priorityBlockId=%s", priorityBlockId);
  let floor = 0;
  for (const id of orderedIds) {
    const block = blocks.find((b) => b.id === id);
    if (!block) continue;
    const gs = getResolvedGridSize(block, next[id], gridColumns);
    const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
    const w = gs.colSpan;

    if (id === priorityBlockId) {
      // Уже размещён в выбранной пользователем точке. Если это секция, её фактическая
      // позиция задаёт floor для последующих блоков.
      if (block.type === "section") {
        const placedRect = placed.find((p) => p.id === id);
        if (placedRect) floor = Math.max(floor, placedRect.r0 + placedRect.h);
      }
      dndLog("  [%s type=%s] priorityBlockId, placed, floor=%s", blockName(blocks, id), block.type, floor);
      continue;
    }

    const anchor = next[id]?.anchorsByBreakpoint?.[bp];
    const c0 = Math.max(0, Math.min(gridColumns - w, (anchor?.gridColumnStart ?? 1) - 1));

    let r0 = floor;
    let collisionCount = 0;
    while (true) {
      const probe: Rect = { id, c0, r0, w, h };
      const hasCollision = placed.some((p) => colsOverlap(probe, p) && rowsOverlap(probe, p));
      if (!hasCollision) break;
      r0 += 1;
      collisionCount++;
    }

    dndLog("  [%s type=%s] c0=%s r0=%s (from floor=%s) w=%s h=%s collisions=%s", blockName(blocks, id), block.type, c0, r0, floor, w, h, collisionCount);

    writeEntry(id, block, c0, r0, w);
    placed.push({ id, c0, r0, w, h });

    if (block.type === "section") {
      floor = Math.max(floor, r0 + h);
      dndLog("    section: floor raised to %s", floor);
    }
  }
  dndGroupEnd();

  return next;
}

/** После изменения размера: сдвигаем нижние блоки при пересечении, порядок в orderedIds — приоритет сверху */
export function resolveAnchorOverlaps(
  blockSizes: BlockSizes,
  orderedIds: number[],
  blocks: Block[],
  bp: Breakpoint,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
  priorityBlockId?: number,
): BlockSizes {
  const validIds = orderedIdsForExistingBlocks(orderedIds, blocks);
  let next: BlockSizes = compactAnchorsUpward(
    blockSizes,
    validIds,
    blocks,
    bp,
    gridColumns,
    cellSize,
    gap,
    rowUnit,
    priorityBlockId,
  );

  dndGroup("resolveAnchorOverlaps: %s blocks, priority=%s", validIds.length, priorityBlockId);
  for (let iter = 0; iter < 80; iter++) {
    const rects = buildRects(validIds, blocks, next, bp, gridColumns, cellSize, gap, rowUnit);
    let moved = false;
    let overlapsFound = 0;

    for (let i = 0; i < validIds.length; i++) {
      for (let j = i + 1; j < validIds.length; j++) {
        const A = rects[i];
        const B = rects[j];
        if (!A || !B || !colsOverlap(A, B) || !rowsOverlap(A, B)) continue;
        overlapsFound++;
        // Не двигаем приоритетный блок: его позиция задана пользователем
        if (B.id === priorityBlockId) {
          dndLog("  overlap(%s@(r:%s), %s@(r:%s)) — B is priority, skip", blockName(blocks, A.id), A.r0, blockName(blocks, B.id), B.r0);
          continue;
        }

        const bottomLine = A.r0 + A.h;
        const newRowStart = bottomLine + 1;
        const idB = B.id;
        const blockB = blocks.find((b) => b.id === idB)!;
        const gsB = getResolvedGridSize(blockB, next[idB], gridColumns);
        const anchorB = next[idB]?.anchorsByBreakpoint?.[bp];
        const currentStart = anchorB?.gridRowStart ?? B.r0 + 1;
        if (currentStart < newRowStart) {
          dndLog("  overlap: %s@(c:%s,r:%s) vs %s@(c:%s,r:%s) — shift %s from r:%s to r:%s", blockName(blocks, A.id), A.c0, A.r0, blockName(blocks, B.id), B.c0, B.r0, blockName(blocks, idB), currentStart, newRowStart);
          const prevEntry = next[idB];
          const persisted = getPersistedGridSpans(blockB, prevEntry);
          const w = gsB.colSpan;
          const colStart = anchorB?.gridColumnStart ?? B.c0 + 1;
          next[idB] = {
            ...(prevEntry ?? {}),
            colSpan: persisted.colSpan,
            rowSpan: persisted.rowSpan,
            anchorsByBreakpoint: {
              ...(prevEntry?.anchorsByBreakpoint ?? {}),
              [bp]: clampAnchor(
                { gridColumnStart: colStart, gridRowStart: newRowStart },
                gridColumns,
                w,
              ),
            },
          };
          moved = true;
        }
      }
    }
    dndLog("  iter #%s: overlaps=%s moved=%s", iter, overlapsFound, moved);
    if (!moved) {
      dndLog("  converged after %s iters", iter + 1);
      break;
    }
  }
  dndGroupEnd();

  return next;
}

export function getBlockHeightPx(
  block: Pick<Block, "type" | "musicEmbed">,
  gridSize: BlockGridSize,
  cellSize: number | null,
  gap: number,
): number {
  if (block.type === "section") {
    return SECTION_BLOCK_HEIGHT;
  }

  const safeCellSize = cellSize && cellSize > 0 ? cellSize : DEFAULT_BENTO_CELL_SIZE;
  let h = gridSize.rowSpan * safeCellSize + Math.max(0, gridSize.rowSpan - 1) * gap;

  if (block.type === "music" && block.musicEmbed) {
    const kind = classifyMusic(block.musicEmbed);
    if (kind.kind === "yandex") {
      h = Math.max(h, YANDEX_MUSIC_IFRAME_HEIGHT_PX);
    }
  }

  return h;
}

export function getGridRowSpan(
  block: Pick<Block, "type" | "musicEmbed">,
  gridSize: BlockGridSize,
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
): number {
  const blockHeight = getBlockHeightPx(block, gridSize, cellSize, gap);
  const naturalMicroRows = Math.max(1, Math.ceil((blockHeight + gap) / (rowUnit + gap)));

  // Section blocks are thin headers; Yandex music blocks need exact iframe height — keep natural.
  if (block.type === "section") return naturalMicroRows;
  if (block.type === "music" && block.musicEmbed && classifyMusic(block.musicEmbed).kind === "yandex") {
    return naturalMicroRows;
  }

  // Standard blocks must occupy whole cell-rows so that N×1 blocks match one N-tall block.
  // naturalMicroRows may not be a multiple of the cell-row step due to floating-point ceil;
  // round up to the nearest multiple to fix the visual size mismatch.
  const step = getCellRowMicroSteps(cellSize, gap, rowUnit);
  return Math.ceil(naturalMicroRows / step) * step;
}
