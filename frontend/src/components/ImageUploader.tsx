import React, { useRef, useState, useCallback } from "react";
import { uploadImage } from "../api";

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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDialog = useCallback(() => {
    if (loading) return;
    inputRef.current?.click();
  }, [loading]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
      e.target.value = "";
      return;
    }

    // Проверка типа файла
    if (!file.type.match(/^image\//)) {
      setError("Выберите изображение");
      e.target.value = "";
      return;
    }

    setError(null);

    // Показываем превью если нужно
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    try {
      setLoading(true);
      const { url } = await uploadImage(file);
      onUploaded(url);
      if (!showPreview) {
        e.target.value = "";
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось загрузить изображение");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [onUploaded, showPreview, maxSizeMB]);

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
      
      {showPreview && preview && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <img
            src={preview}
            alt="Превью"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
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

      <button
        type="button"
        onClick={openDialog}
        disabled={loading}
        className="btn btn-ghost"
        style={{
          fontSize: 14,
          padding: "10px 16px",
          width: "100%",
          ...buttonStyle,
        }}
      >
        {loading ? (
          <>
            <span>⏳</span>
            <span>Загрузка...</span>
          </>
        ) : (
          <>
            <span>📷</span>
            <span>{label}</span>
          </>
        )}
      </button>

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
