import React, { useState, useEffect } from "react";
import { type BlockType, getImageUrl } from "../api";
import ImageUploader from "./ImageUploader";

// Иконки соцсетей для модалки (те же, что при пустой визитке)
const TwitterIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>);
const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>);
const LinkedInIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>);
const GitHubIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>);
const YouTubeIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>);
const DribbbleIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.369-4.057 3.392-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm4.44 12.834c-.218.29-1.107 1.545-3.51 2.647-.297-.97-.556-2.045-.768-3.243 2.31-.477 5.162-.315 6.163-.205.044.308.07.614.07.92 0 .934-.132 1.84-.376 2.702z" /></svg>);
const BehanceIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 2.106 5.375 4.252 0 0 .244 1.683-.407 1.683h-8.399c.069 1.584.759 2.732 2.446 2.732 1.214 0 2.214-.666 2.607-1.399h2.557zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-13.988h6.953c5.476.081 5.49 5.444 2.058 6.953 3.107 1.363 3.346 7.035-2.545 7.035zm-3.008-8.988h3.491c3.19 0 3.2-4.941-.479-4.941h-3.012v4.941zm3.464 2.988c4.039 0 4.007 5.908-.474 5.908h-2.99v-5.908h2.964z" /></svg>);
const TelegramIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>);
const VKIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.546 7.135c.143-.466 0-.814-.68-.814h-2.244c-.57 0-.83.3-.972.63 0 0-1.14 2.784-2.752 4.592-.52.51-.757.68-1.045.68-.143 0-.35-.17-.35-.66V7.135c0-.57-.16-.815-.63-.815H9.35c-.35 0-.56.26-.56.5 0 .52.78.63.86 2.06v3.3c0 .72-.13.83-.42.83-.76 0-2.6-2.8-3.7-6-.22-.63-.44-.88-1.02-.88H2.26c-.64 0-.77.3-.77.63 0 .59.76 3.5 3.55 7.35 1.87 2.64 4.5 3.9 6.89 3.9 1.43 0 1.61-.32 1.61-.88v-2.03c0-.65.14-.78.6-.78.34 0 .93.17 2.3 1.5 1.58 1.58 1.84 2.28 2.73 2.28h2.24c.64 0 .97-.32.78-.95-.21-.64-1.0-1.57-2.03-2.67-.56-.66-1.4-1.37-1.66-1.77-.35-.45-.25-.65 0-1.05 0 0 2.94-4.14 3.25-5.54z" /></svg>);

const SOCIAL_OPTIONS: Array<{
  id: string;
  name: string;
  icon: React.ReactNode;
  urlPrefix: string;
  placeholder: string;
  inputPrefix: string;
  isSocialBlock: boolean;
  socialType?: "telegram" | "vk" | "instagram";
  accentColor?: string;
}> = [
  { id: "twitter", name: "Twitter", icon: <TwitterIcon />, urlPrefix: "https://twitter.com/", placeholder: "@username или ссылка", inputPrefix: "@", isSocialBlock: false, accentColor: "#1DA1F2" },
  { id: "instagram", name: "Instagram", icon: <InstagramIcon />, urlPrefix: "https://instagram.com/", placeholder: "username или https://instagram.com/...", inputPrefix: "@", isSocialBlock: true, socialType: "instagram", accentColor: "#E1306C" },
  { id: "linkedin", name: "LinkedIn", icon: <LinkedInIcon />, urlPrefix: "https://linkedin.com/in/", placeholder: "username или ссылка", inputPrefix: "linkedin.com/in/", isSocialBlock: false, accentColor: "#0A66C2" },
  { id: "github", name: "GitHub", icon: <GitHubIcon />, urlPrefix: "https://github.com/", placeholder: "@username или ссылка", inputPrefix: "github.com/", isSocialBlock: false, accentColor: "#333" },
  { id: "youtube", name: "YouTube", icon: <YouTubeIcon />, urlPrefix: "https://youtube.com/", placeholder: "@channel или ссылка", inputPrefix: "youtube.com/", isSocialBlock: false, accentColor: "#FF0000" },
  { id: "dribbble", name: "Dribbble", icon: <DribbbleIcon />, urlPrefix: "https://dribbble.com/", placeholder: "username или ссылка", inputPrefix: "dribbble.com/", isSocialBlock: false, accentColor: "#EA4C89" },
  { id: "behance", name: "Behance", icon: <BehanceIcon />, urlPrefix: "https://behance.net/", placeholder: "username или ссылка", inputPrefix: "behance.net/", isSocialBlock: false, accentColor: "#1769FF" },
  { id: "telegram", name: "Telegram", icon: <TelegramIcon />, urlPrefix: "https://t.me/", placeholder: "username или https://t.me/...", inputPrefix: "@", isSocialBlock: true, socialType: "telegram", accentColor: "#0088cc" },
  { id: "vk", name: "VK", icon: <VKIcon />, urlPrefix: "https://vk.com/", placeholder: "username или https://vk.com/...", inputPrefix: "vk.com/", isSocialBlock: true, socialType: "vk", accentColor: "#0077FF" },
];

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
        
      case "social": {
        const socialId = formData.socialType;
        if (!socialId) {
          alert("Выберите социальную сеть");
          return;
        }
        if (!formData.socialUrl?.trim()) {
          alert("Введите username или ссылку");
          return;
        }
        const opt = SOCIAL_OPTIONS.find((o) => o.id === socialId);
        if (!opt) break;
        let url = formData.socialUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = opt.urlPrefix + url.replace(/^@/, "").trim();
        }
        try {
          new URL(url);
        } catch {
          alert("Некорректный формат URL");
          return;
        }
        if (opt.isSocialBlock && opt.socialType) {
          submitData.type = "social";
          submitData.socialType = opt.socialType;
          submitData.socialUrl = url;
        } else {
          submitData.type = "link";
          submitData.linkUrl = url;
        }
        break;
      }
        
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                {SOCIAL_OPTIONS.map((opt) => {
                  const selected = formData.socialType === opt.id;
                  const bg = selected ? (opt.accentColor || "var(--primary)") : "var(--accent)";
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, socialType: opt.id })}
                      style={{
                        padding: "10px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: bg,
                        color: selected ? "white" : "var(--text)",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}>{opt.icon}</span>
                      <span>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              {formData.socialType && (() => {
                const opt = SOCIAL_OPTIONS.find((o) => o.id === formData.socialType);
                if (!opt) return null;
                const paddingLeft = 12 + Math.min(opt.inputPrefix.length * 7.5, 140);
                return (
                  <>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                      {opt.name} — username или ссылка
                    </label>
                    <div style={{ position: "relative", width: "100%" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 14,
                          color: "var(--muted)",
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      >
                        {opt.inputPrefix}
                      </span>
                      <input
                        className="input"
                        type="text"
                        placeholder={opt.placeholder}
                        value={formData.socialUrl || ""}
                        onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                        style={{ fontSize: 15, padding: "8px 12px 8px " + paddingLeft + "px", width: "100%" }}
                        autoFocus
                      />
                    </div>
                  </>
                );
              })()}
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
                placeholder="https://www.youtube.com/watch?v=... или https://vk.com/video... или https://vkvideo.ru/video..."
                value={formData.videoUrl || ""}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                style={{ fontSize: 15 }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Поддерживаются ссылки YouTube, YouTube Shorts, youtu.be, VK Video (vk.com, vkvideo.ru)
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
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{
                fontSize: 14,
                padding: "12px 20px",
                background: "var(--accent)",
                border: "1px solid var(--border)",
              }}
            >
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

