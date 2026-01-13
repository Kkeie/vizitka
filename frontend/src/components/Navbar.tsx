import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { type User } from "../api";

export default function Navbar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const uname = user?.profile?.username || user?.username;
  const [toast, setToast] = React.useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname === "/editor";
  const isPublic = location.pathname.startsWith("/public/") || location.pathname.startsWith("/u/");

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link 
            to="/" 
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
          
          {uname && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Табы Редактор/Превью */}
              <div style={{ display: "flex", gap: 4, background: "var(--accent)", borderRadius: "var(--radius-sm)", padding: 4 }}>
                <button
                  onClick={() => navigate("/editor")}
                  style={{
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: isEditor ? "var(--primary)" : "transparent",
                    color: isEditor ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Редактор
                </button>
                <button
                  onClick={() => navigate(`/public/${uname}`)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: isPublic ? "var(--primary)" : "transparent",
                    color: isPublic ? "white" : "var(--text)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Превью
                </button>
              </div>
              
              {/* Кнопка скопировать ссылку */}
              <button
                onClick={copyPublic}
                className="btn btn-ghost"
                style={{
                  fontSize: 14,
                  padding: "8px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🔗</span>
                <span>Скопировать ссылку</span>
              </button>
              
              {/* Кнопка выхода */}
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
