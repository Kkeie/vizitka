import React from "react";
import { register, type User } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Register({ onAuthed }: { onAuthed: (u: User) => void }) {
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
      const { user } = await register(username, password);
      onAuthed(user);
      nav("/editor");
    } catch (error: any) {
      const errorMessage = error?.message || "register_failed";
      let message = "Не удалось создать аккаунт.";
      
      if (errorMessage === "username_taken") {
        message = "Этот username уже занят. Выберите другой.";
      } else if (errorMessage === "username_too_short") {
        message = "Username должен содержать минимум 3 символа.";
      } else if (errorMessage === "password_too_short") {
        message = "Пароль должен содержать минимум 4 символа.";
      } else if (errorMessage === "username_and_password_required") {
        message = "Заполните все поля.";
      } else if (errorMessage === "internal_error") {
        message = "Ошибка сервера. Попробуйте позже.";
      } else {
        console.error("Registration error:", errorMessage);
        message = `Ошибка: ${errorMessage}`;
      }
      
      setErr(message);
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
              Регистрация
            </h1>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6 }}>
              Создайте аккаунт и начните создавать свою страницу
            </p>
          </div>
          
          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Username
            </label>
            <input 
              className="input" 
              placeholder="Придумайте username" 
              value={username} 
              onChange={(e)=>setUsername(e.target.value)}
              required
              minLength={3}
              autoFocus
              style={{ fontSize: 15 }}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              Минимум 3 символа
            </p>
          </div>
          
          <div className="field" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Password
            </label>
            <input 
              className="input" 
              placeholder="Придумайте password" 
              type="password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)}
              required
              minLength={4}
              style={{ fontSize: 15 }}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              Минимум 4 символа
            </p>
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
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              Уже есть аккаунт?{" "}
              <Link 
                to="/login" 
                style={{ 
                  color: "var(--text)", 
                  fontWeight: 600, 
                  textDecoration: "none",
                  borderBottom: "1.5px solid currentColor",
                  paddingBottom: 2
                }}
              >
                Войти
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
