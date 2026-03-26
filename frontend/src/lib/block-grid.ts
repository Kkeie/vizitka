import type { Block, BlockGridSize, BlockType } from "../api";
import type { Breakpoint } from "../hooks/useBreakpoint";

export const GRID_COLUMNS: Record<Breakpoint, number> = {
  mobile: 2,
  tablet: 2,
  desktop: 4,
};

export const MAX_ROW_SPAN = 6;
export const BENTO_ROW_UNIT = 8;
export const DEFAULT_BENTO_CELL_SIZE = 180;
export const SECTION_BLOCK_HEIGHT = 88;

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

export function clampGridSize(size: BlockGridSize, maxCols: number): BlockGridSize {
  const safeCols = Math.max(1, maxCols);

  return {
    colSpan: Math.max(1, Math.min(safeCols, Math.round(size.colSpan))),
    rowSpan: Math.max(1, Math.min(MAX_ROW_SPAN, Math.round(size.rowSpan))),
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

    sanitized[id] = clampGridSize({ colSpan, rowSpan }, GRID_COLUMNS.desktop);
  });

  return sanitized;
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
