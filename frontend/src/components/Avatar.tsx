import React, { useRef, useState, useCallback } from "react";
import { uploadImage, getImageUrl } from "../api";

export type AvatarProps = {
  src: string | null | undefined;
  size?: number;
  editable?: boolean;
  onChange?: (newUrl: string) => void;
  className?: string;
};

export default function Avatar({ src, size = 96, editable, onChange, className }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const openDialog = useCallback(() => {
    if (!editable || loading) return;
    inputRef.current?.click();
  }, [editable, loading]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (максимум 5MB для аватарки)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 5) {
      alert("Файл слишком большой. Максимальный размер для аватарки: 5MB");
      e.target.value = "";
      return;
    }

    // Проверка типа файла
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

  const px = `${size}px`;

  return (
    <div className={className} style={{ position: "relative", width: px, height: px }}>
      <img
        src={src ? getImageUrl(src) : "/avatar-placeholder.svg"}
        alt=""
        aria-hidden={!src ? "true" : "false"}
        style={{
          width: "100%", height: "100%", borderRadius: "999px",
          objectFit: "cover", background: "#f3f4f6", border: "1px solid #e5e7eb",
          boxShadow: "0 6px 18px rgba(15,23,42,.06)"
        }}
      />
      {editable && (
        <>
          <button
            type="button"
            onClick={openDialog}
            aria-label="Загрузить фото"
            style={{
              position: "absolute", right: "-4px", bottom: "-4px",
              width: "36px", height: "36px", borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: loading ? "#e5e7eb" : "#ffffff",
              boxShadow: "0 4px 12px rgba(15,23,42,.10)",
              display:"grid", placeItems:"center", cursor: loading ? "default" : "pointer"
            }}
          >
            {loading ? "…" : "✎"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={false}
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}



