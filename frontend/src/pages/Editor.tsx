import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { 
  listBlocks, 
  deleteBlock, 
  getProfile, 
  updateProfile, 
  createBlock, 
  uploadImage, 
  getImageUrl, 
  reorderBlocks, 
  publicUrl, 
  qrUrlForPublic,
  type Block, 
  type Profile, 
  type BlockType,
  type Layout,
} from "../api";
import Avatar from "../components/Avatar";
import { SortableBlockCard } from "../components/SortableBlockCard";
import BlockCard from "../components/BlockCard";
import BlockModal from "../components/BlockModal";
import SocialMediaForm, { type SocialSubmitItem } from "../components/SocialMediaForm";
import { formatPhoneNumber } from "../utils/phone";
import { useBreakpoint, Breakpoint } from "../hooks/useBreakpoint";
import debounce from "lodash/debounce";

// dnd-kit imports
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import "../styles/drag-reorder.css";

// Компонент для колонки, которая может принимать перетаскиваемые элементы
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: '50px', // чтобы пустая колонка была видима для сброса
      }}
    >
      {children}
    </div>
  );
}

export default function Editor() {
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    name: "",
    bio: "",
    phone: "",
    email: "",
    telegram: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<BlockType | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


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

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [b, p] = await Promise.all([listBlocks(), getProfile()]);
      const sorted = [...b].sort((a, b) => a.sort - b.sort);
      setBlocks(sorted);
      setProfile(p);

      if (p.layout) {
        const fixedLayout = ensureColumnCount(p.layout, sorted.map(b => b.id));
        setLayout(fixedLayout);
      } else {
        const initialLayout = generateInitialLayout(sorted);
        setLayout(initialLayout);
        updateProfile({ layout: initialLayout }).catch(console.error);
      }

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

  function ensureColumnCount(layout: Layout, allIds: number[]): Layout {
    const result: Layout = { mobile: [], tablet: [], desktop: [] };
    (Object.keys(layout) as Breakpoint[]).forEach(bp => {
      const expectedCols = bp === 'mobile' ? 1 : bp === 'tablet' ? 2 : 3;
      let cols = layout[bp];
      while (cols.length < expectedCols) {
        cols.push([]);
      }
      cols = cols.slice(0, expectedCols);
      result[bp] = cols;
    });
    return result;
  }

  function generateInitialLayout(blocks: Block[]): Layout {
    const ids = blocks.map(b => b.id);
    return {
      mobile: [ids],
      tablet: [ids, []],
      desktop: [ids, [], []],
    };
  }

  const currentColumns = layout ? layout[breakpoint] : [];

  const saveLayout = useMemo(
    () =>
      debounce(async (newLayout: Layout) => {
        try {
          await updateProfile({ layout: newLayout });
        } catch (error) {
          console.error("Failed to save layout", error);
          setToast("Не удалось сохранить расположение блоков");
        }
      }, 500),
    []
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !layout) return;

    const activeId = active.id as number;
    const overId = over.id;

    console.log('Drag end:', { activeId, overId }); // для отладки

    const newColumns = currentColumns.map(col => [...col]);

    // Находим исходную позицию
    let sourceColIdx = -1, sourceIdx = -1;
    for (let i = 0; i < newColumns.length; i++) {
      const idx = newColumns[i].indexOf(activeId);
      if (idx !== -1) {
        sourceColIdx = i;
        sourceIdx = idx;
        break;
      }
    }
    if (sourceColIdx === -1) return;

    // Определяем целевую позицию
    let destColIdx = -1, destIdx = -1;

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      // Сброс в пустую колонку
      destColIdx = parseInt(overId.replace('column-', ''), 10);
      destIdx = newColumns[destColIdx].length; // в конец
    } else {
      // Сброс на существующую карточку
      const overIdNum = overId as number;
      for (let i = 0; i < newColumns.length; i++) {
        const idx = newColumns[i].indexOf(overIdNum);
        if (idx !== -1) {
          destColIdx = i;
          destIdx = idx;
          break;
        }
      }
    }

    if (destColIdx === -1) return;
    if (sourceColIdx === destColIdx && sourceIdx === destIdx) return;

    const [moved] = newColumns[sourceColIdx].splice(sourceIdx, 1);
    if (destIdx === newColumns[destColIdx].length) {
      newColumns[destColIdx].push(moved);
    } else {
      newColumns[destColIdx].splice(destIdx, 0, moved);
    }

    const newLayout = { ...layout, [breakpoint]: newColumns };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

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
      setBlocks(prev => prev.filter(b => b.id !== id));
      if (!layout) return;
      const newLayout = { ...layout };
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        newLayout[bp] = newLayout[bp].map(col => col.filter(blockId => blockId !== id));
      });
      setLayout(newLayout);
      saveLayout(newLayout);
    } catch (e) {
      alert("Не удалось удалить блок");
      console.error(e);
    }
  }

  function handleAddBlockClick(type: BlockType) {
    setModalType(type);
    setModalOpen(true);
  }

  async function handleBlockCreated(newBlock: Block) {
    if (!layout) return;
    const newLayout = { ...layout };
    (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
      const expectedCols = bp === 'mobile' ? 1 : bp === 'tablet' ? 2 : 3;
      while (newLayout[bp].length < expectedCols) {
        newLayout[bp].push([]);
      }
      newLayout[bp] = newLayout[bp].map((col, idx) =>
        idx === 0 ? [...col, newBlock.id] : col
      );
    });
    setLayout(newLayout);
    saveLayout(newLayout);
    setBlocks(prev => [...prev, newBlock]);
  }

  async function handleBlockSubmit(data: Partial<Block>) {
    try {
      const newBlock = await createBlock(data as any);
      await handleBlockCreated(newBlock);
    } catch (e) {
      alert("Не удалось создать блок");
      console.error(e);
    }
  }

  async function handleSocialMediaSubmit(blocksData: SocialSubmitItem[]) {
    try {
      const createdBlocks = await Promise.all(
        blocksData.map(blockData => createBlock(blockData as any))
      );
      setBlocks(prev => [...prev, ...createdBlocks]);

      if (!layout) return;
      const newLayout = { ...layout };
      const newIds = createdBlocks.map(b => b.id);
      (Object.keys(newLayout) as Breakpoint[]).forEach(bp => {
        const expectedCols = bp === 'mobile' ? 1 : bp === 'tablet' ? 2 : 3;
        while (newLayout[bp].length < expectedCols) {
          newLayout[bp].push([]);
        }
        newLayout[bp] = newLayout[bp].map((col, idx) =>
          idx === 0 ? [...col, ...newIds] : col
        );
      });
      setLayout(newLayout);
      saveLayout(newLayout);
    } catch (e) {
      alert("Не удалось создать блоки");
      console.error(e);
      throw e;
    }
  }


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

  if (!profile || !layout) return null;

  const totalBlocks = blocks.length;

  return (
    <div className="page-bg min-h-screen">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
        {/* Two Column Layout: Profile Left, Blocks Right */}
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Left Column: Profile (fixed) + Placeholder for grid */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {/* Fixed profile */}
            <div ref={profileRef} className="profile-column" style={{ maxWidth: "100%" }}>
              <div className="reveal reveal-in">
                <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", alignItems: "flex-start" }}>
                  {/* Avatar */}
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
                        <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ width: "100%" }}>
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
                          style={{ width: "100%" }}
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
                        {(profile.phone || profile.email || profile.telegram) && (
                          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            {profile.phone && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                📞 {profile.phone}
                              </div>
                            )}
                            {profile.email && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                ✉️ {profile.email}
                              </div>
                            )}
                            {profile.telegram && (
                              <div style={{ fontSize: 14, color: "var(--text)" }}>
                                ✈️ {profile.telegram}
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
            {totalBlocks === 0 ? (
              <SocialMediaForm onSubmit={handleSocialMediaSubmit} />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3}, 1fr)`,
                    gap: '16px',
                  }}
                >
                  {currentColumns.map((column, colIndex) => {
                    const columnId = `column-${colIndex}`;
                    return (
                      <DroppableColumn key={colIndex} id={columnId}>
                        <SortableContext items={column} strategy={verticalListSortingStrategy}>
                          {column.map(blockId => {
                            const block = blocks.find(b => b.id === blockId);
                            return block ? (
                              <SortableBlockCard
                                key={block.id}
                                block={block}
                                onDelete={() => handleDeleteBlock(block.id)}
                              />
                            ) : null;
                          })}
                        </SortableContext>
                      </DroppableColumn>
                    );
                  })}
                </div>

                <DragOverlay>
                  {activeId ? (
                    <BlockCard b={blocks.find(b => b.id === activeId)!} isDragPreview />
                  ) : null}
                </DragOverlay>
              </DndContext>
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
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
        <div className="card" style={{ position: "fixed", right: 24, top: 24, padding: "14px 18px", zIndex: 10000, boxShadow: "var(--shadow-xl)", animation: "slideIn 0.3s ease" }}>
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