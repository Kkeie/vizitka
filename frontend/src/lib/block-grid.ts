import type { Block, BlockGridAnchor, BlockGridSize, BlockSizes, BlockType } from "../api";
import type { Breakpoint } from "../hooks/useBreakpoint";

export const GRID_COLUMNS: Record<Breakpoint, number> = {
  mobile: 2,
  tablet: 2,
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

  return clampGridSize(rawSize, maxCols);
}

/** Координаты курсора → якорь сетки (линии 1-based) для свободного переноса */
export function clientPointToGridAnchor(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement,
  gridColumns: number,
  cellSize: number | null,
  gap: number,
  rowUnit: number,
  colSpan: number,
): BlockGridAnchor {
  const rect = gridEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  const cw =
    cellSize && cellSize > 0
      ? cellSize
      : (rect.width - gap * (gridColumns - 1)) / gridColumns;

  const strideX = cw + gap;
  let col0 = Math.floor(Math.max(0, relX) / strideX);
  const w = Math.min(colSpan, gridColumns);
  col0 = Math.max(0, Math.min(gridColumns - w, col0));

  const strideY = rowUnit + gap;
  const rowMicro = Math.max(0, Math.floor(Math.max(0, relY) / strideY));

  return clampAnchor(
    { gridColumnStart: col0 + 1, gridRowStart: rowMicro + 1 },
    gridColumns,
    w,
  );
}

function clampAnchor(
  anchor: BlockGridAnchor,
  gridColumns: number,
  colSpan: number,
): BlockGridAnchor {
  const maxColStart = Math.max(1, gridColumns - colSpan + 1);
  return {
    gridColumnStart: Math.max(1, Math.min(maxColStart, anchor.gridColumnStart)),
    gridRowStart: Math.max(1, anchor.gridRowStart),
  };
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
    const block = blocks.find((b) => b.id === id)!;
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

  // Определяем порядок обработки: сначала приоритетный блок (если есть), затем остальные в исходном порядке
  let processOrder: number[];
  if (priorityBlockId !== undefined && orderedIds.includes(priorityBlockId)) {
    processOrder = [priorityBlockId, ...orderedIds.filter(id => id !== priorityBlockId)];
  } else {
    processOrder = [...orderedIds];
  }

  for (const id of processOrder) {
    const block = blocks.find(b => b.id === id);
    if (!block) continue;

    const gs = getResolvedGridSize(block, next[id], gridColumns);
    const h = getGridRowSpan(block, gs, cellSize, gap, rowUnit);
    const w = Math.min(gs.colSpan, gridColumns);

    // Если нужно сохранить существующий якорь (onlyMissing = true) и он есть
    if (onlyMissing) {
      const ex = next[id]?.anchorsByBreakpoint?.[bp];
      if (ex?.gridColumnStart != null && ex?.gridRowStart != null) {
        const c = ex.gridColumnStart - 1;
        const r = ex.gridRowStart - 1;
        if (c >= 0 && c + w <= gridColumns && r >= 0) {
          ensureRows(r + h);
          let ok = true;
          for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
              if (occupancy[r + dr]?.[c + dc]) { ok = false; break; }
            }
            if (!ok) break;
          }
          if (ok) {
            for (let dr = 0; dr < h; dr++) {
              for (let dc = 0; dc < w; dc++) {
                if (!occupancy[r + dr]) occupancy[r + dr] = Array(gridColumns).fill(false);
                occupancy[r + dr][c + dc] = true;
              }
            }
            continue;
          }
        }
      }
    }

    // Ищем первое свободное место (жадная упаковка)
    let placed = false;
    for (let r = 0; !placed && r < 10000; r++) {
      for (let c = 0; c <= gridColumns - w; c++) {
        ensureRows(r + h);
        let free = true;
        for (let dr = 0; dr < h; dr++) {
          for (let dc = 0; dc < w; dc++) {
            if (occupancy[r + dr][c + dc]) { free = false; break; }
          }
          if (!free) break;
        }
        if (free) {
          for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
              occupancy[r + dr][c + dc] = true;
            }
          }
          const prev = next[id] ?? { colSpan: gs.colSpan, rowSpan: gs.rowSpan };
          const anchor = clampAnchor(
            { gridColumnStart: c + 1, gridRowStart: r + 1 },
            gridColumns,
            w,
          );
          next[id] = {
            ...clampGridSize({ ...prev, colSpan: gs.colSpan, rowSpan: gs.rowSpan }, gridColumns),
            anchorsByBreakpoint: {
              ...(prev.anchorsByBreakpoint ?? {}),
              [bp]: anchor,
            },
          };
          placed = true;
          break;
        }
      }
    }
  }

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
): BlockSizes {
  let next: BlockSizes = JSON.parse(JSON.stringify(blockSizes)) as BlockSizes;

  for (let iter = 0; iter < 80; iter++) {
    const rects = buildRects(orderedIds, blocks, next, bp, gridColumns, cellSize, gap, rowUnit);
    let moved = false;

    for (let i = 0; i < orderedIds.length; i++) {
      for (let j = i + 1; j < orderedIds.length; j++) {
        const A = rects[i];
        const B = rects[j];
        if (!colsOverlap(A, B) || !rowsOverlap(A, B)) continue;

        const bottomLine = A.r0 + A.h;
        const newRowStart = bottomLine + 1;
        const idB = B.id;
        const blockB = blocks.find((b) => b.id === idB)!;
        const gsB = getResolvedGridSize(blockB, next[idB], gridColumns);
        const anchorB = next[idB]?.anchorsByBreakpoint?.[bp];
        const currentStart = anchorB?.gridRowStart ?? B.r0 + 1;
        if (currentStart < newRowStart) {
          const prev = next[idB] ?? { colSpan: gsB.colSpan, rowSpan: gsB.rowSpan };
          const w = gsB.colSpan;
          const colStart = anchorB?.gridColumnStart ?? B.c0 + 1;
          next[idB] = {
            ...clampGridSize({ ...prev, colSpan: gsB.colSpan, rowSpan: gsB.rowSpan }, gridColumns),
            anchorsByBreakpoint: {
              ...(prev.anchorsByBreakpoint ?? {}),
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
    if (!moved) break;
  }

  return next;
}

export function getBlockHeightPx(
  block: Pick<Block, "type">,
  gridSize: BlockGridSize,
  cellSize: number | null,
  gap: number,
): number {
  if (block.type === "section") {
    return SECTION_BLOCK_HEIGHT;
  }

  const safeCellSize = cellSize && cellSize > 0 ? cellSize : DEFAULT_BENTO_CELL_SIZE;
  return gridSize.rowSpan * safeCellSize + Math.max(0, gridSize.rowSpan - 1) * gap;
}

export function getGridRowSpan(
  block: Pick<Block, "type">,
  gridSize: BlockGridSize,
  cellSize: number | null,
  gap: number,
  rowUnit = BENTO_ROW_UNIT,
): number {
  const blockHeight = getBlockHeightPx(block, gridSize, cellSize, gap);
  return Math.max(1, Math.ceil((blockHeight + gap) / (rowUnit + gap)));
}
