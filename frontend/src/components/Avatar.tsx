import React, { useRef, useState, useCallback } from "react";
import { uploadImage, getImageUrl } from "../api";

export type AvatarProps = {
  src: string | null | undefined;
  size?: number;
  editable?: boolean;
  onChange?: (newUrl: string) => void;
  onRemove?: () => void;
  className?: string;
};

export default function Avatar({ src, size = 96, editable, onChange, onRemove, className }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const openDialog = useCallback(() => {
    if (!editable || loading) return;
    inputRef.current?.click();
  }, [editable, loading]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимальный размер: 5MB");
      e.target.value = "";
      return;
    }

    if (!file.type.match(/^image\//)) {
      alert("Выберите изображение");
      e.target.value = "";
      return;
    }

    try {
      setLoading(true);
      const { url } = await uploadImage(file);
      onChange?.(url);
    } catch (err) {
      console.error(err);
      alert("Не удалось загрузить изображение");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }, [onChange]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  }, [onRemove]);

  const px = `${size}px`;
  const hasImage = !!src;

  const placeholderContent = (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontSize: `${Math.max(12, size * 0.12)}px`,
        border: "1px solid var(--border)",
        textAlign: "center",
        padding: "8px",
        boxSizing: "border-box",
      }}
    >
      Загрузить<br />аватар
    </div>
  );

  return (
    <div
      className={className}
      style={{ position: "relative", width: px, height: px, cursor: editable ? "pointer" : "default" }}
      onMouseEnter={() => editable && setIsHovered(true)}
      onMouseLeave={() => editable && setIsHovered(false)}
      onClick={openDialog}
    >
      {hasImage ? (
        <img
          src={getImageUrl(src)}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            boxShadow: "0 6px 18px rgba(15,23,42,.06)",
          }}
        />
      ) : (
        placeholderContent
      )}

      {editable && hasImage && isHovered && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            style={{
              position: "absolute",
              left: "-4px",
              bottom: "-4px",
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(15,23,42,.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Загрузить фото"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="white" stroke="black" strokeWidth="2" />
              <path
                d="M12 17.5 L12 7.5 M12 7.5 L7.5 11.5 M12 7.5 L16.5 11.5"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleRemove}
            style={{
              position: "absolute",
              right: "-4px",
              bottom: "-4px",
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(15,23,42,.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#000",
            }}
            title="Удалить фото"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
              <path d="M9 3h6" />
            </svg>
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={false}
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}