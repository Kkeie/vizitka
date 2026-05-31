import React from "react";

export function useBentoGridMetrics(
  columns: number,
  gap = 16,
  options?: { maxCellSize?: number; minCellSize?: number }
) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const gridRef = React.useCallback((el: HTMLDivElement | null) => {
    setNode(el);
  }, []);
  const [cellSize, setCellSize] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (!node) {
      setCellSize(null);
      return;
    }

    const updateMetrics = () => {
      const width = node.clientWidth;
      if (!width) {
        return;
      }

      let nextCellSize = (width - gap * (columns - 1)) / columns;
      if (nextCellSize <= 0) {
        nextCellSize = 0;
      }
      if (options?.maxCellSize != null && nextCellSize > options.maxCellSize) {
        nextCellSize = options.maxCellSize;
      }
      if (options?.minCellSize != null && nextCellSize < options.minCellSize && nextCellSize > 0) {
        nextCellSize = options.minCellSize;
      }
      setCellSize(nextCellSize > 0 ? nextCellSize : null);
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(node);

    return () => observer.disconnect();
  }, [node, columns, gap, options?.maxCellSize, options?.minCellSize]);

  return { gridRef, gridEl: node, cellSize };
}
