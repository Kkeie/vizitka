import React, { useState, useEffect } from "react";
import { type BlockType } from "../api";

interface BlockModalProps {
  type: BlockType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function BlockModal({ type, isOpen, onClose, onSubmit }: BlockModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setSearchAddress("");
    }
  }, [isOpen, type]);

  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) return;
    
    setSearching(true);
    try {
      // Пробуем использовать Google Maps Geocoding через iframe поиск
      // Создаем временный iframe для поиска адреса
      const geocodeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchAddress)}`;
      
      // Используем Nominatim (OpenStreetMap) как основной метод геокодинга (бесплатный)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setFormData({
          ...formData,
          mapLat: parseFloat(lat),
          mapLng: parseFloat(lon),
        });
        // Показываем найденный адрес
        setSearchAddress(display_name || searchAddress);
      } else {
        // Если Nominatim не нашел, предлагаем использовать Google Maps напрямую
        alert(`Адрес не найден через OpenStreetMap.\n\nПопробуйте:\n1. Уточнить адрес\n2. Или откройте Google Maps: ${geocodeUrl}\n3. Скопируйте координаты из Google Maps`);
      }
    } catch (error) {
      console.error("Ошибка геокодинга:", error);
      alert("Не удалось найти адрес. Попробуйте ввести координаты вручную или уточните адрес.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let submitData: any = { type };
    
    switch (type) {
      case "note":
        if (!formData.note?.trim()) {
          alert("Введите текст заметки");
          return;
        }
        submitData.note = formData.note;
        break;
        
      case "link":
        if (!formData.linkUrl?.trim()) {
          alert("Введите URL ссылки");
          return;
        }
        submitData.linkUrl = formData.linkUrl;
        break;
        
      case "photo":
        if (!formData.photoUrl?.trim()) {
          alert("Введите URL изображения");
          return;
        }
        submitData.photoUrl = formData.photoUrl;
        break;
        
      case "video":
        if (!formData.videoUrl?.trim()) {
          alert("Введите YouTube URL");
          return;
        }
        submitData.videoUrl = formData.videoUrl;
        break;
        
      case "music":
        if (!formData.musicEmbed?.trim()) {
          alert("Введите ссылку на трек или embed-код");
          return;
        }
        submitData.musicEmbed = formData.musicEmbed.trim();
        break;
        
      case "map":
        if (formData.mapLat && formData.mapLng) {
          submitData.mapLat = formData.mapLat;
          submitData.mapLng = formData.mapLng;
        } else {
          alert("Введите координаты или найдите адрес");
          return;
        }
        break;
    }
    
    onSubmit(submitData);
    onClose();
  };

  if (!isOpen) return null;

  const typeLabels: Record<BlockType, string> = {
    note: "Заметка",
    link: "Ссылка",
    photo: "Фото",
    video: "Видео",
    music: "Музыка",
    map: "Карта",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 40,
          animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
            Добавить {typeLabels[type]}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 28,
              cursor: "pointer",
              color: "var(--muted)",
              padding: 0,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === "note" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Текст заметки
              </label>
              <textarea
                className="textarea"
                placeholder="Введите текст заметки..."
                value={formData.note || ""}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={6}
                style={{ fontSize: 15 }}
                autoFocus
              />
            </div>
          )}

          {type === "link" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                URL ссылки
              </label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com"
                value={formData.linkUrl || ""}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
            </div>
          )}

          {type === "photo" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                URL изображения
              </label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.photoUrl || ""}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
            </div>
          )}

          {type === "video" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                YouTube URL
              </label>
              <input
                className="input"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.videoUrl || ""}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Поддерживаются ссылки YouTube, YouTube Shorts, youtu.be
              </p>
            </div>
          )}

          {type === "music" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Ссылка на трек или embed-код
              </label>
              <textarea
                className="textarea"
                placeholder="https://music.yandex.ru/album/... или embed-код"
                value={formData.musicEmbed || ""}
                onChange={(e) => setFormData({ ...formData, musicEmbed: e.target.value })}
                rows={4}
                style={{ fontSize: 15 }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Поддерживаются: Yandex Music, Spotify, SoundCloud, прямые ссылки на аудио файлы
              </p>
            </div>
          )}

          {type === "map" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Поиск по адресу
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Введите адрес (например: Москва, Красная площадь)"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGeocodeAddress();
                    }
                  }}
                  style={{ fontSize: 15, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleGeocodeAddress}
                  disabled={searching || !searchAddress.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: 14, whiteSpace: "nowrap" }}
                >
                  {searching ? "Поиск..." : "Найти"}
                </button>
              </div>
              
              {/* Google Maps поиск через iframe (использует бесплатный вариант без API ключа) */}
              {searchAddress && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                    Превью на карте:
                  </div>
                  <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    <iframe
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${encodeURIComponent(searchAddress)}&output=embed`}
                      title="Поиск адреса на Google Maps"
                    />
                  </div>
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: "var(--primary)",
                        textDecoration: "none",
                      }}
                    >
                      Открыть в Google Maps →
                    </a>
                  </div>
                </div>
              )}

              {formData.mapLat && formData.mapLng && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                    Найденные координаты:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Широта
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        value={formData.mapLat}
                        onChange={(e) => setFormData({ ...formData, mapLat: parseFloat(e.target.value) || 0 })}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Долгота
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        value={formData.mapLng}
                        onChange={(e) => setFormData({ ...formData, mapLng: parseFloat(e.target.value) || 0 })}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  </div>
                  
                  {/* Превью карты через OpenStreetMap */}
                  <div style={{ marginTop: 16, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    <iframe
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(formData.mapLng - 0.01)}%2C${(formData.mapLat - 0.01)}%2C${(formData.mapLng + 0.01)}%2C${(formData.mapLat + 0.01)}&layer=mapnik&marker=${formData.mapLat}%2C${formData.mapLng}`}
                    />
                  </div>
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${formData.mapLat}&mlon=${formData.mapLng}#map=15/${formData.mapLat}/${formData.mapLng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: "var(--primary)",
                        textDecoration: "none",
                      }}
                    >
                      Открыть на карте →
                    </a>
                  </div>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12, display: "block" }}>
                  Или введите координаты вручную
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                      Широта
                    </label>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder="55.751244"
                      value={formData.mapLat || ""}
                      onChange={(e) => setFormData({ ...formData, mapLat: e.target.value ? parseFloat(e.target.value) : undefined })}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                      Долгота
                    </label>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder="37.618423"
                      value={formData.mapLng || ""}
                      onChange={(e) => setFormData({ ...formData, mapLng: e.target.value ? parseFloat(e.target.value) : undefined })}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ fontSize: 14, padding: "12px 20px" }}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 14, padding: "12px 24px" }}>
              Добавить блок
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
