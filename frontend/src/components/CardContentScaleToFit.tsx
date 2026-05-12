import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const DEFAULT_LAYOUT_WIDTH_PX = 280;

type CardContentScaleToFitProps = {
  children: React.ReactNode;
  /** Пересчёт при смене контента (метаданные ссылки, воспроизведение видео и т.д.) */
  deps?: React.DependencyList;
  /**
   * Ширина «эталонного» макета для измерения (вариант A): контент встаёт в эту ширину,
   * затем целиком масштабируется под ячейку. Стабильнее, чем width: 100% у узкой ячейки.
   */
  layoutReferenceWidthPx?: number;
  /** В редакторе: без transform scale — после ресайза сетки не залипает «мелкий» контент */
  passthrough?: boolean;
};

/**
 * Уменьшает содержимое через scale, чтобы оно помещалось в доступную высоту/ширину ячейки
 * без обрезки (в отличие от overflow:hidden на карточке).
 */
export function CardContentScaleToFit({
  children,
  deps = [],
  layoutReferenceWidthPx = DEFAULT_LAYOUT_WIDTH_PX,
  passthrough = false,
}: CardContentScaleToFitProps) {
  if (passthrough) {
    return (
      <div
        className="card-content-scale card-content-scale--passthrough"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          position: "relative",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <CardContentScaleToFitScaled deps={deps} layoutReferenceWidthPx={layoutReferenceWidthPx}>
      {children}
    </CardContentScaleToFitScaled>
  );
}

function CardContentScaleToFitScaled({
  children,
  deps = [],
  layoutReferenceWidthPx = DEFAULT_LAYOUT_WIDTH_PX,
}: Omit<CardContentScaleToFitProps, "passthrough">) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("translate(0px, 0px) scale(1)");

  const measure = useCallback(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;

    inner.style.transform = "none";
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    const w = inner.scrollWidth;
    const h = inner.scrollHeight;

    if (w < 2 || h < 2 || cw < 2 || ch < 2) {
      setTransform("translate(0px, 0px) scale(1)");
      return;
    }

    const s = Math.min(1, cw / w, ch / h);
    const safe = Number.isFinite(s) && s > 0 ? s : 1;
    const tx = (cw - w * safe) / 2;
    const ty = (ch - h * safe) / 2;

    setTransform(`translate(${tx}px, ${ty}px) scale(${safe})`);
  }, []);

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps прокидываются снаружи осознанно
  }, [measure, layoutReferenceWidthPx, ...deps]);

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(box);
    ro.observe(inner);

    const onLoad = () => measure();
    inner.addEventListener("load", onLoad, true);

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      inner.removeEventListener("load", onLoad, true);
    };
  }, [measure, layoutReferenceWidthPx, ...deps]);

  return (
    <div
      ref={boxRef}
      className="card-content-scale"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={innerRef}
        className="card-content-scale__inner"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: layoutReferenceWidthPx,
          boxSizing: "border-box",
          transform,
          transformOrigin: "top left",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
