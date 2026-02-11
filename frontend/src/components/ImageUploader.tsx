import React, { useRef, useState, useCallback } from "react";
import { uploadImage, getImageUrl } from "../api";

export type ImageUploaderProps = {
  onUploaded: (url: string) => void;
  accept?: string;
  label?: string;
  buttonStyle?: React.CSSProperties;
  showPreview?: boolean;
  maxSizeMB?: number;
};

export default function ImageUploader({
  onUploaded,
  accept = "image/*",
  label = "Загрузить изображение",
  buttonStyle,
  showPreview = false,
  maxSizeMB = 10,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openDialog = useCallback(() => {
    if (loading) return;
    inputRef.current?.click();
  }, [loading]);

  const processFile = useCallback(async (file: File) => {
    // Проверка размера файла
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
      return;
    }

    // Проверка типа файла
    if (!file.type.match(/^image\//)) {
      setError("Выберите изображение");
      return;
    }

    setError(null);

    // Всегда показываем превью перед загрузкой
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setLoading(true);
      const { url } = await uploadImage(file);
      onUploaded(url);
      // После успешной загрузки показываем превью загруженного изображения
      if (!showPreview) {
        // Загружаем превью загруженного изображения
        const img = new Image();
        img.onload = () => {
          setPreview(getImageUrl(url));
        };
        img.src = getImageUrl(url);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось загрузить изображение");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [onUploaded, showPreview, maxSizeMB]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }, [processFile]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    await processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={false}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      
      {preview && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <img
            src={preview}
            alt="Превью"
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
	      objectFit: "cover",
              objectPosition: "center",
	      borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={clearPreview}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.7)";
            }}
          >
            ×
          </button>
        </div>
      )}

      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          padding: 20,
          background: isDragging ? "var(--accent)" : "transparent",
          transition: "all 0.2s ease",
          cursor: "pointer",
          textAlign: "center",
        }}
        onClick={openDialog}
      >
        {loading ? (
          <div style={{ fontSize: 14, color: "var(--text)" }}>
            <span>⏳</span> Загрузка...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 32 }}>📷</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {isDragging ? "Отпустите для загрузки" : label}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Перетащите изображение сюда или нажмите для выбора
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ 
          marginTop: 8, 
          padding: "8px 12px", 
          background: "#fee2e2", 
          color: "#991b1b", 
          borderRadius: "var(--radius-sm)",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
