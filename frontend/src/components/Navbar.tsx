import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { type User } from "../api";

export default function Navbar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const uname = user?.profile?.username || user?.username;
  const [toast, setToast] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const copyPublic = async () => {
    if (!uname) return;
    const url = `${window.location.origin}/public/${uname}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      } catch {
        window.prompt("Скопируйте ссылку:", url);
      }
    }
    setToast("Ссылка скопирована");
    window.setTimeout(()=>setToast(null), 1300);
  };

  return (
    <div className="topbar">
      <div className="container" style={{ paddingTop: 18, paddingBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, position: "relative" }}>
          {/* Логотип – ведёт в редактор, если пользователь авторизован, иначе на главную */}
          <Link 
            to={uname ? "/editor" : "/"} 
            style={{ 
              fontWeight: 800, 
              fontSize: 22,
              letterSpacing: "-0.04em", 
              color: "var(--text)",
              textDecoration: "none",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text)"}
          >
            Bento
          </Link>
          
          {/* Кнопка скопировать ссылку – появляется только для авторизованных */}
          {uname && (
            <div style={{ 
              position: "absolute", 
              left: "50%", 
              transform: "translateX(-50%)",
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center"
            }}>
              <button
                onClick={copyPublic}
                className="btn btn-ghost"
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap"
                }}
              >
                <span>🔗</span>
                {!isMobile && <span>Скопировать ссылку</span>}
              </button>
            </div>
          )}
          
          {/* Username и кнопка выхода справа */}
          {uname && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
              <span style={{ 
                fontSize: 14, 
                color: "var(--muted)",
                fontWeight: 500
              }}>
                @{uname}
              </span>
              <button 
                className="btn" 
                onClick={onLogout}
                style={{ fontSize: 14, padding: "10px 20px" }}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
        {toast && (
          <div 
            className="card" 
            style={{ 
              position: "fixed", 
              right: 24, 
              top: 24, 
              padding: "14px 18px",
              zIndex: 1000,
              boxShadow: "var(--shadow-xl)",
              animation: "slideIn 0.3s ease"
            }}
          >
            {toast}
          </div>
        )}
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
