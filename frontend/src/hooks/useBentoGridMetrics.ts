import React from "react";

export function useBentoGridMetrics(columns: number, gap = 16) {
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = React.useState<number | null>(null);

  React.useEffect(() => {
    const node = gridRef.current;
    if (!node) {
      return;
    }

    const updateMetrics = () => {
      const width = node.clientWidth;
      if (!width) {
        return;
      }

      const nextCellSize = (width - gap * (columns - 1)) / columns;
      setCellSize(nextCellSize > 0 ? nextCellSize : null);
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(node);

    return () => observer.disconnect();
  }, [columns, gap]);

  return { gridRef, cellSize };
}
