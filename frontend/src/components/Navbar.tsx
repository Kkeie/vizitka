import React from "react";
import { Link } from "react-router-dom";
import { type User } from "../api";

export default function Navbar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const uname = user?.profile?.username || user?.username;
  const [toast, setToast] = React.useState<string | null>(null);

  const copyPublic = async () => {
    if (!uname) return;
    const url = `${window.location.origin}/${uname}`;
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
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
            <nav style={{ display: "flex", gap: 6 }}>
              <Link 
                to="/editor" 
                className="btn btn-ghost"
                style={{ fontSize: 14, padding: "8px 16px" }}
              >
                Editor
              </Link>
              {uname && (
                <Link 
                  to="/mybento" 
                  className="btn btn-ghost"
                  style={{ fontSize: 14, padding: "8px 16px" }}
                >
                  My Bento
                </Link>
              )}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {uname ? (
              <>
                <button 
                  className="chip" 
                  onClick={copyPublic} 
                  title="Скопировать публичную ссылку" 
                  aria-label="Скопировать ссылку"
                  style={{ fontSize: 13, padding: "10px 16px" }}
                >
                  <span aria-hidden="true">🔗</span>
                  <span>/@{uname}</span>
                </button>
                <button 
                  className="btn" 
                  onClick={onLogout}
                  style={{ fontSize: 14, padding: "10px 20px" }}
                >
                  Выйти
                </button>
              </>
            ) : null}
          </div>
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
