import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

const CROP_DISPLAY = 320;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function AvatarCropModal({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setLoadError(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const baseScale = img
    ? Math.max(CROP_DISPLAY / img.naturalWidth, CROP_DISPLAY / img.naturalHeight)
    : 1;
  const scale = baseScale * zoom;

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_DISPLAY, CROP_DISPLAY);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = (CROP_DISPLAY - drawW) / 2 + offset.x;
    const dy = (CROP_DISPLAY - drawH) / 2 + offset.y;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }, [img, scale, offset]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.offX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.offY + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(z + delta).toFixed(2))));
  };

  const handleConfirm = useCallback(async () => {
    if (!img) return;
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      out.width = OUTPUT_SIZE;
      out.height = OUTPUT_SIZE;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      const ratio = OUTPUT_SIZE / CROP_DISPLAY;
      const drawW = img.naturalWidth * scale * ratio;
      const drawH = img.naturalHeight * scale * ratio;
      const dx = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
      const dy = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (blob) onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }, [img, scale, offset, onConfirm]);

  const ready = !!img && !loadError;

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "min(380px, 92vw)",
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>
          Настройте аватар
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          Перетащите фото для выбора положения. Используйте слайдер или колёсико мыши для масштаба.
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: CROP_DISPLAY,
              height: CROP_DISPLAY,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              boxShadow: "0 6px 18px rgba(15,23,42,.06)",
              position: "relative",
            }}
          >
            {!ready && !loadError && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Загрузка...
              </div>
            )}
            {loadError && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                Не удалось загрузить изображение
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={CROP_DISPLAY}
              height={CROP_DISPLAY}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              style={{
                width: CROP_DISPLAY,
                height: CROP_DISPLAY,
                display: ready ? "block" : "none",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                userSelect: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Размер</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            disabled={!ready}
            style={{ flex: 1, accentColor: "var(--text)" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              color: "var(--text)",
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!ready || saving}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--text)",
              color: "#fff",
              cursor: !ready || saving ? "not-allowed" : "pointer",
              fontSize: 14,
              opacity: !ready || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
