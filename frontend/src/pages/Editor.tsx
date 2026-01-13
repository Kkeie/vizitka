import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { listBlocks, deleteBlock, getProfile, updateProfile, createBlock, uploadImage, getImageUrl, type Block, type Profile, type BlockType } from "../api";
import Avatar from "../components/Avatar";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import ImageUploader from "../components/ImageUploader";
import { useMasonryGrid } from "../components/BlockMasonryGrid";

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
  const gridRef = useMasonryGrid([blocks?.length]);
  

  // Если мы не на странице /editor, не делаем редирект
  if (location.pathname !== "/editor") {
    return null;
  }

  useEffect(() => {
    // Проверяем наличие токена перед загрузкой данных
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }
    loadData();
  }, []);

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
        const token = localStorage.getItem("token");
        if (!token) {
          setIsAuthorized(false);
          return;
        }
        // Токен недействителен
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16, color: "var(--text)" }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          required
                          style={{ fontSize: 16, padding: "8px 12px", flex: 1 }}
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
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16, color: "var(--text)" }}>@</span>
                        <input
                          className="input"
                          placeholder="username"
                          value={profileForm.telegram || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                          style={{ fontSize: 14, padding: "8px 12px", flex: 1 }}
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
                              ✈️ @{(profile as any).telegram}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="btn btn-ghost"
                        style={{ fontSize: 13, padding: "8px 16px", marginTop: 16, width: "100%" }}
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
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "400px" }}></div>
          </div>

          {/* Right Column: Blocks */}
          <div style={{ minWidth: 0, width: "100%" }}>
            {/* Blocks Grid */}
            <div className="reveal reveal-in">
              {(sortedBlocks || []).length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                    Пока нет блоков
                  </h3>
                  <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.6 }}>
                    Добавьте блоки через меню внизу страницы, чтобы начать создавать свою страницу
                  </p>
                </div>
              ) : (
                <div 
                  ref={(el) => {
                    if (gridRef && 'current' in gridRef) {
                      (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                    }
                  }}
                  className="grid" 
                  style={{ 
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                    gap: 16,
                    gridAutoRows: "8px",
                    rowGap: 16
                  }}
                >
                  {sortedBlocks.map((b, index) => (
                    <div
                      key={b.id}
                      className="reveal reveal-in"
                      style={{
                        animationDelay: `${index * 0.03}s`,
                        position: "relative",
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
          maxWidth: "fit-content",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
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
