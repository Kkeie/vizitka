export type BlockDimensions = {
  widthPercent: number;
  aspectRatio: number;
};

export type BlockSizeMap = Record<number, BlockDimensions>;

export const MIN_BLOCK_WIDTH_PERCENT = 72;
export const MAX_BLOCK_WIDTH_PERCENT = 100;
export const MIN_BLOCK_HEIGHT = 120;
export const MAX_BLOCK_HEIGHT = 560;
export const MIN_BLOCK_WIDTH_PX = 220;
export const MIN_ASPECT_RATIO = 0.8;
export const MAX_ASPECT_RATIO = 2.2;

export function clampAspectRatio(aspectRatio: number): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return 1;
  }

  return Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, aspectRatio));
}

export function clampWidthPercent(widthPercent: number): number {
  if (!Number.isFinite(widthPercent)) {
    return MAX_BLOCK_WIDTH_PERCENT;
  }

  return Math.max(MIN_BLOCK_WIDTH_PERCENT, Math.min(MAX_BLOCK_WIDTH_PERCENT, Number(widthPercent.toFixed(2))));
}

export function normalizeBlockDimensions(raw: unknown): BlockDimensions | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const widthPercent = clampWidthPercent(Number(candidate.widthPercent));
  const aspectRatio = clampAspectRatio(Number(candidate.aspectRatio));

  if (!Number.isFinite(widthPercent) || !Number.isFinite(aspectRatio)) {
    return null;
  }

  return {
    widthPercent,
    aspectRatio,
  };
}

export function sanitizeBlockSizes(
  rawBlockSizes: unknown,
  validBlockIds: number[],
): BlockSizeMap {
  if (!rawBlockSizes || typeof rawBlockSizes !== "object") {
    return {};
  }

  const validIds = new Set(validBlockIds);
  const sanitized: BlockSizeMap = {};

  Object.entries(rawBlockSizes as Record<string, unknown>).forEach(([blockId, rawDimensions]) => {
    const id = Number(blockId);
    const dimensions = normalizeBlockDimensions(rawDimensions);

    if (!Number.isInteger(id) || !validIds.has(id) || !dimensions) {
      return;
    }

    sanitized[id] = dimensions;
  });

  return sanitized;
}
