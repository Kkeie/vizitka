import React from "react";
import { login, type User } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); 
    setLoading(true);
    try {
      const { user } = await login(username, password);
      onAuthed(user);
      nav("/editor");
    } catch { 
      setErr("Неверный username или password"); 
    }
    finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="page-bg min-h-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="reveal reveal-in" style={{ width: "100%", maxWidth: 420 }}>
        <form onSubmit={submit} className="card" style={{ padding: 40 }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 12 }}>
              Вход
            </h1>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6 }}>
              Войдите в свой аккаунт, чтобы продолжить
            </p>
          </div>
          
          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Username
            </label>
            <input 
              className="input" 
              placeholder="Введите username" 
              value={username} 
              onChange={(e)=>setUsername(e.target.value)}
              required
              autoFocus
              style={{ fontSize: 15 }}
            />
          </div>
          
          <div className="field" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Password
            </label>
            <input 
              className="input" 
              placeholder="Введите password" 
              type="password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)}
              required
              style={{ fontSize: 15 }}
            />
          </div>
          
          {err && (
            <div className="ribbon error" style={{ marginBottom: 20 }}>
              {err}
            </div>
          )}
          
          <button 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: "100%", fontSize: 15, padding: "14px 24px" }}
            type="submit"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              Нет аккаунта?{" "}
              <Link 
                to="/register" 
                style={{ 
                  color: "var(--text)", 
                  fontWeight: 600, 
                  textDecoration: "none",
                  borderBottom: "1.5px solid currentColor",
                  paddingBottom: 2
                }}
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
