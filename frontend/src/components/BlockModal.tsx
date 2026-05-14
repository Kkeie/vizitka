import React, { useEffect, useRef, useState } from "react";
import { type BlockType } from "../api";
import ImageUploader from "./ImageUploader";
import {
  sanitizeSocialHandleInput,
  validateLinkInput,
  validateMapCoordinates,
  validateMusicInput,
  validatePhotoInput,
  validateSocialInput,
  validateVideoInput,
} from "../lib/blockValidation";

import {
  TwitterIcon, InstagramIcon, LinkedInIcon, GitHubIcon, YouTubeIcon,
  BehanceIcon, TelegramIcon, VKIcon,
  MaxIcon, DprofileIcon, FigmaIcon, PinterestIcon, TikTokIcon, SpotifyIcon,
} from "./SocialIconsWithBg";

const SOCIAL_OPTIONS: Array<{
  id: string;
  name: string;
  icon: React.ReactNode;
  urlPrefix: string;
  placeholder: string;
  inputPrefix: string;
  isSocialBlock: boolean;
  socialType?: "telegram" | "vk" | "instagram" | "twitter" | "linkedin" | "github" | "youtube" | "dribbble" | "behance" | "max" | "dprofile" | "figma" | "pinterest" | "tiktok" | "spotify" | null;
  accentColor?: string;
}> = [
  { id: "telegram", name: "Telegram", icon: <TelegramIcon width={24} height={24} />, urlPrefix: "https://t.me/", placeholder: "@username или https://t.me/...", inputPrefix: "t.me/", isSocialBlock: true, socialType: "telegram", accentColor: "#0088cc" },
  { id: "vk", name: "VK", icon: <VKIcon width={24} height={24} />, urlPrefix: "https://vk.com/", placeholder: "username или https://vk.com/...", inputPrefix: "vk.com/", isSocialBlock: true, socialType: "vk", accentColor: "#0077FF" },
  { id: "max", name: "Max", icon: <MaxIcon width={24} height={24} />, urlPrefix: "https://max.ru/", placeholder: "username или ссылка", inputPrefix: "max.ru/", isSocialBlock: true, socialType: "max", accentColor: "#000000" },
  { id: "github", name: "GitHub", icon: <GitHubIcon width={24} height={24} />, urlPrefix: "https://github.com/", placeholder: "username или ссылка", inputPrefix: "github.com/", isSocialBlock: true, socialType: "github", accentColor: "#333" },
  { id: "behance", name: "Behance", icon: <BehanceIcon width={24} height={24} />, urlPrefix: "https://behance.net/", placeholder: "username или ссылка", inputPrefix: "behance.net/", isSocialBlock: true, socialType: "behance", accentColor: "#1769FF" },
  { id: "dprofile", name: "Dprofile", icon: <DprofileIcon width={24} height={24} />, urlPrefix: "https://dprofile.ru/", placeholder: "username или ссылка", inputPrefix: "dprofile.ru/", isSocialBlock: true, socialType: "dprofile", accentColor: "#101010" },
  { id: "figma", name: "Figma", icon: <FigmaIcon width={24} height={24} />, urlPrefix: "https://figma.com/@", placeholder: "username или ссылка", inputPrefix: "figma.com/@", isSocialBlock: true, socialType: "figma", accentColor: "#161616" },
  { id: "pinterest", name: "Pinterest", icon: <PinterestIcon width={24} height={24} />, urlPrefix: "https://pinterest.com/", placeholder: "username или ссылка", inputPrefix: "pinterest.com/", isSocialBlock: true, socialType: "pinterest", accentColor: "#cb2027" },
  { id: "instagram", name: "Instagram", icon: <InstagramIcon width={24} height={24} />, urlPrefix: "https://instagram.com/", placeholder: "@username или https://instagram.com/...", inputPrefix: "instagram.com/", isSocialBlock: true, socialType: "instagram", accentColor: "#E1306C" },
  { id: "youtube", name: "YouTube", icon: <YouTubeIcon width={24} height={24} />, urlPrefix: "https://youtube.com/", placeholder: "@channel или ссылка", inputPrefix: "youtube.com/", isSocialBlock: true, socialType: "youtube", accentColor: "#FF0000" },
  { id: "tiktok", name: "TikTok", icon: <TikTokIcon width={24} height={24} />, urlPrefix: "https://tiktok.com/@", placeholder: "username или ссылка", inputPrefix: "tiktok.com/@", isSocialBlock: true, socialType: "tiktok", accentColor: "#070201" },
  { id: "linkedin", name: "LinkedIn", icon: <LinkedInIcon width={24} height={24} />, urlPrefix: "https://linkedin.com/in/", placeholder: "username или ссылка", inputPrefix: "linkedin.com/in/", isSocialBlock: true, socialType: "linkedin", accentColor: "#0A66C2" },
  { id: "twitter", name: "Twitter", icon: <TwitterIcon width={24} height={24} />, urlPrefix: "https://twitter.com/", placeholder: "@username или ссылка", inputPrefix: "twitter.com/", isSocialBlock: true, socialType: "twitter", accentColor: "#1DA1F2" },
  { id: "spotify", name: "Spotify", icon: <SpotifyIcon width={24} height={24} />, urlPrefix: "https://open.spotify.com/user/", placeholder: "artist/url или ссылка", inputPrefix: "open.spotify.com/user/", isSocialBlock: true, socialType: "spotify", accentColor: "#3bd75f" },
];

