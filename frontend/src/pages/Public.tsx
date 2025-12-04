import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { getPublic } from "../api";
import BlockCard from "../components/BlockCard";
import { useMasonryGrid } from "../components/BlockMasonryGrid";

// Системные маршруты, которые не должны обрабатываться как username
const SYSTEM_ROUTES = ["login", "register", "editor", "mybento", "u", "api"];

export default function PublicPage() {
  const { username = "" } = useParams();
  const [state, setState] = React.useState<{ loading: boolean; name?: string; bio?: string | null; avatarUrl?: string | null; blocks?: any[]; error?: string }>({ loading: true });
  const gridRef = useMasonryGrid([state.blocks?.length]);

  // Проверяем, не является ли путь системным маршрутом
  if (SYSTEM_ROUTES.includes(username.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getPublic(username);
        setState({ loading: false, name: data.name, bio: data.bio, avatarUrl: data.avatarUrl, blocks: data.blocks });
      } catch {
        setState({ loading: false, error: "not_found" });
      }
    })();
  }, [username]);

  if (state.loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="muted" style={{ fontSize: 16 }}>Загрузка…</div>
      </div>
    );
  }
  
  if (state.error) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="ribbon error">Профиль не найден</div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
      <div className="container" style={{ maxWidth: 1200, paddingTop: 60, paddingBottom: 80 }}>
        <div className="reveal reveal-in">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flex: 1, minWidth: 0 }}>
              {state.avatarUrl && (
                <img
                  src={state.avatarUrl}
                  alt=""
                  style={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: "50%", 
                    objectFit: "cover", 
                    display: "block", 
                    border: "2px solid var(--border)", 
                    boxShadow: "var(--shadow-md)",
                    flexShrink: 0
                  }}
                  onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  loading="lazy"
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 className="title" style={{ marginBottom: 12 }}>
                  {state.name}
                </h1>
                {state.bio && (
                  <p className="subtitle" style={{ marginTop: 8, maxWidth: 600 }}>
                    {state.bio}
                  </p>
                )}
              </div>
            </div>
            <button
              className="chip"
              onClick={async () => {
                const url = window.location.href;
                try { 
                  await navigator.clipboard.writeText(url);
                  const toast = document.createElement("div");
                  toast.className = "card";
                  toast.style.cssText = "position: fixed; right: 24px; top: 24px; padding: 14px 18px; z-index: 1000; box-shadow: var(--shadow-xl); animation: slideIn 0.3s ease;";
                  toast.textContent = "Ссылка скопирована";
                  document.body.appendChild(toast);
                  setTimeout(() => {
                    toast.style.opacity = "0";
                    toast.style.transition = "opacity 0.3s ease";
                    setTimeout(() => document.body.removeChild(toast), 300);
                  }, 2000);
                }
                catch {
                  try {
                    const ta = document.createElement("textarea");
                    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
                    document.body.appendChild(ta); ta.focus(); ta.select();
                    document.execCommand("copy"); document.body.removeChild(ta);
                  } catch { 
                    window.prompt("Скопируйте ссылку:", url); 
                  }
                }
              }}
              title="Скопировать публичную ссылку" 
              aria-label="Скопировать ссылку"
              style={{ fontSize: 14, flexShrink: 0 }}
            >
              <span aria-hidden="true">🔗</span>
              <span>Скопировать ссылку</span>
            </button>
          </div>
          
          {state.blocks && state.blocks.length > 0 ? (
            <div ref={gridRef} className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {state.blocks.map((b: any) => (
                <div key={b.id} className="reveal reveal-in" style={{ animationDelay: `${state.blocks!.indexOf(b) * 0.05}s` }}>
                  <BlockCard b={b} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card reveal reveal-in" style={{ padding: 64, textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                Пока нет блоков
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 15 }}>
                Этот пользователь еще не добавил блоки
              </p>
            </div>
          )}
        </div>
      </div>
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
