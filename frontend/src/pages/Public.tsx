import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { getPublic, getImageUrl } from "../api";
import BlockCard from "../components/BlockCard";
import { useMasonryGrid } from "../components/BlockMasonryGrid";

// Системные маршруты, которые не должны обрабатываться как username
const SYSTEM_ROUTES = ["login", "register", "editor", "u", "api"];

export default function PublicPage() {
  const { username = "" } = useParams();
  const [state, setState] = React.useState<{ loading: boolean; name?: string; bio?: string | null; avatarUrl?: string | null; backgroundUrl?: string | null; blocks?: any[]; error?: string }>({ loading: true });
  const gridRef = useMasonryGrid([state.blocks?.length]);

  // Проверяем, не является ли путь системным маршрутом
  if (SYSTEM_ROUTES.includes(username.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  React.useEffect(() => {
    (async () => {
      try {
        if (!username || username.trim() === "") {
          setState({ loading: false, error: "not_found" });
          return;
        }
        console.log('[Public] Fetching profile for username:', username);
        const data = await getPublic(username);
        console.log('[Public] Profile data received:', { name: data.name, blocksCount: data.blocks?.length });
        setState({ loading: false, name: data.name, bio: data.bio, avatarUrl: data.avatarUrl, backgroundUrl: data.backgroundUrl, blocks: data.blocks });
      } catch (error: any) {
        console.error('[Public] Error fetching profile:', error);
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
    <div 
      className="page-bg min-h-screen"
      style={{
        backgroundImage: state.backgroundUrl ? `url(${getImageUrl(state.backgroundUrl)})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll",
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
      {/* Overlay для читаемости текста */}
      {state.backgroundUrl && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(250, 250, 250, 0.85)",
          backdropFilter: "blur(2px)",
          zIndex: 0,
          pointerEvents: "none",
        }} />
      )}
      <div className="container" style={{ paddingTop: 60, paddingBottom: 80, position: "relative", zIndex: 1, width: "100%", maxWidth: "100%" }}>
        {/* Two Column Layout: Profile Left, Blocks Right */}
        <div className="two-column-layout" style={{ width: "100%", maxWidth: "100%" }}>
          {/* Left Column: Profile */}
          <div style={{ position: "sticky", top: 100, maxWidth: "100%" }}>
            <div className="reveal reveal-in">
              <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", textAlign: "center", width: "100%", maxWidth: "100%" }}>
                {state.avatarUrl && (
                  <div style={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: "50%", 
                    border: "3px solid rgba(255,255,255,0.9)",
                    boxShadow: state.backgroundUrl ? "0 4px 16px rgba(0,0,0,0.2), 0 0 32px rgba(255,255,255,0.5)" : "var(--shadow-md)",
                    padding: "3px",
                    background: state.backgroundUrl ? "rgba(255,255,255,0.9)" : "transparent"
                  }}>
                    <img
                      src={getImageUrl(state.avatarUrl)}
                      alt=""
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        borderRadius: "50%", 
                        objectFit: "cover", 
                        display: "block"
                      }}
                      onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      loading="lazy"
                    />
                  </div>
                )}
                <div style={{ width: "100%", maxWidth: "100%" }}>
                  <h1 style={{ 
                    fontSize: 32, 
                    fontWeight: 800, 
                    letterSpacing: "-0.03em", 
                    lineHeight: 1.2, 
                    color: "var(--text)", 
                    marginBottom: 8, 
                    wordBreak: "break-word",
                    textShadow: state.backgroundUrl ? "0 2px 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.5)" : undefined
                  }}>
                    {state.name}
                  </h1>
                  {state.bio && (
                    <p style={{ 
                      color: "var(--muted)", 
                      fontSize: 14, 
                      lineHeight: 1.6, 
                      textAlign: "left", 
                      marginTop: 12,
                      wordWrap: "break-word",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      width: "100%",
                      maxWidth: "100%",
                      textShadow: state.backgroundUrl ? "0 1px 4px rgba(255,255,255,0.9)" : undefined
                    }}>
                      {state.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Blocks */}
          <div style={{ minWidth: 0, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
            {state.blocks && state.blocks.length > 0 ? (
              <div ref={gridRef} className="grid" style={{ 
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                gap: 16,
                gridAutoRows: "8px",
                width: "100%",
                maxWidth: "100%"
              }}>
                {state.blocks.map((b: any, index: number) => (
                  <div key={b.id} className="reveal reveal-in" style={{ animationDelay: `${index * 0.03}s` }}>
                    <BlockCard b={b} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card reveal reveal-in" style={{ padding: 60, textAlign: "center" }}>
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