interface BlockModalProps {
  type: BlockType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

type AddressSuggestion = {
  lat: number;
  lng: number;
  displayName: string;
};

type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

async function searchAddressSuggestions(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1&accept-language=ru`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("address_search_failed");
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    return [];
  }

  let data: NominatimSearchResult[] = [];
  try {
    data = JSON.parse(text) as NominatimSearchResult[];
  } catch {
    console.error("[BlockModal] Failed to parse address suggestions:", text.substring(0, 200));
    throw new Error("address_search_parse_failed");
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name || query,
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

export default function BlockModal({ type, isOpen, onClose, onSubmit }: BlockModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [searchAddressError, setSearchAddressError] = useState<string | null>(null);
  const [mapInputType, setMapInputType] = useState<'address' | 'coordinates'>('address');
  const [socialUrlFocused, setSocialUrlFocused] = useState(false);
  const skipNextSuggestionFetchRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (type === "note" || type === "section") {
        setFormData({ note: "" });
      } else {
        setFormData({});
      }
      setSearchAddress("");
      setSearching(false);
      setLoadingSuggestions(false);
      setAddressSuggestions([]);
      setActiveSuggestionIndex(0);
      setSearchAddressError(null);
      setMapInputType('address');
      setFormError(null);
      skipNextSuggestionFetchRef.current = false;
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen || type !== "map" || mapInputType !== "address") {
      return;
    }

    if (skipNextSuggestionFetchRef.current) {
      skipNextSuggestionFetchRef.current = false;
      return;
    }

    const query = searchAddress.trim();
    if (query.length < 3) {
      setLoadingSuggestions(false);
      setAddressSuggestions([]);
      setActiveSuggestionIndex(0);
      setSearchAddressError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      setSearchAddressError(null);
      try {
        const suggestions = await searchAddressSuggestions(query, 5, controller.signal);
        if (controller.signal.aborted) return;
        setAddressSuggestions(suggestions);
        setActiveSuggestionIndex(0);
        if (suggestions.length === 0) {
          setSearchAddressError("Подсказки не найдены. Попробуйте уточнить адрес.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Ошибка загрузки подсказок адреса:", error);
        setAddressSuggestions([]);
        setSearchAddressError("Не удалось загрузить подсказки. Можно выполнить поиск вручную.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, mapInputType, searchAddress, type]);

  const applyAddressSuggestion = (suggestion: AddressSuggestion) => {
    skipNextSuggestionFetchRef.current = true;
    setFormData((prev: any) => ({
      ...prev,
      mapLat: suggestion.lat,
      mapLng: suggestion.lng,
    }));
    setSearchAddress(suggestion.displayName);
    setAddressSuggestions([]);
    setActiveSuggestionIndex(0);
    setSearchAddressError(null);
  };


  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) return;

    const selectedSuggestion = addressSuggestions[activeSuggestionIndex] ?? addressSuggestions[0];
    if (selectedSuggestion) {
      applyAddressSuggestion(selectedSuggestion);
      return;
    }

    setSearching(true);
    try {
      const suggestions = await searchAddressSuggestions(searchAddress.trim(), 1);

      if (suggestions.length > 0) {
        applyAddressSuggestion(suggestions[0]);
      } else {
        setSearchAddressError("Адрес не найден. Уточните запрос или используйте режим координат.");
      }
    } catch (error) {
      console.error("Ошибка геокодинга:", error);
      setSearchAddressError("Не удалось найти адрес. Попробуйте ввести координаты вручную.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let submitData: any = { type };

    switch (type) {
      case "section":
        if (!formData.note?.trim()) {
          setFormError("Введите текст заголовка.");
          return;
        }
        submitData.note = formData.note.trim();
        break;

      case "note":
        if (!formData.note?.trim()) {
          setFormError("Введите текст заметки.");
          return;
        }
        submitData.note = formData.note.trim();
        submitData.noteStyle = { align: "left" };
        break;

      case "link": {
        const result = validateLinkInput(formData.linkUrl || "");
        if (!result.ok || !result.value) {
          setFormError(result.message || "Некорректная ссылка.");
          return;
        }
        submitData.linkUrl = result.value;
        break;
      }

      case "social": {
        const socialId = formData.socialType;
        if (!socialId) {
          setFormError("Выберите социальную сеть.");
          return;
        }
        const socialResult = validateSocialInput(socialId as any, formData.socialUrl || "");
        if (!socialResult.ok || !socialResult.value) {
          setFormError(socialResult.message || "Неверный формат соцсети.");
          return;
        }
        submitData.type = "social";
        submitData.socialType = socialId;
        submitData.socialUrl = socialResult.value;
        break;
      }

      case "photo": {
        const photoResult = validatePhotoInput(formData.photoUrl || "");
        if (!photoResult.ok || !photoResult.value) {
          setFormError(photoResult.message || "Неверный формат изображения.");
          return;
        }
        submitData.photoUrl = photoResult.value;
        break;
      }

      case "video": {
        const videoResult = validateVideoInput(formData.videoUrl || "");
        if (!videoResult.ok || !videoResult.value) {
          setFormError(videoResult.message || "Неверная ссылка на видео.");
          return;
        }
        submitData.videoUrl = videoResult.value;
        break;
      }

      case "music": {
        const musicResult = validateMusicInput(formData.musicEmbed || "");
        if (!musicResult.ok || !musicResult.value) {
          setFormError(musicResult.message || "Неверный формат музыкального блока.");
          return;
        }
        submitData.musicEmbed = musicResult.value;
        break;
      }

      case "map": {
        const mapResult = validateMapCoordinates(formData.mapLat, formData.mapLng);
        if (!mapResult.ok || !mapResult.value) {
          setFormError(mapResult.message || "Проверьте координаты карты.");
          return;
        }
        submitData.mapLat = mapResult.value.lat;
        submitData.mapLng = mapResult.value.lng;
        break;
      }
    }

    onSubmit(submitData);
    onClose();
  };

  if (!isOpen) return null;

  const isCompactViewport =
    typeof window !== "undefined" ? window.innerWidth <= 640 : false;
  const hasMapCoordinates = formData.mapLat != null && formData.mapLng != null;

  const typeAccusative: Record<BlockType, string> = {
    section: "заголовок",
    note: "заметку",
    link: "ссылку",
    photo: "фото",
    video: "видео",
    music: "музыку",
    map: "карту",
    social: "соцсеть",
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
        alignItems: isCompactViewport ? "flex-start" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isCompactViewport ? 12 : 20,
        overflowY: "auto",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: isCompactViewport ? "100%" : 640,
          width: "100%",
          maxHeight: isCompactViewport ? "calc(100dvh - 24px)" : "90vh",
          overflowY: "auto",
          padding: isCompactViewport ? 16 : 40,
          marginTop: isCompactViewport ? 4 : 0,
          animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isCompactViewport ? 20 : 32, gap: 12 }}>
          <h2 style={{ fontSize: isCompactViewport ? 22 : 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
            Добавить {typeAccusative[type]}
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
          {type === "section" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Текст заголовка
              </label>
              <input
                className="input"
                type="text"
                placeholder="Например, Проекты"
                value={formData.note || ""}
                onChange={(e) => {
                  setFormData({ ...formData, note: e.target.value });
                  if (formError) setFormError(null);
                }}
                style={{ fontSize: 16, fontWeight: 600, textAlign: "center" }}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Заголовок будет отображаться на всю ширину сетки и разделять группы карточек.
              </p>
            </div>
          )}

          {type === "note" && (
            <div className="field">
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                Текст заметки
              </label>
              <textarea
                className="textarea"
                placeholder="Введите текст заметки..."
                value={formData.note || ""}
                onChange={(e) => {
                  setFormData({ ...formData, note: e.target.value });
                  if (formError) setFormError(null);
                }}
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
                onChange={(e) => {
                  setFormData({ ...formData, linkUrl: e.target.value });
                  if (formError) setFormError(null);
                }}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompactViewport ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {SOCIAL_OPTIONS.map((opt) => {
                  const selected = formData.socialType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, socialType: opt.id });
                        if (formError) setFormError(null);
                      }}
                      style={{
                        padding: isCompactViewport ? "9px 10px" : "10px 12px",
                        fontSize: isCompactViewport ? 12 : 13,
                        fontWeight: 600,
                        background: "var(--accent)",
                        color: "var(--text)",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        filter: selected ? "brightness(0.85)" : undefined,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", color: "#fff" }}>{opt.icon}</span>
                      <span>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              {formData.socialType && (() => {
                const opt = SOCIAL_OPTIONS.find((o) => o.id === formData.socialType);
                if (!opt) return null;
                return (
                  <>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                      {opt.name} — имя пользователя или ссылка
                    </label>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", outline: socialUrlFocused ? "2px solid var(--primary)" : "none" }}>
                      <span style={{ paddingLeft: 12, fontSize: 14, color: "var(--muted)", whiteSpace: "nowrap", userSelect: "none" }}>
                        {opt.inputPrefix}
                      </span>
                      <input
                        type="text"
                        placeholder={opt.placeholder}
                        value={formData.socialUrl || ""}
                        onFocus={() => setSocialUrlFocused(true)}
                        onBlur={() => setSocialUrlFocused(false)}
                        onChange={(e) => {
                          const next = sanitizeSocialHandleInput(e.target.value);
                          setFormData({ ...formData, socialUrl: next });
                          if (formError) setFormError(null);
                        }}
                        style={{ flex: 1, fontSize: 15, padding: "8px 12px 8px 4px", border: "none", outline: "none", background: "transparent", color: "var(--text)" }}
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
                onUploaded={(url) => {
                  setFormData({ ...formData, photoUrl: url });
                  if (formError) setFormError(null);
                }}
                label="Загрузить фото с компьютера"
                replaceLabel="Заменить фото"
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
                onChange={(e) => {
                  setFormData({ ...formData, videoUrl: e.target.value });
                  if (formError) setFormError(null);
                }}
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
                onChange={(e) => {
                  setFormData({ ...formData, musicEmbed: e.target.value });
                  if (formError) setFormError(null);
                }}
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
              <div style={{ display: "flex", flexDirection: isCompactViewport ? "column" : "row", gap: 8, marginBottom: 16 }}>
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
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>
                    Начните вводить адрес и выберите подсказку из списка.
                  </p>
                  <div style={{ display: "flex", flexDirection: isCompactViewport ? "column" : "row", gap: 8, marginBottom: 12 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="Введите адрес (например: Москва, Красная площадь)"
                      value={searchAddress}
                      onChange={(e) => {
                        setSearchAddress(e.target.value);
                        setActiveSuggestionIndex(0);
                        setSearchAddressError(null);
                        if (formError) setFormError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" && addressSuggestions.length > 0) {
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) =>
                            Math.min(prev + 1, addressSuggestions.length - 1),
                          );
                          return;
                        }
                        if (e.key === "ArrowUp" && addressSuggestions.length > 0) {
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
                          return;
                        }
                        if (e.key === "Escape") {
                          setAddressSuggestions([]);
                          setSearchAddressError(null);
                          return;
                        }
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
                      style={{ fontSize: 14, whiteSpace: "nowrap", width: isCompactViewport ? "100%" : undefined }}
                    >
                      {searching ? "Поиск..." : "Найти"}
                    </button>
                  </div>

                  {(loadingSuggestions || addressSuggestions.length > 0 || searchAddressError) && (
                    <div
                      style={{
                        marginBottom: 12,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface)",
                        overflow: "hidden",
                      }}
                    >
                      {loadingSuggestions && (
                        <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>
                          Ищем подсказки...
                        </div>
                      )}

                      {!loadingSuggestions && addressSuggestions.length > 0 && (
                        <div style={{ maxHeight: 220, overflowY: "auto" }}>
                          {addressSuggestions.map((suggestion, index) => {
                            const isActive = index === activeSuggestionIndex;
                            return (
                              <button
                                key={`${suggestion.lat}-${suggestion.lng}-${index}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyAddressSuggestion(suggestion);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "11px 12px",
                                  border: "none",
                                  borderTop: index === 0 ? "none" : "1px solid var(--border)",
                                  background: isActive ? "var(--accent)" : "transparent",
                                  color: "var(--text)",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: 13,
                                  lineHeight: 1.45,
                                }}
                              >
                                {suggestion.displayName}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!loadingSuggestions && addressSuggestions.length === 0 && searchAddressError && (
                        <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>
                          {searchAddressError}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {hasMapCoordinates && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                        Найденные координаты:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isCompactViewport ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                            Широта
                          </label>
                          <input
                            className="input"
                            type="number"
                            step="any"
                            value={formData.mapLat}
                            onChange={(e) => {
                              setFormData({ ...formData, mapLat: e.target.value === "" ? undefined : parseFloat(e.target.value) });
                              if (formError) setFormError(null);
                            }}
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
                            onChange={(e) => {
                              setFormData({ ...formData, mapLng: e.target.value === "" ? undefined : parseFloat(e.target.value) });
                              if (formError) setFormError(null);
                            }}
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
                      <div style={{ marginTop: 8, display: "flex", flexDirection: isCompactViewport ? "column" : "row", justifyContent: "space-between", gap: 8 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: isCompactViewport ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Широта
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder="55.751244"
                        value={formData.mapLat ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, mapLat: e.target.value ? parseFloat(e.target.value) : undefined });
                          if (formError) setFormError(null);
                        }}
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
                        value={formData.mapLng ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, mapLng: e.target.value ? parseFloat(e.target.value) : undefined });
                          if (formError) setFormError(null);
                        }}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  </div>
                  
                  {hasMapCoordinates && (
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
                      <div style={{ marginTop: 8, display: "flex", flexDirection: isCompactViewport ? "column" : "row", justifyContent: "space-between", gap: 8 }}>
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

          {formError && (
            <div
              style={{
                marginTop: 20,
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#b91c1c",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {formError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: isCompactViewport ? "column-reverse" : "row",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{
                fontSize: 14,
                padding: "12px 20px",
                background: "var(--accent)",
                border: "1px solid var(--border)",
                width: isCompactViewport ? "100%" : undefined,
              }}
            >
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 14, padding: "12px 24px", width: isCompactViewport ? "100%" : undefined }}>
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

