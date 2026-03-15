import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { listBlocks, deleteBlock, getProfile, updateProfile, createBlock, uploadImage, getImageUrl, reorderBlocks, publicUrl, qrUrlForPublic, type Block, type Profile, type BlockType } from "../api";
import Avatar from "../components/Avatar";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import SocialMediaForm, { type SocialSubmitItem } from "../components/SocialMediaForm";
import ImageUploader from "../components/ImageUploader";
import { formatPhoneNumber } from "../utils/phone";
import { useMasonryGrid } from "../components/BlockMasonryGrid";
// Drag and drop temporarily disabled

export default function Editor() {
  const location = useLocation();
  const profileRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: "", name: "", bio: "", phone: "", email: "", telegram: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const gridRef = useMasonryGrid([blocks?.length]);
  

  // Если мы не на странице /editor, не делаем редирект
  if (location.pathname !== "/editor") {
    return null;
  }

  useEffect(() => {
    // Проверяем наличие токена перед загрузкой данных
    const token = sessionStorage.getItem("token");
    if (!token) {
      // Убираем старый токен, если остался в localStorage
      localStorage.removeItem("token");
      setIsAuthorized(false);
      setLoading(false);
      return;
    }
    loadData();
  }, []);

  // Инициализация drag-and-drop после загрузки блоков
  useEffect(() => {
    if (!blocks || blocks.length === 0) return;
    
    const gridElement = gridRef.current;
    if (!gridElement) return;

    // Ждем загрузки скрипта если нужно
    const initializeDragDrop = () => {
      if (typeof window === 'undefined' || !window.DragDropGrid) {
        setTimeout(initializeDragDrop, 100);
        return;
      }

      const handleOrderChange = async (orderData: Array<{ id: number; sort: number }>) => {
        try {
          await reorderBlocks(orderData);
          // Обновляем локальное состояние блоков
          setBlocks((prevBlocks) => {
            if (!prevBlocks) return prevBlocks;
            const updatedBlocks = [...prevBlocks];
            orderData.forEach(({ id, sort }) => {
              const block = updatedBlocks.find(b => b.id === id);
              if (block) {
                block.sort = sort;
              }
            });
            updatedBlocks.sort((a, b) => a.sort - b.sort);
            return updatedBlocks;
          });
        } catch (error) {
          console.error("Ошибка сохранения порядка:", error);
          // Перезагружаем блоки при ошибке
          const token = sessionStorage.getItem("token");
          if (token) {
            loadData();
          }
        }
      };

      window.DragDropGrid.init({
        containerSelector: gridElement,
        itemSelector: '.card',
        onUpdateOrder: handleOrderChange,
      });
    };

    initializeDragDrop();

    return () => {
      // Cleanup при размонтировании
      if (typeof window !== 'undefined' && window.DragDropGrid && window.DragDropGrid.cleanup) {
        window.DragDropGrid.cleanup();
      }
    };
  }, [blocks]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [b, p] = await Promise.all([listBlocks(), getProfile()]);
      setBlocks(b);
      setProfile(p);
      setProfileForm({
        username: p.username || "",
        name: p.name || "",
        bio: p.bio || "",
        phone: (p as any).phone || "",
        email: (p as any).email || "",
        telegram: (p as any).telegram || "",
      });
      setIsAuthorized(true);
    } catch (e: any) {
      console.error("Ошибка загрузки данных:", e);
      const errorMessage = e?.message || "Не удалось загрузить данные";
      
      // Если ошибка авторизации, перенаправляем на страницу входа
      if (errorMessage === "unauthorized" || errorMessage === "user_not_found") {
        const token = sessionStorage.getItem("token");
        if (!token) {
          setIsAuthorized(false);
          return;
        }
        // Токен недействителен
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        setIsAuthorized(false);
        return;
      }
      
      // Если профиль не найден, но пользователь авторизован, это нормально - профиль будет создан автоматически
      if (errorMessage === "profile_load_failed" || errorMessage === "load_blocks_failed") {
        // Попробуем перезагрузить данные через секунду
        setTimeout(() => {
          loadData();
        }, 1000);
        return;
      }
      
      // Проверка на сетевые ошибки
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setError("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на http://localhost:3000");
        setIsAuthorized(true); // Не редиректим при сетевых ошибках
        return;
      }
      
      setError(errorMessage === "Не удалось загрузить данные" ? errorMessage : `Ошибка: ${errorMessage}`);
      setIsAuthorized(true); // Не редиректим при других ошибках
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        username: profileForm.username,
        name: profileForm.name || null,
        bio: profileForm.bio || null,
        phone: profileForm.phone || null,
        email: profileForm.email || null,
        telegram: profileForm.telegram || null,
      } as any);
      setProfile(updated);
      setEditingProfile(false);
    } catch (e) {
      alert("Не удалось сохранить профиль");
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteBlock(id: number) {
    if (!confirm("Удалить этот блок?")) return;
    try {
      await deleteBlock(id);
      setBlocks((prev) => (prev || []).filter((b) => b.id !== id));
    } catch (e) {
      alert("Не удалось удалить блок");
      console.error(e);
    }
  }

  function handleAddBlockClick(type: BlockType) {
    setModalType(type);
    setModalOpen(true);
  }

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const blockData = {
        ...data,
        sort: (blocks?.length || 0) + 1,
      };
      const newBlock = await createBlock(blockData as any);
      setBlocks((prev) => [...(prev || []), newBlock]);
    } catch (e) {
      alert("Не удалось создать блок");
      console.error(e);
    }
  }

  async function handleSocialMediaSubmit(blocksData: SocialSubmitItem[]) {
    try {
      const createdBlocks = await Promise.all(
        blocksData.map((blockData) => createBlock(blockData as any))
      );
      setBlocks((prev) => [...(prev || []), ...createdBlocks]);
    } catch (e) {
      alert("Не удалось создать блоки");
      console.error(e);
      throw e;
    }
  }


  // Вычисляем отсортированные блоки
  const sortedBlocks = useMemo(() => {
    return blocks ? [...blocks].sort((a, b) => a.sort - b.sort) : [];
  }, [blocks]);



  // Редирект на страницу входа, если пользователь не авторизован
  if (isAuthorized === false) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="muted">Загрузка…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="ribbon error">{error}</div>
      </div>
    );
  }

  if (!blocks || !profile) return null;

  return (
    <div 
      className="page-bg min-h-screen"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      }}
    >
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100, position: "relative", zIndex: 1 }}>

        {/* Two Column Layout: Profile Left, Blocks Right */}
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Left Column: Profile (fixed) + Placeholder for grid */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {/* Fixed profile */}
            <div ref={profileRef} className="profile-column" style={{ maxWidth: "100%" }}>
            <div className="reveal reveal-in">
              <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", alignItems: "flex-start" }}>
                {/* Avatar */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div>
                    <Avatar
                      src={profile.avatarUrl}
                      size={120}
                      editable={true}
                      onChange={async (url: string) => {
                        try {
                          const updated = await updateProfile({ avatarUrl: url } as any);
                          setProfile({ ...updated, avatarUrl: updated.avatarUrl ? `${updated.avatarUrl}?t=${Date.now()}` : updated.avatarUrl });
                        } catch {
                          alert("Не удалось сохранить аватар");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Profile Info */}
                {editingProfile ? (
                  <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Имя
                      </label>
                      <input
                        className="input"
                        placeholder="Ваше имя"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        style={{ fontSize: 16, fontWeight: 700, padding: "8px 12px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Username
                      </label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <span style={{ 
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 16, 
                          color: "var(--text)",
                          pointerEvents: "none",
                          zIndex: 1
                        }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          required
                          style={{ 
                            fontSize: 16, 
                            padding: "8px 12px 8px 28px", 
                            width: "100%"
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Описание
                      </label>
                      <textarea
                        className="textarea"
                        placeholder="Расскажите о себе..."
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={4}
                        style={{ fontSize: 14, resize: "vertical", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Телефон
                      </label>
                      <input
                        className="input"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={profileForm.phone || ""}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setProfileForm({ ...profileForm, phone: formatted });
                        }}
                        style={{ fontSize: 14, padding: "8px 12px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Email
                      </label>
                      <input
                        className="input"
                        type="email"
                        placeholder="example@mail.ru"
                        value={profileForm.email || ""}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        style={{ fontSize: 14, padding: "8px 12px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6, display: "block" }}>
                        Telegram
                      </label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <span style={{ 
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 14, 
                          color: "var(--text)",
                          pointerEvents: "none",
                          zIndex: 1
                        }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.telegram || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                          style={{ 
                            fontSize: 14, 
                            padding: "8px 12px 8px 28px", 
                            width: "100%"
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                      <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ fontSize: 14, width: "100%" }}>
                        {savingProfile ? "Сохранение..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(false);
                        setProfileForm({
                          username: profile.username || "",
                          name: profile.name || "",
                          bio: profile.bio || "",
                          phone: (profile as any).phone || "",
                          email: (profile as any).email || "",
                          telegram: (profile as any).telegram || "",
                        });
                        }}
                        className="btn btn-ghost"
                        style={{ fontSize: 14, width: "100%" }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ textAlign: "left", width: "100%" }}>
                      <h1 style={{ 
                        fontSize: 32, 
                        fontWeight: 800, 
                        letterSpacing: "-0.03em", 
                        lineHeight: 1.2, 
                        color: "var(--text)", 
                        marginBottom: 8, 
                        wordBreak: "break-word"
                      }}>
                        {profile.name || profile.username}
                      </h1>
                      <p style={{ 
                        fontSize: 16, 
                        color: "var(--text)", 
                        marginBottom: 16, 
                        fontWeight: 500
                      }}>
                        @{profile.username}
                      </p>
                      {profile.bio && (
                        <p style={{ 
                          color: "var(--text)", 
                          fontSize: 14, 
                          lineHeight: 1.6, 
                          textAlign: "left",
                          wordWrap: "break-word",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                          width: "100%",
                          maxWidth: "100%",
                          marginBottom: 16
                        }}>
                          {profile.bio}
                        </p>
                      )}
                      {((profile as any).phone || (profile as any).email || (profile as any).telegram) && (
                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                          {(profile as any).phone && (
                            <div style={{ fontSize: 14, color: "var(--text)" }}>
                              📞 {(profile as any).phone}
                            </div>
                          )}
                          {(profile as any).email && (
                            <div style={{ fontSize: 14, color: "var(--text)" }}>
                              ✉️ {(profile as any).email}
                            </div>
                          )}
                          {(profile as any).telegram && (
                            <div style={{ fontSize: 14, color: "var(--text)" }}>
                              ✈️ {(profile as any).telegram}
                            </div>
                          )}
                        </div>
                      )}
                      {/* QR-код публичной визитки */}
                      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 13, width: "100%", justifyContent: "flex-start" }}
                          onClick={() => setShowQr(true)}
                        >
                          📱 Показать QR визитки
                        </button>
                        <div style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>
                          Публичная ссылка: {publicUrl(profile.username)}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="btn btn-ghost"
                        style={{ 
                          fontSize: 13, 
                          padding: "8px 16px", 
                          marginTop: 16, 
                          width: "auto",
                          background: "var(--accent)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        ✏️ Редактировать
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
            {/* Placeholder для сохранения места в grid на больших экранах */}
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }}></div>
          </div>

          {/* Right Column: Blocks */}
          <div style={{ minWidth: 0, width: "100%" }}>
            {/* Blocks Grid */}
            {(sortedBlocks || []).length === 0 ? (
              <SocialMediaForm 
                onSubmit={handleSocialMediaSubmit}
              />
            ) : (
              <div className="blocks-grid" ref={gridRef}>
                {sortedBlocks.map((b, index) => (
                  <div
                    key={b.id}
                    data-id={b.id}
                    className="reveal reveal-in"
                    style={{
                      animationDelay: `${index * 0.03}s`,
                      position: "relative",
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    <BlockCard
                      b={b}
                      onDelete={() => handleDeleteBlock(b.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar - Block Selection */}
        <div style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 20px",
          zIndex: 1000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          maxWidth: "calc(100% - 40px)",
          width: "fit-content",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}>
              {[
                { type: "note" as BlockType, label: "Заметка", icon: "📝" },
                { type: "link" as BlockType, label: "Ссылка", icon: "🔗" },
                { type: "social" as BlockType, label: "Соцсеть", icon: "💬" },
                { type: "photo" as BlockType, label: "Фото", icon: "🖼️" },
                { type: "video" as BlockType, label: "Видео", icon: "🎥" },
                { type: "music" as BlockType, label: "Музыка", icon: "🎵" },
                { type: "map" as BlockType, label: "Карта", icon: "🗺️" },
              ].map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => handleAddBlockClick(type)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "3px",
                    padding: "6px 10px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    transition: "all 0.2s ease",
                    color: "var(--text)",
                    minWidth: "65px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Block Modal */}
      {modalType && (
        <BlockModal
          type={modalType}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalType(null);
          }}
          onSubmit={handleBlockSubmit}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div 
          className="card" 
          style={{ 
            position: "fixed", 
            right: 24, 
            top: 24, 
            padding: "14px 18px",
            zIndex: 10000,
            boxShadow: "var(--shadow-xl)",
            animation: "slideIn 0.3s ease"
          }}
        >
          {toast}
        </div>
      )}

      {/* QR-модалка */}
      {showQr && profile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 11000,
          }}
          onClick={() => setShowQr(false)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 360, width: "90%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>QR-код вашей визитки</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Отсканируйте код камерой телефона, чтобы открыть публичную страницу.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img
                src={qrUrlForPublic(profile.username)}
                alt="QR-код визитки"
                style={{ width: 220, height: 220 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", fontSize: 14 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publicUrl(profile.username));
                    setToast("Ссылка на визитку скопирована");
                    setTimeout(() => setToast(null), 2500);
                  } catch {
                    setToast("Не удалось скопировать ссылку");
                    setTimeout(() => setToast(null), 2500);
                  }
                }}
              >
                📋 Скопировать ссылку
              </button>
              <a
                href={qrUrlForPublic(profile.username)}
                download={`vizitka-${profile.username}-qr.png`}
                className="btn"
                style={{ width: "100%", fontSize: 14, textAlign: "center", justifyContent: "center", display: "inline-flex" }}
              >
                ⬇️ Скачать QR-код
              </a>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", fontSize: 14 }}
              onClick={() => setShowQr(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
