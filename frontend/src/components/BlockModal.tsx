import React, { useState, useEffect } from "react";
import { type BlockType, getImageUrl } from "../api";
import ImageUploader from "./ImageUploader";

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
  const [mapInputType, setMapInputType] = useState<'address' | 'coordinates'>('address');

  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setSearchAddress("");
      setMapInputType('address');
    }
  }, [isOpen, type]);


  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) return;
    
    setSearching(true);
    try {
      // Используем Nominatim (OpenStreetMap) для геокодинга (бесплатный)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1&accept-language=ru`
      );
      
      if (!response.ok) {
        throw new Error('geocoding_failed');
      }
      
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('empty_response');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('[BlockModal] Failed to parse geocoding response:', text.substring(0, 200));
        throw new Error('invalid_json_response');
      }
      
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
        alert(`Адрес не найден. Попробуйте:\n1. Уточнить адрес\n2. Или используйте поиск по координатам`);
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
        let linkUrl = formData.linkUrl.trim();
        try {
          new URL(linkUrl);
          submitData.linkUrl = linkUrl;
        } catch {
          alert("Некорректный формат URL");
          return;
        }
        break;
        
      case "social":
        if (!formData.socialType) {
          alert("Выберите социальную сеть");
          return;
        }
        if (!formData.socialUrl?.trim()) {
          alert("Введите username или ссылку");
          return;
        }
        
        let socialUrl = formData.socialUrl.trim();
        
        // Если это уже полный URL, используем его
        if (socialUrl.startsWith('http://') || socialUrl.startsWith('https://')) {
          try {
            new URL(socialUrl);
            submitData.socialUrl = socialUrl;
          } catch {
            alert("Некорректный формат URL");
            return;
          }
        } else {
          // Иначе формируем URL из username
          const username = socialUrl.replace(/^@/, '').trim();
          if (formData.socialType === 'telegram') {
            if (username.match(/^[a-zA-Z0-9_]{1,32}$/)) {
              submitData.socialUrl = `https://t.me/${username}`;
            } else {
              alert("Некорректный формат Telegram username");
              return;
            }
          } else if (formData.socialType === 'vk') {
            if (username.match(/^[a-zA-Z0-9_.]{1,50}$/)) {
              submitData.socialUrl = `https://vk.com/${username}`;
            } else {
              alert("Некорректный формат VK username");
              return;
            }
          } else if (formData.socialType === 'instagram') {
            if (username.match(/^[a-zA-Z0-9_.]{1,30}$/)) {
              submitData.socialUrl = `https://instagram.com/${username}`;
            } else {
              alert("Некорректный формат Instagram username");
              return;
            }
          }
        }
        
        submitData.socialType = formData.socialType;
        break;
        
      case "photo":
        if (!formData.photoUrl?.trim()) {
          alert("Введите URL изображения или загрузите фото");
          return;
        }
        // Принимаем как полные URL, так и относительные пути (/uploads/...)
        let photoUrl = formData.photoUrl.trim();
        // Если это относительный путь (/uploads/...), оставляем как есть
        // Если это полный URL (http:// или https://), проверяем валидность
        if (!photoUrl.startsWith('/') && !photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
          alert("Введите корректный URL изображения или загрузите фото с устройства");
          return;
        }
        submitData.photoUrl = photoUrl;
        break;
        
      case "video":
        if (!formData.videoUrl?.trim()) {
          alert("Введите ссылку на видео");
          return;
        }
        submitData.videoUrl = formData.videoUrl.trim();
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
    social: "Соцсеть",
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
                Ссылка
              </label>
              <input
                className="input"
                type="text"
                placeholder="https://example.com"
                value={formData.linkUrl || ""}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Введите полный URL ссылки
              </p>
            </div>
          )}

          {type === "social" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12, display: "block" }}>
                Выберите социальную сеть
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, socialType: 'telegram' })}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: formData.socialType === 'telegram' ? "var(--primary)" : "var(--accent)",
                    color: formData.socialType === 'telegram' ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, socialType: 'vk' })}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: formData.socialType === 'vk' ? "var(--primary)" : "var(--accent)",
                    color: formData.socialType === 'vk' ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>💙</span>
                  <span>VK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, socialType: 'instagram' })}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: formData.socialType === 'instagram' ? "var(--primary)" : "var(--accent)",
                    color: formData.socialType === 'instagram' ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>📷</span>
                  <span>Instagram</span>
                </button>
              </div>
              
              {formData.socialType && (
                <>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                    {formData.socialType === 'telegram' && 'Telegram username или ссылка'}
                    {formData.socialType === 'vk' && 'VK username или ссылка'}
                    {formData.socialType === 'instagram' && 'Instagram username или ссылка'}
                  </label>
                  {formData.socialType === 'telegram' && (
                    <div style={{ position: "relative", width: "100%" }}>
                      <span style={{ 
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 15, 
                        color: "var(--text)",
                        pointerEvents: "none",
                        zIndex: 1
                      }}>@</span>
                      <input
                        className="input"
                        type="text"
                        placeholder="username или https://t.me/username"
                        value={formData.socialUrl || ""}
                        onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                        style={{ 
                          fontSize: 15, 
                          padding: "8px 12px 8px 28px",
                          width: "100%"
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                  {formData.socialType === 'vk' && (
                    <div style={{ position: "relative", width: "100%" }}>
                      <span style={{ 
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 15, 
                        color: "var(--text)",
                        pointerEvents: "none",
                        zIndex: 1
                      }}>vk.com/</span>
                      <input
                        className="input"
                        type="text"
                        placeholder="username или https://vk.com/username"
                        value={formData.socialUrl || ""}
                        onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                        style={{ 
                          fontSize: 15, 
                          padding: "8px 12px 8px 70px",
                          width: "100%"
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                  {formData.socialType === 'instagram' && (
                    <div style={{ position: "relative", width: "100%" }}>
                      <span style={{ 
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 15, 
                        color: "var(--text)",
                        pointerEvents: "none",
                        zIndex: 1
                      }}>@</span>
                      <input
                        className="input"
                        type="text"
                        placeholder="username или https://instagram.com/username"
                        value={formData.socialUrl || ""}
                        onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                        style={{ 
                          fontSize: 15, 
                          padding: "8px 12px 8px 28px",
                          width: "100%"
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {type === "photo" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12, display: "block" }}>
                Загрузка изображения
              </label>
              <ImageUploader
                onUploaded={(url) => setFormData({ ...formData, photoUrl: url })}
                label="Загрузить фото с компьютера"
                showPreview={true}
                maxSizeMB={10}
              />
              
              {formData.photoUrl && !formData.photoUrl.startsWith('/uploads/') && (
                <>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, marginBottom: 8, textAlign: "center" }}>
                    или
                  </div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginTop: 16, marginBottom: 8, display: "block" }}>
                    URL изображения
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="https://example.com/image.jpg или /uploads/image.png"
                    value={formData.photoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    style={{ fontSize: 15 }}
                    autoFocus
                  />
                </>
              )}
            </div>
          )}

          {type === "video" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Ссылка на видео
              </label>
              <input
                className="input"
                type="url"
                placeholder="https://www.youtube.com/watch?v=... или https://vk.com/video..."
                value={formData.videoUrl || ""}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Поддерживаются ссылки YouTube, YouTube Shorts, youtu.be, VK Video
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
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setMapInputType('address')}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: mapInputType === 'address' ? "var(--primary)" : "var(--accent)",
                    color: mapInputType === 'address' ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  По адресу
                </button>
                <button
                  type="button"
                  onClick={() => setMapInputType('coordinates')}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: mapInputType === 'coordinates' ? "var(--primary)" : "var(--accent)",
                    color: mapInputType === 'coordinates' ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  По координатам
                </button>
              </div>

              {mapInputType === 'address' && (
                <>
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
                  
                  {formData.mapLat && formData.mapLng && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                        Найденные координаты:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
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
                      
                      {/* Превью карты через 2ГИС или Яндекс */}
                      <div style={{ marginTop: 16, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                        <iframe
                          width="100%"
                          height="300"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://yandex.ru/map-widget/v1/?ll=${formData.mapLng}%2C${formData.mapLat}&pt=${formData.mapLng}%2C${formData.mapLat}&z=14`}
                          title="Превью на карте"
                        />
                      </div>
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <a
                          href={`https://yandex.ru/maps/?pt=${formData.mapLng},${formData.mapLat}&z=14`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                        >
                          Открыть в Яндекс.Картах →
                        </a>
                        <a
                          href={`https://2gis.ru/search/${formData.mapLat},${formData.mapLng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                        >
                          Открыть в 2ГИС →
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mapInputType === 'coordinates' && (
                <>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12, display: "block" }}>
                    Введите координаты
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
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
                  
                  {formData.mapLat && formData.mapLng && (
                    <>
                      {/* Превью карты через 2ГИС или Яндекс */}
                      <div style={{ marginTop: 16, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                        <iframe
                          width="100%"
                          height="300"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://yandex.ru/map-widget/v1/?ll=${formData.mapLng}%2C${formData.mapLat}&pt=${formData.mapLng}%2C${formData.mapLat}&z=14`}
                          title="Превью на карте"
                        />
                      </div>
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <a
                          href={`https://yandex.ru/maps/?pt=${formData.mapLng},${formData.mapLat}&z=14`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                        >
                          Открыть в Яндекс.Картах →
                        </a>
                        <a
                          href={`https://2gis.ru/search/${formData.mapLat},${formData.mapLng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                        >
                          Открыть в 2ГИС →
                        </a>
                      </div>
                    </>
                  )}
                </>
              )}
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

