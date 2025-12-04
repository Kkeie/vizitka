import React, { useState, useEffect, useMemo } from "react";
import { listBlocks, deleteBlock, getProfile, updateProfile, createBlock, type Block, type Profile, type BlockType } from "../api";
import Avatar from "../components/Avatar";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import { useMasonryGrid } from "../components/BlockMasonryGrid";

export default function Editor() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: "", name: "", bio: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const gridRef = useMasonryGrid([blocks?.length]);

  useEffect(() => {
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
      });
    } catch (e) {
      setError("Не удалось загрузить данные");
      console.error(e);
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
      });
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
    <div className="page-bg min-h-screen">
      <div className="container" style={{ maxWidth: 1400, paddingTop: 40, paddingBottom: 80 }}>
        {/* Profile Header */}
        <div className="reveal reveal-in" style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 32, marginBottom: 40 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={profile.avatarUrl}
                size={140}
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.05em", marginBottom: 12, lineHeight: 1.1, color: "var(--text)" }}>
                {profile.name || profile.username}
              </h1>
              <p style={{ fontSize: 18, color: "var(--muted)", marginBottom: 16, fontWeight: 500 }}>
                @{profile.username}
              </p>
              {profile.bio && (
                <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 600 }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Profile Settings Card */}
          <div className="card" style={{ padding: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
                Настройки профиля
              </h2>
              <button
                onClick={() => {
                  setEditingProfile(!editingProfile);
                  if (editingProfile) {
                    setProfileForm({
                      username: profile.username || "",
                      name: profile.name || "",
                      bio: profile.bio || "",
                    });
                  }
                }}
                className="btn"
                style={{ fontSize: 14, padding: "10px 18px" }}
              >
                {editingProfile ? "Отмена" : "Редактировать"}
              </button>
            </div>

            {editingProfile ? (
              <form onSubmit={saveProfile}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                      Username
                    </label>
                    <input
                      className="input"
                      placeholder="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      required
                      style={{ fontSize: 15 }}
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                      Имя
                    </label>
                    <input
                      className="input"
                      placeholder="Ваше имя"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      style={{ fontSize: 15 }}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8, display: "block" }}>
                    Описание
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="Расскажите о себе..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    rows={4}
                    style={{ fontSize: 15, resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileForm({
                        username: profile.username || "",
                        name: profile.name || "",
                        bio: profile.bio || "",
                      });
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: 14 }}
                  >
                    Отмена
                  </button>
                  <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ fontSize: 14 }}>
                    {savingProfile ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Username
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>@{profile.username}</div>
                </div>
                {profile.name && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Имя
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{profile.name}</div>
                  </div>
                )}
                {profile.bio && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Описание
                    </div>
                    <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6 }}>{profile.bio}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Blocks Section */}
        <div className="reveal reveal-in" style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: "var(--text)", letterSpacing: "-0.03em" }}>
            Добавить блок
          </h2>
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20 }}>
              {[
                { type: "note" as BlockType, label: "Заметка", icon: "📝" },
                { type: "link" as BlockType, label: "Ссылка", icon: "🔗" },
                { type: "photo" as BlockType, label: "Фото", icon: "🖼️" },
                { type: "video" as BlockType, label: "Видео", icon: "🎥" },
                { type: "music" as BlockType, label: "Музыка", icon: "🎵" },
                { type: "map" as BlockType, label: "Карта", icon: "🗺️" },
              ].map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => handleAddBlockClick(type)}
                  className="tile"
                  style={{
                    height: 130,
                    fontSize: 36,
                    gap: 14,
                  }}
                >
                  <span>{icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Blocks Grid */}
        <div className="reveal reveal-in">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
              Ваши блоки
            </h2>
            {(sortedBlocks || []).length > 0 && (
              <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 500, padding: "6px 12px", background: "var(--accent)", borderRadius: "8px" }}>
                {(sortedBlocks || []).length} {(sortedBlocks || []).length === 1 ? "блок" : (sortedBlocks || []).length < 5 ? "блока" : "блоков"}
              </span>
            )}
          </div>
          {(sortedBlocks || []).length === 0 ? (
            <div className="card" style={{ padding: 80, textAlign: "center" }}>
              <div style={{ fontSize: 72, marginBottom: 24 }}>📦</div>
              <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                Пока нет блоков
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                Добавьте блоки выше, чтобы начать создавать свою страницу
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
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}
            >
              {sortedBlocks.map((b, index) => (
                <div
                  key={b.id}
                  className="reveal reveal-in"
                  style={{
                    animationDelay: `${index * 0.05}s`,
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
    </div>
  );
}
